# Black Blade

A side-scrolling beat-'em-up in the spirit of **Golden Axe** and **Castle Crashers**.
You play a warrior who fights through a level from left to right, in a 2.5D arena
where you can also move up/down (depth) and back the way you came.

Built with **React + TypeScript + Vite**, rendered on an HTML5 `<canvas>`, and
ready to deploy on **Vercel**.

## Controls

| Action  | Keys                          |
| ------- | ----------------------------- |
| Move    | `W` `A` `S` `D` or arrow keys |
| Attack  | `Space` or `J`                |
| Magic   | `K` or `L` (costs mana)       |
| Restart | `R` (on the win/lose screen)  |

Clear every enemy and reach the gate at the end of the level to win.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build
npm test         # headless unit checks for the game logic
npm run sim      # headless playthrough sims (scripted bots play the level)
```

The game logic in `src/game/` is pure and DOM-free, so the AI/combat rules are
verified headlessly without a browser: `scripts/sim-test.ts` unit-checks the AI,
and `scripts/sim-playthrough.ts` runs scripted bots through the whole level to
sanity-check balance.

### Combat feel

A grunt that has committed to a swing has **hyperarmor** — hits no longer
interrupt it, so trading blows is a real risk. Hits only stagger a grunt that is
still approaching. The result (per `npm run sim`): a frame-perfect player can
clear the level untouched, sloppy play survives on a sliver of health, and
refusing to fight gets you killed.

## Deploy to Vercel

Vercel auto-detects Vite. Either:

- Import the repo at [vercel.com/new](https://vercel.com/new) (Framework: **Vite**,
  build `npm run build`, output `dist`), or
- Run `npx vercel` from the project root.

## Architecture

The simulation is a pure, DOM-free core; the browser bits (keyboard, canvas,
React) are thin adapters around it. The headless test scripts drive the same
`stepWorld` the game runs, so there is no duplicated logic to drift.

**Domain core** (`src/game/`, pure):

| File            | Responsibility                                              |
| --------------- | ----------------------------------------------------------- |
| `world.ts`      | `createWorld` / `stepWorld` / `buildHud` — the sim entry     |
| `combat.ts`     | Damage, attack resolution, magic burst, pickups, drops      |
| `player.ts`     | Player movement + attack state machine                      |
| `enemy.ts`      | Enemy AI: aggro, chase, separation, swings, boss enrage     |
| `level.ts`      | Player/enemy factories and spawn placement                  |
| `enemyTypes.ts` | Per-type enemy stats (grunt / brute / runner / boss)        |
| `terrain.ts`    | Squiggly path edge, obstacle collision, hazards             |
| `pickups.ts`    | Pickup placement, drops, and effects                        |
| `types.ts`      | Domain types                                                |
| `constants.ts`  | Tunable gameplay values                                     |

**Adapters and UI**:

| File                  | Responsibility                                          |
| --------------------- | ------------------------------------------------------- |
| `game/engine.ts`      | Fixed-timestep rAF loop bridging input → world → canvas |
| `game/input.ts`       | Keyboard → logical actions (held + edge-triggered)      |
| `game/render.ts`      | Canvas drawing; owns all colors and visual style        |
| `components/Game.tsx` | Canvas + engine lifecycle                               |
| `components/Hud.tsx`  | Health/mana bars, boss bar, progress, win/lose overlay  |

The world steps on a **fixed 60Hz timestep** decoupled from rendering, so
gameplay speed is identical on 60Hz and 120Hz (ProMotion) displays.
`createWorld` takes an injectable RNG, which the sims use to disable random
drops for deterministic runs.

## Roadmap

- [x] **Step 1 — The bones:** side-scrolling level with a scrolling camera,
      4-direction movement (incl. moving back), and a start-to-end goal.
- [x] **Step 2 — A weak enemy:** grunts that can be attacked and killed but do
      not fight back yet.
- [x] **Step 3 — Enemy AI:** grunts aggro within range, chase the player (fanning
      into depth lanes instead of stacking), and commit telegraphed attacks that
      deal damage. Getting hit interrupts a grunt's swing; the player gets
      invulnerability frames and a knockback. Lose when HP hits zero.
- [x] **Organic map:** the back edge of the path squiggles with the terrain
      (`src/game/terrain.ts`) instead of being a straight line, and the map is
      dotted with **rocks** (solid cover you slide around) and **thorn patches**
      (hazards that chip your health). Obstacles depth-sort with characters and
      are placed to always leave a clear lane (verified completable by the
      playthrough sims).

- [x] **Pickups & magic:** the player has a **magic bar** segmented in fifths.
      It starts **empty** and never regenerates: **magic orbs** are its only
      source, one segment per orb. The **magic special** (`K`/`L`) is an area
      burst with **three tiers** — pressing it fires the strongest tier the
      banked orbs afford and spends that tier's orbs: **1 orb → 50%** damage,
      **3 orbs → 100%** (one-shots a normal grunt), **full bar → 200%**. Other
      pickups: **health** (restore HP) and **power** (permanently raise sword
      damage for the run). See `src/game/combat.ts` and `src/game/pickups.ts`.

- [x] **Multiple enemy types:** per-type stats live in `src/game/enemyTypes.ts`
      and drive the shared AI — **grunts** (balanced fodder), **brutes** (slow,
      tanky, hit hard, shrug off knockback), and **runners** (fast, fragile,
      quick jabs). Waves mix types more aggressively deeper into the level.

- [x] **Boss fight:** **The Gate Warden** guards the end gate — a hulking,
      knockback-immune knight with huge telegraphed blows. Below half HP he
      **enrages** (faster swings and movement, pulsing HUD warning). A boss
      health bar appears when you get close. You can't win without killing him.

Ideas for later: combo attacks, score, sound, and more levels.
