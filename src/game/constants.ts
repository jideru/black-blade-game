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
export const PLAYER_ATTACK_DAMAGE = 34;
export const PLAYER_ATTACK_DURATION = 18; // frames the swing lasts
export const PLAYER_ATTACK_COOLDOWN = 10; // frames before you can swing again
export const PLAYER_ATTACK_REACH = 64; // how far in front the hitbox extends
export const PLAYER_ATTACK_DEPTH = 40; // depth tolerance for a hit
export const HURT_INVULN = 28; // frames of invulnerability after taking a hit
export const KNOCKBACK = 7; // knockback applied to the player when hit

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

// Depth scaling: characters near the camera (bigger y) appear slightly larger.
export const DEPTH_SCALE_MIN = 0.85;
export const DEPTH_SCALE_MAX = 1.08;
