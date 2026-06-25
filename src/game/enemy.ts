import { FLOOR_BOTTOM, FLOOR_TOP } from "./constants";
import type { Character, Enemy } from "./types";

// Step 2 enemy: a weak grunt. It does NOT chase or attack yet — it only reacts
// to being hit (flash + knockback + death). Step 3 will add the AI here.
export function updateEnemy(enemy: Enemy, player: Character) {
  if (enemy.state === "dead") return;

  if (enemy.flashTimer > 0) enemy.flashTimer--;
  if (enemy.hurtTimer > 0) enemy.hurtTimer--;

  // Apply and decay knockback velocity.
  if (Math.abs(enemy.vx) > 0.1 || Math.abs(enemy.vy) > 0.1) {
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;
    enemy.y = Math.max(FLOOR_TOP, Math.min(FLOOR_BOTTOM, enemy.y));
    enemy.vx *= 0.8;
    enemy.vy *= 0.8;
  } else {
    enemy.vx = 0;
    enemy.vy = 0;
  }

  // Always face the player so the grunt looks alert.
  enemy.facing = player.x >= enemy.x ? 1 : -1;

  enemy.state = enemy.hurtTimer > 0 ? "hurt" : "idle";
  enemy.animPhase += 0.04;
}
