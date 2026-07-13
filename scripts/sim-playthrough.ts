// Headless playthrough simulations: scripted bots play the real level through
// the same stepWorld the game runs. Run with: npm run sim
import {
  COLLISION_RADIUS_FACTOR,
  MAGIC_COST,
  MAGIC_RADIUS,
  PLAYER_ATTACK_DEPTH,
  PLAYER_ATTACK_REACH,
  PLAYER_SPEED,
} from "../src/game/constants";
import { neutralInput, type InputState } from "../src/game/input";
import { blockedByObstacle, clampDepth, hazardAt } from "../src/game/terrain";
import type { Enemy, GameState } from "../src/game/types";
import { createWorld, stepWorld } from "../src/game/world";

interface BotConfig {
  name: string;
  engageDist: number; // how close it gets before it stops to swing
  attacks: boolean;
  reactionDelay?: number; // frames between attack decisions (0 = frame-perfect)
  alignDepth?: boolean; // line up depth before swinging (default true)
  useMagic?: boolean;
}

interface BotMemory {
  prevWant: boolean;
  cooldown: number;
  dodgeDir: number;
  dodgeFrames: number;
}

function nearestTarget(state: GameState): Enemy | null {
  const p = state.player;
  let target: Enemy | null = null;
  let best = Infinity;
  for (const e of state.enemies) {
    if (e.state === "dead") continue;
    const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y) * 0.5;
    if (d < best && e.x < p.x + 420) {
      best = d;
      target = e;
    }
  }
  return target;
}

function botInput(state: GameState, cfg: BotConfig, mem: BotMemory): InputState {
  const p = state.player;
  const input = neutralInput();
  const target = nearestTarget(state);

  if (mem.cooldown > 0) mem.cooldown--;
  const alignDepth = cfg.alignDepth ?? true;

  if (target) {
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    if (alignDepth) {
      if (dy < -6) input.up = true;
      else if (dy > 6) input.down = true;
    }
    if (Math.abs(dx) > cfg.engageDist) {
      if (dx > 0) input.right = true;
      else input.left = true;
    }

    const inRange = Math.abs(dx) <= PLAYER_ATTACK_REACH && Math.abs(dy) <= PLAYER_ATTACK_DEPTH;
    const want = cfg.attacks && inRange && p.attackCooldown === 0 && mem.cooldown === 0;
    input.attackPressed = want && !mem.prevWant;
    if (input.attackPressed) mem.cooldown = cfg.reactionDelay ?? 0;
    mem.prevWant = want;

    if (cfg.useMagic && p.magicCooldown === 0 && p.mana >= MAGIC_COST) {
      if (Math.hypot(dx, dy * 1.4) <= MAGIC_RADIUS) input.magicPressed = true;
    }
  } else {
    input.right = true; // head for the gate
    mem.prevWant = false;
  }

  steerAroundObstacles(state, input, mem);
  return input;
}

// If the way ahead is blocked or thorny, commit to a depth-axis dodge for a
// stretch of frames so the bot doesn't oscillate in front of a rock.
function steerAroundObstacles(state: GameState, input: InputState, mem: BotMemory) {
  const p = state.player;
  const dirX = input.right ? 1 : input.left ? -1 : 0;
  if (mem.dodgeFrames > 0) mem.dodgeFrames--;
  if (dirX === 0) return;

  const radius = p.w * COLLISION_RADIUS_FACTOR;
  const ahead = p.x + dirX * PLAYER_SPEED * 4;
  const obstructed = (y: number) =>
    blockedByObstacle(ahead, y, radius, state.obstacles) ||
    hazardAt(ahead, y, radius, state.obstacles) != null;

  if (obstructed(p.y) && mem.dodgeFrames === 0) {
    let dir = 1;
    for (let d = 24; d <= 90; d += 12) {
      if (!obstructed(clampDepth(ahead, p.y + d))) {
        dir = 1;
        break;
      }
      if (!obstructed(clampDepth(ahead, p.y - d))) {
        dir = -1;
        break;
      }
    }
    mem.dodgeDir = dir;
    mem.dodgeFrames = 22;
  }
  if (mem.dodgeFrames > 0) {
    input.up = mem.dodgeDir < 0;
    input.down = mem.dodgeDir > 0;
  }
}

function run(cfg: BotConfig) {
  // rng of 1 disables random drops so runs stay deterministic.
  const state = createWorld(() => 1);
  const mem: BotMemory = { prevWant: false, cooldown: 0, dodgeDir: 1, dodgeFrames: 0 };
  const maxFrames = 60 * 120;
  let frame = 0;
  let minHp = state.player.maxHp;

  for (; frame < maxFrames && state.phase === "playing"; frame++) {
    stepWorld(state, botInput(state, cfg, mem));
    minHp = Math.min(minHp, state.player.hp);
  }

  const killed = state.enemies.filter((e) => e.state === "dead").length;
  const result = state.phase === "won" ? "WON" : state.phase === "dead" ? "DIED" : "TIMED OUT";
  console.log(
    `  ${cfg.name.padEnd(21)} ${result.padEnd(10)} ` +
      `time ${(frame / 60).toFixed(1)}s  killed ${killed}/${state.enemies.length}  ` +
      `HP ${Math.round(state.player.hp)} (low ${Math.round(minHp)})`
  );
}

console.log("Playthrough simulations (real game logic, scripted bots):\n");
run({ name: "Aggressive (perfect)", engageDist: 38, attacks: true });
run({ name: "Cautious (perfect)", engageDist: 52, attacks: true });
run({ name: "Human-ish (slow)", engageDist: 44, attacks: true, reactionDelay: 40 });
run({ name: "Mage (sword+magic)", engageDist: 38, attacks: true, useMagic: true });
run({ name: "Pacifist (no attacks)", engageDist: 38, attacks: false });
console.log("\nDone.");
