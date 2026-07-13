import {
  FLOOR_BOTTOM,
  FLOOR_TOP,
  PLAYER_ATTACK_DAMAGE,
  PLAYER_ATTACK_DURATION,
  PLAYER_MAX_HP,
  PLAYER_MAX_MANA,
} from "./constants";
import { ENEMY_TYPES, type EnemyKind } from "./enemyTypes";
import type { Enemy, Player } from "./types";

const FLOOR_MID = (FLOOR_TOP + FLOOR_BOTTOM) / 2;

export function createPlayer(): Player {
  return {
    x: 140,
    y: FLOOR_MID,
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
    attackDamage: def.attackDamage,
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

// Waves mix in runners and brutes deeper into the level; the Gate Warden
// guards the end gate.
export function createEnemies(): Enemy[] {
  nextEnemyId = 1;
  const spawns: Array<[EnemyKind, number, number]> = [
    ["grunt", 700, FLOOR_MID - 30],
    ["grunt", 1100, FLOOR_MID + 40],
    ["runner", 1150, FLOOR_MID - 50],
    ["grunt", 1700, FLOOR_MID],
    ["runner", 2050, FLOOR_MID + 50],
    ["grunt", 2100, FLOOR_MID - 40],
    ["brute", 2150, FLOOR_MID + 10],
    ["runner", 2750, FLOOR_MID - 30],
    ["grunt", 2800, FLOOR_MID + 40],
    ["brute", 3400, FLOOR_MID + 20],
    ["runner", 3450, FLOOR_MID - 40],
    ["grunt", 3500, FLOOR_MID + 60],
    ["boss", 3950, FLOOR_MID],
  ];
  return spawns.map(([kind, x, y]) => makeEnemy(kind, x, y));
}
