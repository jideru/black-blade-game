import {
  FLOOR_BOTTOM,
  FLOOR_TOP,
  PLAYER_ATTACK_DAMAGE,
  PLAYER_ATTACK_DURATION,
  PLAYER_MAX_HP,
  PLAYER_MAX_MANA,
} from "./constants";
import { ENEMY_TYPES, type EnemyKind } from "./enemyTypes";
import type { Character, Enemy } from "./types";

export function createPlayer(): Character {
  return {
    x: 140,
    y: (FLOOR_TOP + FLOOR_BOTTOM) / 2,
    vx: 0,
    vy: 0,
    w: 38,
    h: 78,
    facing: 1,
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    state: "idle",
    mana: PLAYER_MAX_MANA,
    maxMana: PLAYER_MAX_MANA,
    attackDamage: PLAYER_ATTACK_DAMAGE,
    magicCooldown: 0,
    attackTimer: 0,
    attackCooldown: 0,
    attackDuration: PLAYER_ATTACK_DURATION,
    attackWindup: 3,
    hasHitThisSwing: false,
    hurtTimer: 0,
    invulnTimer: 0,
    animPhase: 0,
  };
}

let nextEnemyId = 1;

function makeEnemy(kind: EnemyKind, x: number, y: number): Enemy {
  const def = ENEMY_TYPES[kind];
  return {
    id: nextEnemyId++,
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    w: def.w,
    h: def.h,
    facing: -1,
    hp: def.maxHp,
    maxHp: def.maxHp,
    state: "idle",
    mana: 0,
    maxMana: 0,
    attackDamage: def.attackDamage,
    magicCooldown: 0,
    attackTimer: 0,
    attackCooldown: 0,
    attackDuration: def.attackDuration,
    attackWindup: def.attackWindup,
    hasHitThisSwing: false,
    hurtTimer: 0,
    invulnTimer: 0,
    animPhase: Math.random() * Math.PI * 2,
    flashTimer: 0,
    speed: def.speed,
    aggroRange: def.aggroRange,
    attackRange: def.attackRange,
    attackReach: def.attackReach,
    knockbackFactor: def.knockbackFactor,
  };
}

// Hand-placed enemy waves across the level. Early stretches are mostly grunts;
// runners and brutes appear deeper in, building difficulty toward the end.
export function createEnemies(): Enemy[] {
  nextEnemyId = 1;
  const mid = (FLOOR_TOP + FLOOR_BOTTOM) / 2;
  const spawns: Array<[EnemyKind, number, number]> = [
    ["grunt", 700, mid - 30],
    ["grunt", 1100, mid + 40],
    ["runner", 1150, mid - 50],
    ["grunt", 1700, mid],
    ["runner", 2050, mid + 50],
    ["grunt", 2100, mid - 40],
    ["brute", 2150, mid + 10],
    ["runner", 2750, mid - 30],
    ["grunt", 2800, mid + 40],
    ["brute", 3400, mid + 20],
    ["runner", 3450, mid - 40],
    ["grunt", 3500, mid + 60],
    // The Gate Warden guards the end of the level.
    ["boss", 3950, mid],
  ];
  return spawns.map(([kind, x, y]) => makeEnemy(kind, x, y));
}
