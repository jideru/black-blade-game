import { Input } from "./input";
import { render } from "./render";
import type { GameState, HudState } from "./types";
import { buildHud, createWorld, stepWorld } from "./world";

export type HudListener = (hud: HudState) => void;

const FIXED_STEP_MS = 1000 / 60;
const MAX_FRAME_MS = 250;

// Browser adapter around the pure simulation in world.ts: runs a fixed 60Hz
// timestep decoupled from requestAnimationFrame, so gameplay speed is
// identical on 60Hz and 120Hz (ProMotion) displays.
export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private input = new Input();
  private state!: GameState;
  private rafId = 0;
  private running = false;
  private lastTime = 0;
  private accumulator = 0;

  // Edge-triggered presses persist until a sim step consumes them, so a press
  // landing on a frame that runs zero steps (possible at 120Hz) is never lost.
  private pendingAttack = false;
  private pendingMagic = false;
  private pendingRestart = false;

  constructor(canvas: HTMLCanvasElement, private onHud: HudListener) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
    this.reset();
  }

  reset() {
    this.state = createWorld();
    this.onHud(buildHud(this.state));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.input.attach();
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.input.detach();
  }

  private loop = (now: number) => {
    this.accumulator += Math.min(now - this.lastTime, MAX_FRAME_MS);
    this.lastTime = now;

    const input = this.input.poll();
    this.pendingAttack ||= input.attackPressed;
    this.pendingMagic ||= input.magicPressed;
    this.pendingRestart ||= input.restartPressed;

    let stepped = false;
    while (this.accumulator >= FIXED_STEP_MS) {
      this.step({
        ...input,
        attackPressed: !stepped && this.pendingAttack,
        magicPressed: !stepped && this.pendingMagic,
        restartPressed: !stepped && this.pendingRestart,
      });
      if (!stepped) {
        this.pendingAttack = false;
        this.pendingMagic = false;
        this.pendingRestart = false;
      }
      this.accumulator -= FIXED_STEP_MS;
      stepped = true;
    }

    if (stepped) this.onHud(buildHud(this.state));
    render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private step(input: ReturnType<Input["poll"]>) {
    if (this.state.phase !== "playing") {
      if (input.restartPressed) this.reset();
      return;
    }
    stepWorld(this.state, input);
  }
}
