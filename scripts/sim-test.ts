// Headless unit checks for the pure game logic. Run with: npm test
import { resolveEnemyAttack } from "../src/game/combat";
import { HURT_INVULN, PICKUP_HEALTH, PICKUP_MANA, PICKUP_POWER } from "../src/game/constants";
import { isEnraged, updateEnemy } from "../src/game/enemy";
import { applyPickup } from "../src/game/pickups";
import type { Enemy, GameState } from "../src/game/types";
import { createWorld } from "../src/game/world";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    console.error(`  ✗ ${msg}`);
    failures++;
  }
}

// A world with random drops disabled and no obstacles, so combat checks are
// deterministic and free of terrain interference.
function bareWorld(): GameState {
  const state = createWorld(() => 1);
  state.obstacles = [];
  return state;
}

function forceLandedSwing(enemy: Enemy) {
  enemy.state = "attack";
  enemy.attackTimer = 1;
  enemy.hasHitThisSwing = false;
}

console.log("Test 1: a far-off grunt stays idle (outside aggro range)");
{
  const s = bareWorld();
  const grunt = s.enemies[0];
  const startX = grunt.x;
  for (let i = 0; i < 60; i++) updateEnemy(grunt, s.player, s.enemies, []);
  assert(grunt.state === "idle", "stays idle when player is far");
  assert(Math.abs(grunt.x - startX) < 1, "does not move toward a distant player");
}

console.log("Test 2: a grunt chases the player when in aggro range");
{
  const s = bareWorld();
  const grunt = s.enemies[0];
  s.player.x = grunt.x - 200;
  s.player.y = grunt.y;
  const startDist = Math.abs(grunt.x - s.player.x);
  for (let i = 0; i < 60; i++) updateEnemy(grunt, s.player, s.enemies, []);
  const endDist = Math.abs(grunt.x - s.player.x);
  assert(endDist < startDist, `closes the gap (${startDist.toFixed(0)} to ${endDist.toFixed(0)}px)`);
  assert(grunt.facing === -1, "faces the player to its left");
}

console.log("Test 3: a grunt attacks and damages an in-range player");
{
  const s = bareWorld();
  const grunt = s.enemies[0];
  s.player.x = grunt.x - 40;
  s.player.y = grunt.y;
  const startHp = s.player.hp;
  let everAttacked = false;
  for (let i = 0; i < 120; i++) {
    if (s.player.invulnTimer > 0) s.player.invulnTimer--;
    updateEnemy(grunt, s.player, s.enemies, []);
    if (grunt.state === "attack") everAttacked = true;
    resolveEnemyAttack(s, grunt);
  }
  assert(everAttacked, "enters the attack state when in range");
  assert(s.player.hp < startHp, `deals damage to the player (${startHp - s.player.hp} total)`);
}

console.log("Test 4: invulnerability frames block back-to-back hits");
{
  const s = bareWorld();
  const grunt = s.enemies[0];
  s.player.x = grunt.x - 40;
  s.player.y = grunt.y;
  s.player.invulnTimer = HURT_INVULN;
  forceLandedSwing(grunt);
  const hpBefore = s.player.hp;
  resolveEnemyAttack(s, grunt);
  assert(s.player.hp === hpBefore, "no damage while invulnerable");
}

console.log("Test 5: overlapping grunts separate while chasing");
{
  const s = bareWorld();
  const [, a, b] = [s.enemies[0], s.enemies[1], s.enemies[2]];
  a.x = b.x = 1120;
  a.y = b.y = 430;
  s.player.x = 1400;
  s.player.y = 430;
  for (let i = 0; i < 40; i++) {
    updateEnemy(a, s.player, s.enemies, []);
    updateEnemy(b, s.player, s.enemies, []);
  }
  const gap = Math.hypot(a.x - b.x, a.y - b.y);
  assert(gap > 5, `grunts unstick from the same pixel (gap ${gap.toFixed(1)}px)`);
}

console.log("Test 6: pickups apply their effects (and clamp to max)");
{
  const s = bareWorld();
  const p = s.player;
  p.hp = 40;
  applyPickup(p, "health");
  assert(p.hp === Math.min(p.maxHp, 40 + PICKUP_HEALTH), "health pickup restores HP");

  p.hp = p.maxHp - 5;
  applyPickup(p, "health");
  assert(p.hp === p.maxHp, "health pickup never exceeds max HP");

  p.mana = 10;
  applyPickup(p, "mana");
  assert(p.mana === Math.min(p.maxMana, 10 + PICKUP_MANA), "mana pickup restores mana");

  const before = p.attackDamage;
  applyPickup(p, "power");
  assert(p.attackDamage === before + PICKUP_POWER, "power pickup raises sword damage");
}

console.log("Test 7: the Gate Warden boss");
{
  const s = bareWorld();
  const boss = s.enemies.find((e) => e.kind === "boss");
  assert(!!boss, "a boss spawns in the level");
  if (boss) {
    assert(boss.maxHp >= 250, `boss is tanky (${boss.maxHp} HP)`);
    assert(boss.knockbackFactor === 0, "boss cannot be knocked back");
    assert(!isEnraged(boss), "not enraged at full HP");

    s.player.x = boss.x - 40;
    s.player.y = boss.y;
    updateEnemy(boss, s.player, s.enemies, []);
    const calmCooldown = boss.attackCooldown;
    assert(boss.state === "attack", "boss commits to a swing in range");

    boss.hp = boss.maxHp * 0.4;
    assert(isEnraged(boss), "enraged below half HP");
    boss.attackTimer = 0;
    boss.attackCooldown = 0;
    boss.state = "idle";
    updateEnemy(boss, s.player, s.enemies, []);
    assert(
      boss.attackCooldown < calmCooldown,
      `enraged swings recover faster (${boss.attackCooldown} < ${calmCooldown} frames)`
    );

    boss.hp = 0;
    assert(!isEnraged(boss), "enrage flag clears at 0 HP");
  }
}

console.log(failures === 0 ? "\nAll checks passed ✓" : `\n${failures} check(s) FAILED ✗`);
process.exit(failures === 0 ? 0 : 1);
