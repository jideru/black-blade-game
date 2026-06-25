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
```

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
| `game/enemy.ts`       | Enemy behaviour (currently passive — see roadmap)        |
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
- [ ] **Step 3 — Enemy AI:** grunts chase the player and attack, dealing damage.

Step 3 hooks are already stubbed in `game/enemy.ts` (`updateEnemy` receives the
player) and the engine already supports damaging the player (HP, invulnerability
frames, and the lose condition are wired up).
