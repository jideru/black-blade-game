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

The game logic is framework-agnostic and lives in `src/game/`; React only mounts
the canvas and renders the HUD overlay.

| File                  | Responsibility                                           |
| --------------------- | -------------------------------------------------------- |
| `game/engine.ts`      | Fixed-timestep game loop, combat resolution, camera, HUD |
| `game/player.ts`      | Player movement + attack state machine                   |
| `game/enemy.ts`       | Enemy AI: aggro, chase, separation, telegraphed attack   |
| `game/input.ts`       | Keyboard → logical actions (held + edge-triggered)       |
| `game/render.ts`      | Canvas drawing: parallax background + characters         |
| `game/level.ts`       | Player/enemy factories and enemy spawn placement         |
| `game/constants.ts`   | Tunable gameplay values                                  |
| `components/Game.tsx` | Canvas + engine lifecycle                                |
| `components/Hud.tsx`  | Health, enemy count, progress, win/lose overlay          |

The simulation runs on a **fixed 60Hz timestep** decoupled from rendering, so
gameplay speed is identical on 60Hz and 120Hz (ProMotion) displays.

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

Ideas for later: health/score pickups, multiple enemy types, a boss at the gate,
combo attacks, and sound.
