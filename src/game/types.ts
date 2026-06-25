export type Facing = 1 | -1;

export type CharState = "idle" | "walk" | "attack" | "hurt" | "dead";

export interface Character {
  x: number; // world x (center of body, in world coordinates)
  y: number; // feet position on screen (depth band); larger = closer to camera
  vx: number;
  vy: number;
  w: number; // body width (collision)
  h: number; // body height (drawing)
  facing: Facing;
  hp: number;
  maxHp: number;
  state: CharState;
  // timers (counted down each frame)
  attackTimer: number;
  attackCooldown: number;
  attackDuration: number; // total length of a swing (for animation timing)
  attackWindup: number; // telegraph frames before the blade lands
  hasHitThisSwing: boolean; // ensures one attack damages a target once
  hurtTimer: number;
  invulnTimer: number;
  // simple leg-swing animation phase
  animPhase: number;
}

export interface Enemy extends Character {
  id: number;
  flashTimer: number; // white flash when hit
}

export type GamePhase = "playing" | "dead" | "won";

export interface GameState {
  player: Character;
  enemies: Enemy[];
  camX: number;
  phase: GamePhase;
  // HUD snapshot, read by React
  hud: {
    playerHp: number;
    playerMaxHp: number;
    enemiesRemaining: number;
    progress: number; // 0..1 toward the end of the level
    phase: GamePhase;
  };
}
