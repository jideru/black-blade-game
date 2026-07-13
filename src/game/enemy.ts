import {
  COLLISION_RADIUS_FACTOR,
  ENEMY_ATTACK_COOLDOWN,
  ENEMY_ATTACK_DEPTH,
  ENEMY_SEPARATION,
  ENRAGE_RECOVERY_FACTOR,
  ENRAGE_SPEED_FACTOR,
} from "./constants";
import { blockedByObstacle, clampDepth, type Obstacle } from "./terrain";
import type { Character, Enemy } from "./types";

export function isEnraged(enemy: Enemy): boolean {
  return enemy.kind === "boss" && enemy.hp > 0 && enemy.hp <= enemy.maxHp * 0.5;
}

export function updateEnemy(
  enemy: Enemy,
  player: Character,
  others: Enemy[],
  obstacles: Obstacle[]
) {
  if (enemy.state === "dead") return;

  tickTimers(enemy);
  enemy.facing = player.x >= enemy.x ? 1 : -1;

  if (enemy.hurtTimer > 0) {
    applyKnockback(enemy, obstacles);
    enemy.state = "hurt";
    return;
  }

  if (enemy.attackTimer > 0) {
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.state = "attack";
    return;
  }

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;

  const enraged = isEnraged(enemy);
  const speed = enraged ? enemy.speed * ENRAGE_SPEED_FACTOR : enemy.speed;
  const recovery = enraged ? ENEMY_ATTACK_COOLDOWN * ENRAGE_RECOVERY_FACTOR : ENEMY_ATTACK_COOLDOWN;

  const inAttackRange = Math.abs(dx) <= enemy.attackRange && Math.abs(dy) <= ENEMY_ATTACK_DEPTH;
  if (inAttackRange && enemy.attackCooldown === 0) {
    commitSwing(enemy, recovery);
    return;
  }

  if (Math.abs(dx) <= enemy.aggroRange) {
    chase(enemy, dx, dy, speed, others, obstacles);
    return;
  }

  applyKnockback(enemy, obstacles);
  enemy.state = "idle";
  enemy.animPhase += 0.04;
}

function tickTimers(enemy: Enemy) {
  if (enemy.flashTimer > 0) enemy.flashTimer--;
  if (enemy.hurtTimer > 0) enemy.hurtTimer--;
  if (enemy.attackTimer > 0) enemy.attackTimer--;
  if (enemy.attackCooldown > 0) enemy.attackCooldown--;
}

function commitSwing(enemy: Enemy, recovery: number) {
  enemy.attackTimer = enemy.attackDuration;
  enemy.attackCooldown = enemy.attackDuration + recovery;
  enemy.hasHitThisSwing = false;
  enemy.state = "attack";
  enemy.vx = 0;
  enemy.vy = 0;
}

function chase(
  enemy: Enemy,
  dx: number,
  dy: number,
  speed: number,
  others: Enemy[],
  obstacles: Obstacle[]
) {
  const seekX = Math.abs(dx) > enemy.attackRange - 6 ? Math.sign(dx) : 0;
  const seekY = Math.abs(dy) > ENEMY_ATTACK_DEPTH - 6 ? Math.sign(dy) : 0;
  const { spreadX, spreadY } = separationFrom(enemy, others);

  let vx = seekX + spreadX * 0.7;
  let vy = seekY + spreadY * 0.7;
  const length = Math.hypot(vx, vy);
  if (length === 0) {
    enemy.state = "idle";
    return;
  }
  vx /= length;
  vy /= length;

  const radius = enemy.w * COLLISION_RADIUS_FACTOR;
  const nextX = enemy.x + vx * speed;
  if (!blockedByObstacle(nextX, enemy.y, radius, obstacles)) enemy.x = nextX;
  const nextY = clampDepth(enemy.x, enemy.y + vy * speed);
  if (!blockedByObstacle(enemy.x, nextY, radius, obstacles)) enemy.y = nextY;
  enemy.y = clampDepth(enemy.x, enemy.y);

  enemy.state = "walk";
  enemy.animPhase += 0.2;
}

// Push away from nearby living enemies so packs fan out across depth lanes
// instead of stacking on one pixel.
function separationFrom(enemy: Enemy, others: Enemy[]) {
  let spreadX = 0;
  let spreadY = 0;
  for (const other of others) {
    if (other === enemy || other.state === "dead") continue;
    const offsetX = enemy.x - other.x;
    const offsetY = enemy.y - other.y;
    const distance = Math.hypot(offsetX, offsetY);
    if (distance >= ENEMY_SEPARATION) continue;
    if (distance > 0.001) {
      spreadX += offsetX / distance;
      spreadY += offsetY / distance;
    }
    // Same depth (or same pixel): break the tie deterministically by id so the
    // pair peels into different lanes instead of jostling forever.
    if (Math.abs(offsetY) < 1) {
      spreadY += enemy.id > other.id ? 1 : -1;
    }
  }
  return { spreadX, spreadY };
}

function applyKnockback(enemy: Enemy, obstacles: Obstacle[]) {
  if (Math.abs(enemy.vx) < 0.1 && Math.abs(enemy.vy) < 0.1) {
    enemy.vx = 0;
    enemy.vy = 0;
    return;
  }
  const radius = enemy.w * COLLISION_RADIUS_FACTOR;
  const nextX = enemy.x + enemy.vx;
  if (!blockedByObstacle(nextX, enemy.y, radius, obstacles)) enemy.x = nextX;
  enemy.y = clampDepth(enemy.x, enemy.y + enemy.vy);
  enemy.vx *= 0.8;
  enemy.vy *= 0.8;
}
