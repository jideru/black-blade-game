export type EnemyKind = "grunt" | "brute" | "runner" | "boss";

export interface EnemyTypeDef {
  maxHp: number;
  w: number;
  h: number;
  speed: number;
  aggroRange: number;
  attackRange: number;
  attackReach: number;
  attackDamage: number;
  attackDuration: number;
  attackWindup: number;
  knockbackFactor: number;
}

export const ENEMY_TYPES: Record<EnemyKind, EnemyTypeDef> = {
  // Balanced melee fodder.
  grunt: {
    maxHp: 50,
    w: 36,
    h: 72,
    speed: 1.7,
    aggroRange: 360,
    attackRange: 54,
    attackReach: 56,
    attackDamage: 10,
    attackDuration: 34,
    attackWindup: 16,
    knockbackFactor: 1,
  },
  // Slow, tanky, hits hard, shrugs off most knockback.
  brute: {
    maxHp: 120,
    w: 50,
    h: 94,
    speed: 1.05,
    aggroRange: 320,
    attackRange: 62,
    attackReach: 70,
    attackDamage: 22,
    attackDuration: 48,
    attackWindup: 26,
    knockbackFactor: 0.25,
  },
  // Fast, fragile, quick jabs; gets flung by hits.
  runner: {
    maxHp: 26,
    w: 30,
    h: 60,
    speed: 2.9,
    aggroRange: 440,
    attackRange: 46,
    attackReach: 48,
    attackDamage: 7,
    attackDuration: 24,
    attackWindup: 10,
    knockbackFactor: 1.4,
  },
  // The Gate Warden: immovable end-of-level boss; enrages below half HP.
  boss: {
    maxHp: 300,
    w: 62,
    h: 118,
    speed: 1.25,
    aggroRange: 520,
    attackRange: 74,
    attackReach: 92,
    attackDamage: 26,
    attackDuration: 52,
    attackWindup: 28,
    knockbackFactor: 0,
  },
};
