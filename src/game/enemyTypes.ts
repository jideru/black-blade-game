// Per-type stats for the different grunts. The AI (enemy.ts) and combat
// (engine.ts) read these off each enemy instance instead of global constants,
// so behaviour varies by type.

export type EnemyKind = "grunt" | "brute" | "runner" | "boss";

export interface KnightColors {
  body: string;
  bodyDark: string;
  trim: string;
  skin: string;
  blade: string;
}

export interface EnemyTypeDef {
  maxHp: number;
  w: number;
  h: number;
  speed: number;
  aggroRange: number;
  attackRange: number; // x distance at which it commits to a swing
  attackReach: number; // hitbox reach of its swing
  attackDamage: number; // damage dealt to the player
  attackDuration: number;
  attackWindup: number;
  knockbackFactor: number; // 1 = full knockback when hit, 0 = immovable
  colors: KnightColors;
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
    colors: { body: "#5a8f3c", bodyDark: "#3d6627", trim: "#7a4a2a", skin: "#8fbf5e", blade: "#9a9a9a" },
  },
  // Slow, tanky, hits hard, shrugs off knockback. A telegraphed wall of meat.
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
    colors: { body: "#8a4a3a", bodyDark: "#5e2f24", trim: "#caa23a", skin: "#b8763e", blade: "#c0c0c8" },
  },
  // The Gate Warden: a hulking end-of-level boss. Immovable, huge telegraphed
  // blows, and enrages below half HP (faster swings and movement — enemy.ts).
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
    colors: { body: "#3a2d4a", bodyDark: "#241a30", trim: "#b03a3a", skin: "#7a6a8a", blade: "#1a1620" },
  },
  // Fast, fragile, quick jabs. Closes distance and pesters.
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
    colors: { body: "#c08a2a", bodyDark: "#8a5e1a", trim: "#e0d050", skin: "#d6b25e", blade: "#b0b0b8" },
  },
};
