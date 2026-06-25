import {
  ENEMY_HURT_FLASH,
  KNOCKBACK,
  LEVEL_END_X,
  PLAYER_ATTACK_DAMAGE,
  PLAYER_ATTACK_DEPTH,
  PLAYER_ATTACK_DURATION,
  PLAYER_ATTACK_REACH,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  WORLD_WIDTH,
} from "./constants";
import { updateEnemy } from "./enemy";
import { Input } from "./input";
import { createEnemies, createPlayer } from "./level";
import { updatePlayer } from "./player";
import { render } from "./render";
import type { GameState } from "./types";

export type HudListener = (hud: GameState["hud"]) => void;

export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private input = new Input();
  private state!: GameState;
  private rafId = 0;
  private running = false;
  private onHud: HudListener;

  // Fixed-timestep loop state. The simulation always advances in 1/60s steps
  // so gameplay speed is identical on 60Hz and 120Hz (ProMotion) displays.
  private lastTime = 0;
  private accumulator = 0;
  // Edge-triggered presses persist until a sim step consumes them, so a press
  // landing on a frame that runs zero steps (e.g. at 120Hz) is never dropped.
  private pendingAttack = false;
  private pendingRestart = false;

  constructor(canvas: HTMLCanvasElement, onHud: HudListener) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
    this.onHud = onHud;
    this.reset();
  }

  reset() {
    const player = createPlayer();
    this.state = {
      player,
      enemies: createEnemies(),
      camX: 0,
      phase: "playing",
      hud: {
        playerHp: player.hp,
        playerMaxHp: player.maxHp,
        enemiesRemaining: 0,
        progress: 0,
        phase: "playing",
      },
    };
    this.emitHud();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.input.attach();
    this.lastTime = performance.now();
    this.accumulator = 0;
    const FIXED = 1000 / 60;
    const loop = (now: number) => {
      let frame = now - this.lastTime;
      this.lastTime = now;
      // Clamp to avoid a "spiral of death" after a tab is backgrounded.
      if (frame > 250) frame = 250;
      this.accumulator += frame;

      const input = this.input.poll();
      if (input.attackPressed) this.pendingAttack = true;
      if (input.restartPressed) this.pendingRestart = true;

      let stepsThisFrame = 0;
      while (this.accumulator >= FIXED) {
        const useEdge = stepsThisFrame === 0;
        this.step({
          ...input,
          attackPressed: useEdge && this.pendingAttack,
          restartPressed: useEdge && this.pendingRestart,
        });
        if (useEdge) {
          this.pendingAttack = false;
          this.pendingRestart = false;
        }
        this.accumulator -= FIXED;
        stepsThisFrame++;
      }

      render(this.ctx, this.state);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.input.detach();
  }

  private step(input: ReturnType<Input["poll"]>) {
    const s = this.state;

    if (s.phase !== "playing") {
      if (input.restartPressed) this.reset();
      return;
    }

    updatePlayer(s.player, input);

    // Resolve the player's sword against enemies during the active swing.
    const swinging = s.player.attackTimer > 0;
    const inHitWindow =
      swinging && s.player.attackTimer < PLAYER_ATTACK_DURATION - 3 && !s.player.hasHitThisSwing;
    if (inHitWindow) this.resolvePlayerAttack();

    for (const e of s.enemies) updateEnemy(e, s.player);

    // Update camera to follow the player, clamped to the world.
    const targetCam = s.player.x - VIEW_WIDTH / 2;
    s.camX = Math.max(0, Math.min(WORLD_WIDTH - VIEW_WIDTH, targetCam));

    // Win condition: reach the end gate with no enemies left blocking the path.
    const aliveEnemies = s.enemies.filter((e) => e.state !== "dead").length;
    if (s.player.x >= LEVEL_END_X && aliveEnemies === 0) {
      s.phase = "won";
    }
    if (s.player.hp <= 0) {
      s.player.state = "dead";
      s.phase = "dead";
    }

    this.updateHud(aliveEnemies);
  }

  private resolvePlayerAttack() {
    const p = this.state.player;
    const front = p.facing;
    // Hitbox extends from the player's front edge forward by the sword reach.
    const minX = front === 1 ? p.x : p.x - PLAYER_ATTACK_REACH;
    const maxX = front === 1 ? p.x + PLAYER_ATTACK_REACH : p.x;

    for (const e of this.state.enemies) {
      if (e.state === "dead") continue;
      const withinX = e.x + e.w / 2 >= minX && e.x - e.w / 2 <= maxX;
      const withinDepth = Math.abs(e.y - p.y) <= PLAYER_ATTACK_DEPTH;
      if (withinX && withinDepth) {
        this.damageEnemy(e, front);
        p.hasHitThisSwing = true;
      }
    }
  }

  private damageEnemy(e: GameState["enemies"][number], dir: number) {
    e.hp -= PLAYER_ATTACK_DAMAGE;
    e.flashTimer = ENEMY_HURT_FLASH;
    e.hurtTimer = ENEMY_HURT_FLASH;
    e.vx = dir * KNOCKBACK;
    if (e.hp <= 0) {
      e.hp = 0;
      e.state = "dead";
      e.vx = 0;
    }
  }

  private updateHud(aliveEnemies: number) {
    const s = this.state;
    s.hud.playerHp = s.player.hp;
    s.hud.enemiesRemaining = aliveEnemies;
    s.hud.progress = Math.max(0, Math.min(1, s.player.x / LEVEL_END_X));
    s.hud.phase = s.phase;
    this.emitHud();
  }

  private emitHud() {
    // Pass a shallow copy so React sees a new object each update.
    this.onHud({ ...this.state.hud });
  }
}

// Referenced to keep view height meaningful to callers configuring the canvas.
export const CANVAS_SIZE = { width: VIEW_WIDTH, height: VIEW_HEIGHT };
