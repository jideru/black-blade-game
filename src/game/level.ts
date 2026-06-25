import {
  ENEMY_ATTACK_DURATION,
  ENEMY_ATTACK_WINDUP,
  ENEMY_MAX_HP,
  FLOOR_BOTTOM,
  FLOOR_TOP,
  PLAYER_ATTACK_DURATION,
  PLAYER_MAX_HP,
} from "./constants";
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

function makeEnemy(x: number, y: number): Enemy {
  return {
    id: nextEnemyId++,
    x,
    y,
    vx: 0,
    vy: 0,
    w: 36,
    h: 72,
    facing: -1,
    hp: ENEMY_MAX_HP,
    maxHp: ENEMY_MAX_HP,
    state: "idle",
    attackTimer: 0,
    attackCooldown: 0,
    attackDuration: ENEMY_ATTACK_DURATION,
    attackWindup: ENEMY_ATTACK_WINDUP,
    hasHitThisSwing: false,
    hurtTimer: 0,
    invulnTimer: 0,
    animPhase: Math.random() * Math.PI * 2,
    flashTimer: 0,
  };
}

// Hand-placed enemy spawns spread across the level, from near the start to the
// end. These are the "weak grunts" — for now they just stand and take hits.
export function createEnemies(): Enemy[] {
  nextEnemyId = 1;
  const mid = (FLOOR_TOP + FLOOR_BOTTOM) / 2;
  const spawns: Array<[number, number]> = [
    [700, mid - 30],
    [1100, mid + 40],
    [1150, mid - 50],
    [1700, mid],
    [2050, mid + 50],
    [2100, mid - 40],
    [2150, mid + 10],
    [2750, mid - 30],
    [2800, mid + 40],
    [3400, mid + 20],
    [3450, mid - 40],
    [3500, mid + 60],
  ];
  return spawns.map(([x, y]) => makeEnemy(x, y));
}
