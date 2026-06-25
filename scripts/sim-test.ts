// Headless verification of the pure game logic (no DOM / canvas / rAF).
// Run with: npx tsx scripts/sim-test.ts
import {
  ENEMY_ATTACK_DAMAGE,
  ENEMY_ATTACK_DEPTH,
  ENEMY_ATTACK_REACH,
  HURT_INVULN,
} from "../src/game/constants";
import { updateEnemy } from "../src/game/enemy";
import { createEnemies, createPlayer } from "../src/game/level";
import type { Character, Enemy } from "../src/game/types";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    console.error(`  ✗ ${msg}`);
    failures++;
  }
}

// Mirror of GameEngine.resolveEnemyAttack so we can test damage application
// without a canvas. Returns the damage dealt to the player this step.
function resolveEnemyAttack(e: Enemy, p: Character): number {
  if (e.state !== "attack" || e.hasHitThisSwing) return 0;
  const elapsed = e.attackDuration - e.attackTimer;
  if (elapsed < e.attackWindup) return 0;
  e.hasHitThisSwing = true;
  if (p.invulnTimer > 0) return 0;
  const front = e.facing;
  const minX = front === 1 ? e.x : e.x - ENEMY_ATTACK_REACH;
  const maxX = front === 1 ? e.x + ENEMY_ATTACK_REACH : e.x;
  const withinX = p.x + p.w / 2 >= minX && p.x - p.w / 2 <= maxX;
  const withinDepth = Math.abs(p.y - e.y) <= ENEMY_ATTACK_DEPTH;
  if (withinX && withinDepth) {
    p.hp = Math.max(0, p.hp - ENEMY_ATTACK_DAMAGE);
    p.invulnTimer = HURT_INVULN;
    return ENEMY_ATTACK_DAMAGE;
  }
  return 0;
}

console.log("Test 1: a far-off grunt stays idle (outside aggro range)");
{
  const player = createPlayer(); // x = 140
  const enemies = createEnemies();
  const e = enemies[0]; // x = 700, ~560px away
  const startX = e.x;
  for (let i = 0; i < 60; i++) updateEnemy(e, player, enemies);
  assert(e.state === "idle", "stays idle when player is far");
  assert(Math.abs(e.x - startX) < 1, "does not move toward a distant player");
}

console.log("Test 2: a grunt chases the player when in aggro range");
{
  const player = createPlayer();
  const enemies = createEnemies();
  const e = enemies[0];
  player.x = e.x - 200; // within 360px aggro range, to the enemy's left
  player.y = e.y;
  const startDist = Math.abs(e.x - player.x);
  for (let i = 0; i < 60; i++) updateEnemy(e, player, enemies);
  const endDist = Math.abs(e.x - player.x);
  assert(endDist < startDist, `closes the gap (from ${startDist.toFixed(0)} to ${endDist.toFixed(0)}px)`);
  assert(e.facing === -1, "faces the player to its left");
}

console.log("Test 3: a grunt attacks and damages an in-range player");
{
  const player = createPlayer();
  const enemies = createEnemies();
  const e = enemies[0];
  player.x = e.x - 40; // inside attack range
  player.y = e.y;
  let totalDamage = 0;
  let everAttacked = false;
  const startHp = player.hp;
  for (let i = 0; i < 120; i++) {
    if (player.invulnTimer > 0) player.invulnTimer--;
    updateEnemy(e, player, enemies);
    if (e.state === "attack") everAttacked = true;
    totalDamage += resolveEnemyAttack(e, player);
  }
  assert(everAttacked, "enters the attack state when in range");
  assert(totalDamage > 0, `deals damage to the player (${startHp - player.hp} total)`);
  assert(player.hp < startHp, "player HP drops");
}

console.log("Test 4: invulnerability frames block back-to-back hits");
{
  const player = createPlayer();
  const enemies = createEnemies();
  const e = enemies[0];
  player.x = e.x - 40;
  player.y = e.y;
  player.invulnTimer = HURT_INVULN; // pretend just hit
  // Force a landed swing this step.
  e.state = "attack";
  e.attackTimer = 1;
  e.attackDuration = 34;
  e.attackWindup = 16;
  e.hasHitThisSwing = false;
  const dmg = resolveEnemyAttack(e, player);
  assert(dmg === 0, "no damage while invulnerable");
}

console.log("Test 5: overlapping grunts separate while chasing");
{
  const player = createPlayer();
  const enemies = createEnemies();
  const a = enemies[1];
  const b = enemies[2];
  // Start the two grunts welded to the exact same pixel...
  a.x = b.x = 1120;
  a.y = b.y = 430;
  // ...with the player far enough that they chase (in aggro, out of attack range).
  player.x = 1400;
  player.y = 430;
  for (let i = 0; i < 40; i++) {
    updateEnemy(a, player, enemies);
    updateEnemy(b, player, enemies);
  }
  const gap = Math.hypot(a.x - b.x, a.y - b.y);
  assert(gap > 5, `grunts unstick from the same pixel (gap ${gap.toFixed(1)}px)`);
}

console.log(failures === 0 ? "\nAll AI checks passed ✓" : `\n${failures} check(s) FAILED ✗`);
process.exit(failures === 0 ? 0 : 1);
