import {
  COLLISION_RADIUS_FACTOR,
  HAZARD_DAMAGE,
  LEVEL_END_X,
  PLAYER_ATTACK_DURATION,
  VIEW_WIDTH,
  WORLD_WIDTH,
} from "./constants";
import {
  canCastMagic,
  castMagic,
  collectPickups,
  damagePlayer,
  resolveEnemyAttack,
  resolvePlayerAttack,
} from "./combat";
import { isEnraged, updateEnemy } from "./enemy";
import type { InputState } from "./input";
import { createEnemies, createPlayer } from "./level";
import { createPickups } from "./pickups";
import { updatePlayer } from "./player";
import { createObstacles, hazardAt } from "./terrain";
import type { GameState, HudState } from "./types";

export function createWorld(rng: () => number = Math.random): GameState {
  return {
    player: createPlayer(),
    enemies: createEnemies(),
    obstacles: createObstacles(),
    pickups: createPickups(),
    magicFx: null,
    camX: 0,
    phase: "playing",
    rng,
  };
}

export function stepWorld(state: GameState, input: InputState) {
  if (state.phase !== "playing") return;
  const player = state.player;

  updatePlayer(player, input, state.obstacles);

  if (input.magicPressed && canCastMagic(state)) castMagic(state);
  if (state.magicFx && --state.magicFx.timer <= 0) state.magicFx = null;

  const inHitWindow =
    player.attackTimer > 0 &&
    player.attackTimer < PLAYER_ATTACK_DURATION - 3 &&
    !player.hasHitThisSwing;
  if (inHitWindow) resolvePlayerAttack(state);

  if (player.invulnTimer === 0) {
    const radius = player.w * COLLISION_RADIUS_FACTOR;
    if (hazardAt(player.x, player.y, radius, state.obstacles)) {
      damagePlayer(state, HAZARD_DAMAGE, player.facing);
    }
  }

  collectPickups(state);

  for (const enemy of state.enemies) {
    updateEnemy(enemy, player, state.enemies, state.obstacles);
  }
  for (const enemy of state.enemies) {
    resolveEnemyAttack(state, enemy);
  }

  state.camX = Math.max(0, Math.min(WORLD_WIDTH - VIEW_WIDTH, player.x - VIEW_WIDTH / 2));

  const anyEnemiesAlive = state.enemies.some((e) => e.state !== "dead");
  if (player.x >= LEVEL_END_X && !anyEnemiesAlive) state.phase = "won";
  if (player.hp <= 0) {
    player.state = "dead";
    state.phase = "dead";
  }
}

export function buildHud(state: GameState): HudState {
  const player = state.player;
  const boss = state.enemies.find((e) => e.kind === "boss" && e.state !== "dead");
  const bossEngaged = boss && Math.abs(boss.x - player.x) <= boss.aggroRange + 80;

  return {
    playerHp: player.hp,
    playerMaxHp: player.maxHp,
    playerMana: player.mana,
    playerMaxMana: player.maxMana,
    attackDamage: player.attackDamage,
    enemiesRemaining: state.enemies.filter((e) => e.state !== "dead").length,
    progress: Math.max(0, Math.min(1, player.x / LEVEL_END_X)),
    phase: state.phase,
    boss: bossEngaged ? { hp: boss.hp, maxHp: boss.maxHp, enraged: isEnraged(boss) } : null,
  };
}
