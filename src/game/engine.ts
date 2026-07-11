import {
  COLLISION_RADIUS_FACTOR,
  ENEMY_ATTACK_DEPTH,
  ENEMY_DROP_CHANCE,
  ENEMY_HURT_FLASH,
  ENEMY_HURT_STUN,
  ENEMY_KNOCKBACK,
  HAZARD_DAMAGE,
  HURT_INVULN,
  KNOCKBACK,
  LEVEL_END_X,
  MAGIC_COST,
  MAGIC_DAMAGE,
  MAGIC_FX_DURATION,
  MAGIC_RADIUS,
  MAGIC_COOLDOWN,
  PICKUP_RADIUS,
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
import { applyPickup, createPickups, dropPickup } from "./pickups";
import { updatePlayer } from "./player";
import { render } from "./render";
import { createObstacles, hazardAt } from "./terrain";
import type { Enemy, GameState, Pickup, PickupKind } from "./types";

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
  private pendingMagic = false;
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
      obstacles: createObstacles(),
      pickups: createPickups(),
      magicFx: null,
      camX: 0,
      phase: "playing",
      hud: {
        playerHp: player.hp,
        playerMaxHp: player.maxHp,
        playerMana: player.mana,
        playerMaxMana: player.maxMana,
        attackDamage: player.attackDamage,
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
      if (input.magicPressed) this.pendingMagic = true;
      if (input.restartPressed) this.pendingRestart = true;

      let stepsThisFrame = 0;
      while (this.accumulator >= FIXED) {
        const useEdge = stepsThisFrame === 0;
        this.step({
          ...input,
          attackPressed: useEdge && this.pendingAttack,
          magicPressed: useEdge && this.pendingMagic,
          restartPressed: useEdge && this.pendingRestart,
        });
        if (useEdge) {
          this.pendingAttack = false;
          this.pendingMagic = false;
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

    updatePlayer(s.player, input, s.obstacles);

    // Cast the magic special if requested and affordable.
    if (
      input.magicPressed &&
      s.player.magicCooldown === 0 &&
      s.player.mana >= MAGIC_COST &&
      s.player.attackTimer === 0
    ) {
      this.castMagic();
    }
    if (s.magicFx && --s.magicFx.timer <= 0) s.magicFx = null;

    // Resolve the player's sword against enemies during the active swing.
    const swinging = s.player.attackTimer > 0;
    const inHitWindow =
      swinging && s.player.attackTimer < PLAYER_ATTACK_DURATION - 3 && !s.player.hasHitThisSwing;
    if (inHitWindow) this.resolvePlayerAttack();

    // Standing in thorns chips away at the player's health.
    if (s.player.invulnTimer === 0) {
      const r = s.player.w * COLLISION_RADIUS_FACTOR;
      if (hazardAt(s.player.x, s.player.y, r, s.obstacles)) {
        this.damagePlayer(HAZARD_DAMAGE, s.player.facing);
      }
    }

    this.collectPickups();

    for (const e of s.enemies) updateEnemy(e, s.player, s.enemies, s.obstacles);

    // Resolve enemy swings against the player at each swing's hit frame.
    for (const e of s.enemies) this.resolveEnemyAttack(e);

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
        this.damageEnemy(e, front, p.attackDamage);
        p.hasHitThisSwing = true;
      }
    }
  }

  private damageEnemy(e: Enemy, dir: number, amount: number) {
    e.hp -= amount;
    e.flashTimer = ENEMY_HURT_FLASH;
    if (e.hp <= 0) {
      e.hp = 0;
      e.state = "dead";
      e.vx = 0;
      e.vy = 0;
      this.maybeDrop(e);
      return;
    }
    // Hyperarmor: a grunt already mid-swing shrugs off the hit and lands its
    // blow anyway, so trading damage is a real risk. Hits only stun/knock back
    // a grunt that is approaching, not one that has committed to an attack.
    if (e.attackTimer === 0) {
      e.hurtTimer = ENEMY_HURT_STUN;
      e.vx = dir * ENEMY_KNOCKBACK * e.knockbackFactor;
    }
  }

  // Some slain grunts drop a pickup where they fell.
  private maybeDrop(e: Enemy) {
    if (Math.random() > ENEMY_DROP_CHANCE) return;
    const roll = Math.random();
    const kind: PickupKind = roll < 0.5 ? "health" : roll < 0.85 ? "mana" : "power";
    this.state.pickups.push(dropPickup(e.x, e.y, kind));
  }

  private castMagic() {
    const s = this.state;
    const p = s.player;
    p.mana -= MAGIC_COST;
    p.magicCooldown = MAGIC_COOLDOWN;
    s.magicFx = { x: p.x, y: p.y, timer: MAGIC_FX_DURATION, maxTimer: MAGIC_FX_DURATION };
    // Damage every living grunt within the burst radius (depth counted lightly).
    for (const e of s.enemies) {
      if (e.state === "dead") continue;
      const dx = e.x - p.x;
      const dy = (e.y - p.y) * 1.4;
      if (dx * dx + dy * dy <= MAGIC_RADIUS * MAGIC_RADIUS) {
        this.damageEnemy(e, Math.sign(dx) || 1, MAGIC_DAMAGE);
      }
    }
  }

  private collectPickups() {
    const s = this.state;
    const p = s.player;
    const reach = PICKUP_RADIUS + p.w * 0.4;
    s.pickups = s.pickups.filter((pk: Pickup) => {
      const dx = pk.x - p.x;
      const dy = pk.y - p.y;
      if (dx * dx + dy * dy > reach * reach) return true; // keep, not collected
      applyPickup(p, pk.kind);
      return false; // collected -> remove
    });
  }

  private resolveEnemyAttack(e: GameState["enemies"][number]) {
    if (e.state !== "attack" || e.hasHitThisSwing) return;
    // The blade lands once the windup has elapsed.
    const elapsed = e.attackDuration - e.attackTimer;
    if (elapsed < e.attackWindup) return;

    e.hasHitThisSwing = true; // consume the swing whether or not it connects

    const p = this.state.player;
    if (p.invulnTimer > 0) return;
    const front = e.facing;
    const minX = front === 1 ? e.x : e.x - e.attackReach;
    const maxX = front === 1 ? e.x + e.attackReach : e.x;
    const withinX = p.x + p.w / 2 >= minX && p.x - p.w / 2 <= maxX;
    const withinDepth = Math.abs(p.y - e.y) <= ENEMY_ATTACK_DEPTH;
    if (withinX && withinDepth) this.damagePlayer(e.attackDamage, front);
  }

  private damagePlayer(amount: number, dir: number) {
    const p = this.state.player;
    p.hp = Math.max(0, p.hp - amount);
    p.hurtTimer = HURT_INVULN;
    p.invulnTimer = HURT_INVULN;
    // Knock the player back, staying within the level bounds.
    p.x = Math.max(40, Math.min(LEVEL_END_X, p.x + dir * KNOCKBACK));
  }

  private updateHud(aliveEnemies: number) {
    const s = this.state;
    s.hud.playerHp = s.player.hp;
    s.hud.playerMana = s.player.mana;
    s.hud.attackDamage = s.player.attackDamage;
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
