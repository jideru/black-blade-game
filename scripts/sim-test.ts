// Headless unit checks for the pure game logic. Run with: npm test
import { availableMagicTier, castMagic, resolveEnemyAttack } from "../src/game/combat";
import {
  HURT_INVULN,
  MAGIC_BASE_DAMAGE,
  MAGIC_TIERS,
  MANA_ORBS_TO_FILL,
  PICKUP_HEALTH,
  PICKUP_MANA,
  PICKUP_POWER,
} from "../src/game/constants";
import { ENEMY_TYPES } from "../src/game/enemyTypes";
import { isEnraged, updateEnemy } from "../src/game/enemy";
import { neutralInput } from "../src/game/input";
import { applyPickup } from "../src/game/pickups";
import { updatePlayer } from "../src/game/player";
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

  const before = p.attackDamage;
  applyPickup(p, "power");
  assert(p.attackDamage === before + PICKUP_POWER, "power pickup raises sword damage");
}

console.log("Test 6b: the magic bar is orb-driven");
{
  const s = bareWorld();
  const p = s.player;
  assert(p.mana === 0, "magic bar starts empty");

  for (let i = 0; i < MANA_ORBS_TO_FILL; i++) applyPickup(p, "mana");
  assert(p.mana === p.maxMana, `${MANA_ORBS_TO_FILL} orbs fill the bar exactly`);

  applyPickup(p, "mana");
  assert(p.mana === p.maxMana, "extra orbs never overfill");

  const idle = neutralInput();
  const manaBefore = p.mana = 40;
  for (let i = 0; i < 300; i++) updatePlayer(p, idle, []);
  assert(p.mana === manaBefore, "mana does not regenerate on its own");
}

console.log("Test 6c: magic tiers scale with banked orbs");
{
  const orb = PICKUP_MANA;
  const gruntInBlast = (s: GameState) => {
    const grunt = s.enemies[0];
    s.player.x = grunt.x - 60;
    s.player.y = grunt.y;
    return grunt;
  };

  let s = bareWorld();
  s.player.mana = 0;
  assert(availableMagicTier(s.player) === null, "no cast with an empty bar");

  s = bareWorld();
  let grunt = gruntInBlast(s);
  s.player.mana = orb; // 1 orb -> 50%
  castMagic(s);
  assert(grunt.hp === grunt.maxHp - MAGIC_BASE_DAMAGE * 0.5, "1 orb hits for 50%");
  assert(s.player.mana === 0, "1-orb cast spends exactly one orb");

  s = bareWorld();
  grunt = gruntInBlast(s);
  s.player.mana = 3 * orb; // 3 orbs -> 100%
  castMagic(s);
  assert(grunt.state === "dead", "3 orbs (100%) kills a normal monster");
  assert(MAGIC_BASE_DAMAGE >= ENEMY_TYPES.grunt.maxHp, "100% damage covers grunt max HP");
  assert(s.player.mana === 0, "3-orb cast spends exactly three orbs");

  s = bareWorld();
  grunt = gruntInBlast(s);
  s.player.mana = 4 * orb; // 4 orbs -> still the 3-orb tier, one orb kept
  castMagic(s);
  assert(grunt.state === "dead", "4 orbs casts the 3-orb tier");
  assert(s.player.mana === orb, "the leftover orb stays banked");

  s = bareWorld();
  const brute = s.enemies.find((e) => e.kind === "brute")!;
  s.player.x = brute.x - 60;
  s.player.y = brute.y;
  s.player.mana = 5 * orb; // full bar -> 200%
  castMagic(s);
  assert(brute.hp === brute.maxHp - MAGIC_BASE_DAMAGE * 2, "full bar hits for 200%");
  assert(s.player.mana === 0, "full-bar cast spends all five orbs");
}

console.log("Test 6d: blast radius grows with the tier");
{
  const orb = PICKUP_MANA;

  // 1 orb: "nearby" only — a grunt 200px away is out of reach.
  let s = bareWorld();
  let grunt = s.enemies[0];
  s.player.x = grunt.x - 200;
  s.player.y = grunt.y;
  s.player.mana = orb;
  castMagic(s);
  assert(grunt.hp === grunt.maxHp, "1-orb burst misses a grunt 200px away");

  // 3 orbs: mid-range — the same 200px grunt is inside the blast.
  s = bareWorld();
  grunt = s.enemies[0];
  s.player.x = grunt.x - 200;
  s.player.y = grunt.y;
  s.player.mana = 3 * orb;
  castMagic(s);
  assert(grunt.state === "dead", "3-orb burst reaches 200px");

  // Full bar: screen-wide — a grunt half a screen away (500px) is hit.
  s = bareWorld();
  grunt = s.enemies[0];
  s.player.x = grunt.x - 500;
  s.player.y = grunt.y;
  s.player.mana = 5 * orb;
  castMagic(s);
  assert(grunt.state === "dead", "full-bar nova reaches 500px (screen-wide)");

  // Radii are strictly increasing across tiers.
  const radii = [...MAGIC_TIERS].sort((a, b) => a.orbs - b.orbs).map((t) => t.radius);
  assert(
    radii[0] < radii[1] && radii[1] < radii[2],
    `radius grows with orbs (${radii.join(" < ")})`
  );
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
