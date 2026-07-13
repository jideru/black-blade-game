// Rendering / world dimensions
export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 540;
export const WORLD_WIDTH = 4200;

// The walkable floor is a band of depth; a character's `y` is their feet
// position inside it (see types.ts). The band's back edge undulates with
// world x — terrain.backEdgeY is the real boundary, FLOOR_TOP its ceiling.
export const FLOOR_TOP = 360;
export const FLOOR_BOTTOM = 512;

export const PLAYER_MIN_X = 40;
export const LEVEL_END_X = WORLD_WIDTH - 120;

// Player
export const PLAYER_SPEED = 3.4;
export const PLAYER_MAX_HP = 100;
export const PLAYER_MAX_MANA = 100;
export const PLAYER_ATTACK_DAMAGE = 34;
export const PLAYER_ATTACK_DURATION = 18;
export const PLAYER_ATTACK_COOLDOWN = 10;
export const PLAYER_ATTACK_REACH = 64;
export const PLAYER_ATTACK_DEPTH = 40;
export const HURT_INVULN = 28;
export const KNOCKBACK = 7;
export const HAZARD_DAMAGE = 8;
export const COLLISION_RADIUS_FACTOR = 0.4;

// Enemies (shared across types; per-type stats live in enemyTypes.ts)
export const ENEMY_HURT_FLASH = 12;
export const ENEMY_HURT_STUN = 12;
export const ENEMY_KNOCKBACK = 3;
export const ENEMY_ATTACK_DEPTH = 34;
export const ENEMY_SEPARATION = 34;
export const ENEMY_ATTACK_COOLDOWN = 40;
export const ENEMY_DROP_CHANCE = 0.35;

// Boss enrage (below half HP)
export const ENRAGE_SPEED_FACTOR = 1.45;
export const ENRAGE_RECOVERY_FACTOR = 0.45;

// Magic special: one button, three tiers. A cast fires the strongest tier the
// banked orbs afford and consumes that tier's orbs. Base damage equals a
// grunt's max HP, so the 100% tier one-shots a normal monster.
export const MAGIC_BASE_DAMAGE = 50;
export const MAGIC_TIERS = [
  { orbs: 5, damageFactor: 2 },
  { orbs: 3, damageFactor: 1 },
  { orbs: 1, damageFactor: 0.5 },
] as const;
export const MAGIC_RADIUS = 150;
export const MAGIC_COOLDOWN = 36;
export const MAGIC_FX_DURATION = 22;

// Pickups. The magic bar starts empty and does not regenerate — magic orbs
// are its only source, and five of them fill it exactly.
export const MANA_ORBS_TO_FILL = 5;
export const PICKUP_HEALTH = 35;
export const PICKUP_MANA = PLAYER_MAX_MANA / MANA_ORBS_TO_FILL;
export const PICKUP_POWER = 8;
export const PICKUP_RADIUS = 22;

// Characters nearer the camera draw slightly larger.
export const DEPTH_SCALE_MIN = 0.85;
export const DEPTH_SCALE_MAX = 1.08;
