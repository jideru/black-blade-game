import {
  COLLISION_RADIUS_FACTOR,
  LEVEL_END_X,
  MANA_REGEN,
  PLAYER_ATTACK_COOLDOWN,
  PLAYER_ATTACK_DURATION,
  PLAYER_MIN_X,
  PLAYER_SPEED,
} from "./constants";
import type { InputState } from "./input";
import { blockedByObstacle, clampDepth, type Obstacle } from "./terrain";
import type { Player } from "./types";

export function updatePlayer(player: Player, input: InputState, obstacles: Obstacle[]) {
  tickTimers(player);

  const readyToSwing = player.attackTimer === 0 && player.attackCooldown === 0;
  if (input.attackPressed && readyToSwing) startSwing(player);

  // Attacks are committal: no movement until the swing finishes.
  if (player.attackTimer > 0) {
    player.vx = 0;
    player.vy = 0;
    return;
  }

  move(player, input, obstacles);
}

function tickTimers(player: Player) {
  if (player.attackTimer > 0) player.attackTimer--;
  if (player.attackCooldown > 0) player.attackCooldown--;
  if (player.magicCooldown > 0) player.magicCooldown--;
  if (player.hurtTimer > 0) player.hurtTimer--;
  if (player.invulnTimer > 0) player.invulnTimer--;
  player.mana = Math.min(player.maxMana, player.mana + MANA_REGEN);
}

function startSwing(player: Player) {
  player.attackTimer = PLAYER_ATTACK_DURATION;
  player.attackCooldown = PLAYER_ATTACK_DURATION + PLAYER_ATTACK_COOLDOWN;
  player.hasHitThisSwing = false;
  player.state = "attack";
}

function move(player: Player, input: InputState, obstacles: Obstacle[]) {
  let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (dx !== 0 && dy !== 0) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }

  player.vx = dx * PLAYER_SPEED;
  player.vy = dy * PLAYER_SPEED;
  if (dx > 0) player.facing = 1;
  else if (dx < 0) player.facing = -1;

  // Per-axis movement so the player slides along rocks instead of sticking.
  const radius = player.w * COLLISION_RADIUS_FACTOR;
  const nextX = Math.max(PLAYER_MIN_X, Math.min(LEVEL_END_X, player.x + player.vx));
  if (!blockedByObstacle(nextX, player.y, radius, obstacles)) player.x = nextX;
  const nextY = clampDepth(player.x, player.y + player.vy);
  if (!blockedByObstacle(player.x, nextY, radius, obstacles)) player.y = nextY;
  player.y = clampDepth(player.x, player.y);

  const moving = dx !== 0 || dy !== 0;
  player.state = moving ? "walk" : "idle";
  player.animPhase += moving ? 0.25 : 0.05;
}
