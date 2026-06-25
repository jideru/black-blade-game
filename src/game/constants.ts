// Rendering / world dimensions
export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 540;

// The level stretches far to the right; the camera scrolls to follow the player.
export const WORLD_WIDTH = 4200;

// The walkable "floor" is a band of depth. A character's `y` is the screen
// position of their feet: smaller y = further back, larger y = closer to camera.
export const FLOOR_TOP = 360;
export const FLOOR_BOTTOM = 512;

// Reaching this x ends the level.
export const LEVEL_END_X = WORLD_WIDTH - 120;

// Player tuning
export const PLAYER_SPEED = 3.4;
export const PLAYER_MAX_HP = 100;
export const PLAYER_MAX_MANA = 100;
export const MANA_REGEN = 0.04; // slow passive trickle per frame
export const PLAYER_ATTACK_DAMAGE = 34; // base sword damage (raised by power pickups)
export const PLAYER_ATTACK_DURATION = 18; // frames the swing lasts
export const PLAYER_ATTACK_COOLDOWN = 10; // frames before you can swing again
export const PLAYER_ATTACK_REACH = 64; // how far in front the hitbox extends
export const PLAYER_ATTACK_DEPTH = 40; // depth tolerance for a hit
export const HURT_INVULN = 28; // frames of invulnerability after taking a hit
export const KNOCKBACK = 7; // knockback applied to the player when hit
export const HAZARD_DAMAGE = 8; // damage per tick from standing in thorns
export const COLLISION_RADIUS_FACTOR = 0.4; // body collision radius = w * this

// Enemy tuning
export const ENEMY_MAX_HP = 50;
export const ENEMY_HURT_FLASH = 12;
export const ENEMY_HURT_STUN = 12; // frames frozen after a hit (when not committed)
export const ENEMY_KNOCKBACK = 3; // gentle shove so grunts stay in the fight

// Enemy AI (step 3)
export const ENEMY_SPEED = 1.7;
export const ENEMY_AGGRO_RANGE = 360; // starts chasing when player is this close (x)
export const ENEMY_ATTACK_RANGE = 54; // x distance at which it commits to a swing
export const ENEMY_ATTACK_DEPTH = 34; // depth tolerance for chasing/attacking
export const ENEMY_SEPARATION = 34; // grunts keep at least this far apart
export const ENEMY_ATTACK_WINDUP = 16; // telegraph frames before the blade lands
export const ENEMY_ATTACK_DURATION = 34; // total swing length (windup + follow-through)
export const ENEMY_ATTACK_COOLDOWN = 40; // frames before it can swing again
export const ENEMY_ATTACK_DAMAGE = 10;
export const ENEMY_ATTACK_REACH = 56;

// Magic special (costs mana, area burst around the player)
export const MAGIC_COST = 35;
export const MAGIC_DAMAGE = 42;
export const MAGIC_RADIUS = 150;
export const MAGIC_COOLDOWN = 36; // frames before it can be cast again
export const MAGIC_FX_DURATION = 22; // how long the burst visual lasts

// Pickups
export const PICKUP_HEALTH = 35; // HP restored
export const PICKUP_MANA = 45; // mana restored
export const PICKUP_POWER = 8; // permanent +sword damage for the run
export const PICKUP_RADIUS = 22; // collection distance
export const ENEMY_DROP_CHANCE = 0.35; // chance a slain grunt drops a pickup

// Depth scaling: characters near the camera (bigger y) appear slightly larger.
export const DEPTH_SCALE_MIN = 0.85;
export const DEPTH_SCALE_MAX = 1.08;
