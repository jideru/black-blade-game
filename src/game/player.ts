import {
  COLLISION_RADIUS_FACTOR,
  LEVEL_END_X,
  PLAYER_ATTACK_COOLDOWN,
  PLAYER_ATTACK_DURATION,
  PLAYER_SPEED,
} from "./constants";
import type { InputState } from "./input";
import { blockedByObstacle, clampDepth, type Obstacle } from "./terrain";
import type { Character } from "./types";

export function updatePlayer(player: Character, input: InputState, obstacles: Obstacle[]) {
  // Tick timers.
  if (player.attackTimer > 0) player.attackTimer--;
  if (player.attackCooldown > 0) player.attackCooldown--;
  if (player.hurtTimer > 0) player.hurtTimer--;
  if (player.invulnTimer > 0) player.invulnTimer--;

  const attacking = player.attackTimer > 0;

  // Start a new swing on the rising edge of the attack button.
  if (input.attackPressed && !attacking && player.attackCooldown === 0) {
    player.attackTimer = PLAYER_ATTACK_DURATION;
    player.attackCooldown = PLAYER_ATTACK_DURATION + PLAYER_ATTACK_COOLDOWN;
    player.hasHitThisSwing = false;
    player.state = "attack";
  }

  // No movement while mid-swing — keeps attacks committal, like a brawler.
  if (player.attackTimer > 0) {
    player.vx = 0;
    player.vy = 0;
    return;
  }

  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;

  // Normalize diagonal movement so it isn't faster.
  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.SQRT2;
    dx *= inv;
    dy *= inv;
  }

  player.vx = dx * PLAYER_SPEED;
  player.vy = dy * PLAYER_SPEED;

  if (dx > 0) player.facing = 1;
  else if (dx < 0) player.facing = -1;

  // Move each axis separately and block on rocks, so the player slides along
  // an obstacle instead of sticking to it.
  const r = player.w * COLLISION_RADIUS_FACTOR;
  const tryX = Math.max(40, Math.min(LEVEL_END_X, player.x + player.vx));
  if (!blockedByObstacle(tryX, player.y, r, obstacles)) player.x = tryX;
  const tryY = clampDepth(player.x, player.y + player.vy);
  if (!blockedByObstacle(player.x, tryY, r, obstacles)) player.y = tryY;
  // Keep depth valid even if x moved into a narrower part of the path.
  player.y = clampDepth(player.x, player.y);

  const moving = dx !== 0 || dy !== 0;
  player.state = moving ? "walk" : "idle";
  player.animPhase += moving ? 0.25 : 0.05;
}
