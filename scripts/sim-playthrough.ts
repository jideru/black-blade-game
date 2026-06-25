// Headless playthrough simulations: a scripted bot plays the real level using
// the actual game logic (no canvas / rAF). Mirrors GameEngine.step so the
// numbers reflect real gameplay. Run with: npx tsx scripts/sim-playthrough.ts
import {
  COLLISION_RADIUS_FACTOR,
  ENEMY_ATTACK_DAMAGE,
  ENEMY_ATTACK_DEPTH,
  ENEMY_ATTACK_REACH,
  ENEMY_HURT_FLASH,
  ENEMY_HURT_STUN,
  ENEMY_KNOCKBACK,
  HAZARD_DAMAGE,
  HURT_INVULN,
  KNOCKBACK,
  LEVEL_END_X,
  PLAYER_ATTACK_DAMAGE,
  PLAYER_ATTACK_DEPTH,
  PLAYER_ATTACK_DURATION,
  PLAYER_ATTACK_REACH,
  PLAYER_SPEED,
} from "../src/game/constants";
import { updateEnemy } from "../src/game/enemy";
import type { InputState } from "../src/game/input";
import { createEnemies, createPlayer } from "../src/game/level";
import { updatePlayer } from "../src/game/player";
import {
  blockedByObstacle,
  clampDepth,
  createObstacles,
  hazardAt,
  type Obstacle,
} from "../src/game/terrain";
import type { Character, Enemy } from "../src/game/types";

interface Sim {
  player: Character;
  enemies: Enemy[];
  obstacles: Obstacle[];
  phase: "playing" | "won" | "dead";
}

// --- engine combat logic, mirrored from src/game/engine.ts ---
function damageEnemy(e: Enemy, dir: number) {
  e.hp -= PLAYER_ATTACK_DAMAGE;
  e.flashTimer = ENEMY_HURT_FLASH;
  if (e.hp <= 0) {
    e.hp = 0;
    e.state = "dead";
    e.vx = 0;
    e.vy = 0;
    return;
  }
  // Hyperarmor: a committed (mid-swing) grunt is not interrupted by a hit.
  if (e.attackTimer === 0) {
    e.hurtTimer = ENEMY_HURT_STUN;
    e.vx = dir * ENEMY_KNOCKBACK;
  }
}

function resolvePlayerAttack(s: Sim) {
  const p = s.player;
  const front = p.facing;
  const minX = front === 1 ? p.x : p.x - PLAYER_ATTACK_REACH;
  const maxX = front === 1 ? p.x + PLAYER_ATTACK_REACH : p.x;
  for (const e of s.enemies) {
    if (e.state === "dead") continue;
    const withinX = e.x + e.w / 2 >= minX && e.x - e.w / 2 <= maxX;
    const withinDepth = Math.abs(e.y - p.y) <= PLAYER_ATTACK_DEPTH;
    if (withinX && withinDepth) {
      damageEnemy(e, front);
      p.hasHitThisSwing = true;
    }
  }
}

function resolveEnemyAttack(e: Enemy, p: Character) {
  if (e.state !== "attack" || e.hasHitThisSwing) return;
  const elapsed = e.attackDuration - e.attackTimer;
  if (elapsed < e.attackWindup) return;
  e.hasHitThisSwing = true;
  if (p.invulnTimer > 0) return;
  const front = e.facing;
  const minX = front === 1 ? e.x : e.x - ENEMY_ATTACK_REACH;
  const maxX = front === 1 ? e.x + ENEMY_ATTACK_REACH : e.x;
  const withinX = p.x + p.w / 2 >= minX && p.x - p.w / 2 <= maxX;
  const withinDepth = Math.abs(p.y - e.y) <= ENEMY_ATTACK_DEPTH;
  if (withinX && withinDepth) {
    p.hp = Math.max(0, p.hp - ENEMY_ATTACK_DAMAGE);
    p.hurtTimer = HURT_INVULN;
    p.invulnTimer = HURT_INVULN;
    p.x = Math.max(40, Math.min(LEVEL_END_X, p.x + front * KNOCKBACK));
  }
}

function step(s: Sim, input: InputState) {
  if (s.phase !== "playing") return;
  updatePlayer(s.player, input, s.obstacles);
  const swinging = s.player.attackTimer > 0;
  if (swinging && s.player.attackTimer < PLAYER_ATTACK_DURATION - 3 && !s.player.hasHitThisSwing) {
    resolvePlayerAttack(s);
  }
  if (s.player.invulnTimer === 0) {
    const r = s.player.w * COLLISION_RADIUS_FACTOR;
    if (hazardAt(s.player.x, s.player.y, r, s.obstacles)) {
      s.player.hp = Math.max(0, s.player.hp - HAZARD_DAMAGE);
      s.player.invulnTimer = HURT_INVULN;
    }
  }
  for (const e of s.enemies) updateEnemy(e, s.player, s.enemies, s.obstacles);
  for (const e of s.enemies) resolveEnemyAttack(e, s.player);
  const alive = s.enemies.filter((e) => e.state !== "dead").length;
  if (s.player.x >= LEVEL_END_X && alive === 0) s.phase = "won";
  if (s.player.hp <= 0) s.phase = "dead";
}

// --- a scripted "bot" player ---
interface BotConfig {
  name: string;
  engageDist: number; // how close it gets before it stops to swing
  attacks: boolean; // whether it ever swings
  reactionDelay?: number; // frames between attack decisions (0 = frame-perfect)
  alignDepth?: boolean; // whether it lines up depth before swinging (default true)
}

function botInput(
  s: Sim,
  cfg: BotConfig,
  mem: { prevWant: boolean; cooldown: number; dodgeDir: number; dodgeFrames: number }
): InputState {
  const p = s.player;
  const input: InputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    attack: false,
    attackPressed: false,
    restartPressed: false,
  };
  // Nearest living enemy that is roughly ahead/near.
  let target: Enemy | null = null;
  let best = Infinity;
  for (const e of s.enemies) {
    if (e.state === "dead") continue;
    const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y) * 0.5;
    if (d < best && e.x < p.x + 420) {
      best = d;
      target = e;
    }
  }
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
    const ready = inRange && p.attackCooldown === 0 && mem.cooldown === 0;
    const want = cfg.attacks && ready;
    input.attackPressed = want && !mem.prevWant;
    if (input.attackPressed) mem.cooldown = cfg.reactionDelay ?? 0;
    mem.prevWant = want;
  } else {
    input.right = true; // head for the gate
    mem.prevWant = false;
  }

  // Obstacle/hazard avoidance: if the way ahead is blocked or thorny, steer
  // into the depth axis to go around. Commit to a dodge direction for a stretch
  // of frames (hysteresis) so the bot doesn't oscillate in front of a rock.
  const dirX = input.right ? 1 : input.left ? -1 : 0;
  if (mem.dodgeFrames > 0) mem.dodgeFrames--;
  if (dirX !== 0) {
    const r = p.w * COLLISION_RADIUS_FACTOR;
    const ahead = p.x + dirX * PLAYER_SPEED * 4;
    const obstructed = (y: number) =>
      blockedByObstacle(ahead, y, r, s.obstacles) || hazardAt(ahead, y, r, s.obstacles) != null;
    if (obstructed(p.y) && mem.dodgeFrames === 0) {
      // Find the nearest clear lane by scanning outward in depth.
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
  return input;
}

function run(cfg: BotConfig) {
  const s: Sim = {
    player: createPlayer(),
    enemies: createEnemies(),
    obstacles: createObstacles(),
    phase: "playing",
  };
  const mem = { prevWant: false, cooldown: 0, dodgeDir: 1, dodgeFrames: 0 };
  const maxFrames = 60 * 120; // 2 minute safety cap
  let frame = 0;
  let minHp = s.player.maxHp;
  for (; frame < maxFrames && s.phase === "playing"; frame++) {
    step(s, botInput(s, cfg, mem));
    minHp = Math.min(minHp, s.player.hp);
  }
  const killed = s.enemies.filter((e) => e.state === "dead").length;
  const result =
    s.phase === "won" ? "WON" : s.phase === "dead" ? "DIED" : "TIMED OUT";
  console.log(
    `  ${cfg.name.padEnd(20)} ${result.padEnd(10)} ` +
      `time ${(frame / 60).toFixed(1)}s  killed ${killed}/${s.enemies.length}  ` +
      `HP ${Math.round(s.player.hp)} (low ${Math.round(minHp)})`
  );
  return { result, killed, hp: s.player.hp };
}

console.log("Playthrough simulations (real game logic, scripted bots):\n");
run({ name: "Aggressive (perfect)", engageDist: 38, attacks: true });
run({ name: "Cautious (perfect)", engageDist: 52, attacks: true });
// Realistic imperfect player: slow reactions (slower than the attack cooldown)
// but does aim and reposition.
run({ name: "Human-ish (slow)", engageDist: 44, attacks: true, reactionDelay: 40 });
run({ name: "Pacifist (no attacks)", engageDist: 38, attacks: false });
console.log("\nDone.");
