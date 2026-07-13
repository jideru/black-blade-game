import {
  ENEMY_ATTACK_DEPTH,
  ENEMY_DROP_CHANCE,
  ENEMY_HURT_FLASH,
  ENEMY_HURT_STUN,
  ENEMY_KNOCKBACK,
  HURT_INVULN,
  KNOCKBACK,
  LEVEL_END_X,
  MAGIC_BASE_DAMAGE,
  MAGIC_COOLDOWN,
  MAGIC_FX_DURATION,
  MAGIC_RADIUS,
  MAGIC_TIERS,
  PICKUP_MANA,
  PICKUP_RADIUS,
  PLAYER_ATTACK_DEPTH,
  PLAYER_ATTACK_REACH,
  PLAYER_MIN_X,
} from "./constants";
import { applyPickup, dropPickup } from "./pickups";
import type { Enemy, GameState, PickupKind, Player } from "./types";

export type MagicTier = (typeof MAGIC_TIERS)[number];

/** The strongest magic tier the player's banked orbs afford, if any. */
export function availableMagicTier(player: Player): MagicTier | null {
  for (const tier of MAGIC_TIERS) {
    if (player.mana >= tier.orbs * PICKUP_MANA) return tier;
  }
  return null;
}

export function damagePlayer(state: GameState, amount: number, pushDir: number) {
  const p = state.player;
  p.hp = Math.max(0, p.hp - amount);
  p.hurtTimer = HURT_INVULN;
  p.invulnTimer = HURT_INVULN;
  p.x = Math.max(PLAYER_MIN_X, Math.min(LEVEL_END_X, p.x + pushDir * KNOCKBACK));
}

export function damageEnemy(state: GameState, enemy: Enemy, pushDir: number, amount: number) {
  enemy.hp -= amount;
  enemy.flashTimer = ENEMY_HURT_FLASH;
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    enemy.state = "dead";
    enemy.vx = 0;
    enemy.vy = 0;
    rollDrop(state, enemy);
    return;
  }
  // Hyperarmor: an enemy already committed to a swing is not interrupted, so
  // trading blows is a real risk. Only an approaching enemy gets staggered.
  if (enemy.attackTimer === 0) {
    enemy.hurtTimer = ENEMY_HURT_STUN;
    enemy.vx = pushDir * ENEMY_KNOCKBACK * enemy.knockbackFactor;
  }
}

function rollDrop(state: GameState, enemy: Enemy) {
  if (state.rng() > ENEMY_DROP_CHANCE) return;
  const roll = state.rng();
  const kind: PickupKind = roll < 0.5 ? "health" : roll < 0.85 ? "mana" : "power";
  state.pickups.push(dropPickup(enemy.x, enemy.y, kind));
}

export function resolvePlayerAttack(state: GameState) {
  const p = state.player;
  const front = p.facing;
  const minX = front === 1 ? p.x : p.x - PLAYER_ATTACK_REACH;
  const maxX = front === 1 ? p.x + PLAYER_ATTACK_REACH : p.x;

  for (const enemy of state.enemies) {
    if (enemy.state === "dead") continue;
    const withinX = enemy.x + enemy.w / 2 >= minX && enemy.x - enemy.w / 2 <= maxX;
    const withinDepth = Math.abs(enemy.y - p.y) <= PLAYER_ATTACK_DEPTH;
    if (withinX && withinDepth) {
      damageEnemy(state, enemy, front, p.attackDamage);
      p.hasHitThisSwing = true;
    }
  }
}

export function resolveEnemyAttack(state: GameState, enemy: Enemy) {
  if (enemy.state !== "attack" || enemy.hasHitThisSwing) return;
  const elapsed = enemy.attackDuration - enemy.attackTimer;
  if (elapsed < enemy.attackWindup) return;

  enemy.hasHitThisSwing = true;

  const p = state.player;
  if (p.invulnTimer > 0) return;
  const front = enemy.facing;
  const minX = front === 1 ? enemy.x : enemy.x - enemy.attackReach;
  const maxX = front === 1 ? enemy.x + enemy.attackReach : enemy.x;
  const withinX = p.x + p.w / 2 >= minX && p.x - p.w / 2 <= maxX;
  const withinDepth = Math.abs(p.y - enemy.y) <= ENEMY_ATTACK_DEPTH;
  if (withinX && withinDepth) damagePlayer(state, enemy.attackDamage, front);
}

export function canCastMagic(state: GameState): boolean {
  const p = state.player;
  return p.magicCooldown === 0 && p.attackTimer === 0 && availableMagicTier(p) !== null;
}

export function castMagic(state: GameState) {
  const p = state.player;
  const tier = availableMagicTier(p);
  if (!tier) return;

  p.mana -= tier.orbs * PICKUP_MANA;
  p.magicCooldown = MAGIC_COOLDOWN;
  state.magicFx = {
    x: p.x,
    y: p.y,
    timer: MAGIC_FX_DURATION,
    maxTimer: MAGIC_FX_DURATION,
    power: tier.damageFactor,
  };

  const damage = MAGIC_BASE_DAMAGE * tier.damageFactor;
  for (const enemy of state.enemies) {
    if (enemy.state === "dead") continue;
    const dx = enemy.x - p.x;
    const dy = (enemy.y - p.y) * 1.4;
    if (dx * dx + dy * dy <= MAGIC_RADIUS * MAGIC_RADIUS) {
      damageEnemy(state, enemy, Math.sign(dx) || 1, damage);
    }
  }
}

export function collectPickups(state: GameState) {
  const p = state.player;
  const reach = PICKUP_RADIUS + p.w * 0.4;
  state.pickups = state.pickups.filter((pickup) => {
    const dx = pickup.x - p.x;
    const dy = pickup.y - p.y;
    if (dx * dx + dy * dy > reach * reach) return true;
    applyPickup(p, pickup.kind);
    return false;
  });
}
