import type { EnemyKind } from "./enemyTypes";
import type { Obstacle } from "./terrain";

export type Facing = 1 | -1;

export type CharState = "idle" | "walk" | "attack" | "hurt" | "dead";

export type GamePhase = "playing" | "dead" | "won";

export type PickupKind = "health" | "mana" | "power";

// Coordinate system: `x` is world position, `y` is the feet position inside
// the walkable depth band (larger y = closer to the camera).
export interface Character {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  facing: Facing;
  hp: number;
  maxHp: number;
  state: CharState;
  attackDamage: number;
  attackTimer: number;
  attackCooldown: number;
  attackDuration: number;
  attackWindup: number;
  hasHitThisSwing: boolean;
  hurtTimer: number;
  invulnTimer: number;
  animPhase: number;
}

export interface Player extends Character {
  mana: number;
  maxMana: number;
  magicCooldown: number;
}

export interface Enemy extends Character {
  id: number;
  kind: EnemyKind;
  flashTimer: number;
  speed: number;
  aggroRange: number;
  attackRange: number;
  attackReach: number;
  knockbackFactor: number;
}

export interface Pickup {
  x: number;
  y: number;
  kind: PickupKind;
  phase: number;
}

export interface MagicFx {
  x: number;
  y: number;
  timer: number;
  maxTimer: number;
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  obstacles: Obstacle[];
  pickups: Pickup[];
  magicFx: MagicFx | null;
  camX: number;
  phase: GamePhase;
  rng: () => number;
}

export interface BossStatus {
  hp: number;
  maxHp: number;
  enraged: boolean;
}

export interface HudState {
  playerHp: number;
  playerMaxHp: number;
  playerMana: number;
  playerMaxMana: number;
  attackDamage: number;
  enemiesRemaining: number;
  progress: number;
  phase: GamePhase;
  boss: BossStatus | null;
}
