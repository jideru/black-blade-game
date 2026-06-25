import {
  ENEMY_AGGRO_RANGE,
  ENEMY_ATTACK_COOLDOWN,
  ENEMY_ATTACK_DEPTH,
  ENEMY_ATTACK_DURATION,
  ENEMY_ATTACK_RANGE,
  ENEMY_SEPARATION,
  ENEMY_SPEED,
  FLOOR_BOTTOM,
  FLOOR_TOP,
} from "./constants";
import type { Character, Enemy } from "./types";

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// Decay and apply residual knockback velocity (set when the grunt is hit).
function applyKnockback(enemy: Enemy) {
  if (Math.abs(enemy.vx) > 0.1 || Math.abs(enemy.vy) > 0.1) {
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;
    enemy.y = clamp(enemy.y, FLOOR_TOP, FLOOR_BOTTOM);
    enemy.vx *= 0.8;
    enemy.vy *= 0.8;
  } else {
    enemy.vx = 0;
    enemy.vy = 0;
  }
}

// Step 3 enemy: a grunt that chases the player and attacks when in range.
// `others` is the full enemy list, used so grunts spread out instead of
// stacking on the same pixel. Damage to the player is resolved in the engine
// during the swing's hit frame (see GameEngine.resolveEnemyAttack).
export function updateEnemy(enemy: Enemy, player: Character, others: Enemy[]) {
  if (enemy.state === "dead") return;

  if (enemy.flashTimer > 0) enemy.flashTimer--;
  if (enemy.hurtTimer > 0) enemy.hurtTimer--;
  if (enemy.attackTimer > 0) enemy.attackTimer--;
  if (enemy.attackCooldown > 0) enemy.attackCooldown--;

  // Always face the player.
  enemy.facing = player.x >= enemy.x ? 1 : -1;

  // Stunned after being hit: take the knockback and do nothing else.
  if (enemy.hurtTimer > 0) {
    applyKnockback(enemy);
    enemy.state = "hurt";
    return;
  }

  // Mid-swing: hold position; the swing plays out and resolves in the engine.
  if (enemy.attackTimer > 0) {
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.state = "attack";
    return;
  }

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);

  // In range and ready: commit to a swing.
  if (adx <= ENEMY_ATTACK_RANGE && ady <= ENEMY_ATTACK_DEPTH && enemy.attackCooldown === 0) {
    enemy.attackTimer = ENEMY_ATTACK_DURATION;
    enemy.attackCooldown = ENEMY_ATTACK_DURATION + ENEMY_ATTACK_COOLDOWN;
    enemy.hasHitThisSwing = false;
    enemy.state = "attack";
    enemy.vx = 0;
    enemy.vy = 0;
    return;
  }

  // Chase if the player is within aggro range.
  if (adx <= ENEMY_AGGRO_RANGE) {
    let mvx = 0;
    let mvy = 0;
    // Close the gap, but stop nudging once inside attack distance.
    if (adx > ENEMY_ATTACK_RANGE - 6) mvx = Math.sign(dx);
    if (ady > ENEMY_ATTACK_DEPTH - 6) mvy = Math.sign(dy);

    // Separation: push away from nearby grunts so they fan out.
    let sepx = 0;
    let sepy = 0;
    for (const o of others) {
      if (o === enemy || o.state === "dead") continue;
      const ox = enemy.x - o.x;
      const oy = enemy.y - o.y;
      const dist = Math.hypot(ox, oy);
      if (dist >= ENEMY_SEPARATION) continue;
      if (dist > 0.001) {
        sepx += ox / dist;
        sepy += oy / dist;
      }
      // When two grunts are stacked (or nearly collinear with the player on
      // the x-axis), x-separation alone just slows both equally. Break the tie
      // in the depth axis so they peel into different lanes — deterministic by
      // id so the split is stable.
      if (Math.abs(oy) < 1) {
        sepy += enemy.id > o.id ? 1 : -1;
      }
    }

    let vx = mvx + sepx * 0.7;
    let vy = mvy + sepy * 0.7;
    const len = Math.hypot(vx, vy);
    if (len > 0) {
      vx /= len;
      vy /= len;
      enemy.x += vx * ENEMY_SPEED;
      enemy.y += vy * ENEMY_SPEED;
      enemy.y = clamp(enemy.y, FLOOR_TOP, FLOOR_BOTTOM);
      enemy.state = "walk";
      enemy.animPhase += 0.2;
    } else {
      enemy.state = "idle";
    }
    return;
  }

  // Out of range: idle, shedding any leftover knockback.
  applyKnockback(enemy);
  enemy.state = "idle";
  enemy.animPhase += 0.04;
}
