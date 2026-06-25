import { FLOOR_BOTTOM, FLOOR_TOP, LEVEL_END_X } from "./constants";

// A static piece of the map. Rocks block movement; thorns hurt anyone who
// stands in them. Both sort into the depth order with characters.
export interface Obstacle {
  x: number; // world x
  y: number; // feet position (depth)
  r: number; // footprint radius (collision / hazard)
  kind: "rock" | "thorns";
  solid: boolean; // blocks movement
  hazard: boolean; // damages the player on contact
  seed: number; // per-instance variation for drawing
}

// The far (back) edge of the walkable path. Instead of a straight line it
// undulates with world x, so the path organically widens and narrows. Both the
// renderer and the movement clamp use this, so what you see is what blocks you.
export function backEdgeY(worldX: number): number {
  return (
    FLOOR_TOP +
    22 +
    14 * Math.sin(worldX * 0.004) +
    8 * Math.sin(worldX * 0.011 + 1.3)
  );
}

// Clamp a feet position into the walkable band at the given world x.
export function clampDepth(worldX: number, y: number): number {
  return Math.max(backEdgeY(worldX), Math.min(FLOOR_BOTTOM, y));
}

// Is (x, y) blocked by a solid obstacle for a body of the given radius?
export function blockedByObstacle(
  x: number,
  y: number,
  radius: number,
  obstacles: Obstacle[]
): boolean {
  for (const o of obstacles) {
    if (!o.solid) continue;
    const dx = x - o.x;
    const dy = y - o.y;
    const rr = radius + o.r;
    if (dx * dx + dy * dy < rr * rr) return true;
  }
  return false;
}

// Return the hazard the body is standing in, if any.
export function hazardAt(
  x: number,
  y: number,
  radius: number,
  obstacles: Obstacle[]
): Obstacle | null {
  for (const o of obstacles) {
    if (!o.hazard) continue;
    const dx = x - o.x;
    const dy = y - o.y;
    const rr = radius + o.r * 0.7; // need to be fairly inside the patch
    if (dx * dx + dy * dy < rr * rr) return o;
  }
  return null;
}

let nextSeed = 1;

function rock(x: number, yFrac: number, r: number): Obstacle {
  const y = FLOOR_TOP + 30 + yFrac * (FLOOR_BOTTOM - (FLOOR_TOP + 30));
  return { x, y, r, kind: "rock", solid: true, hazard: false, seed: nextSeed++ };
}

function thorns(x: number, yFrac: number, r: number): Obstacle {
  const y = FLOOR_TOP + 30 + yFrac * (FLOOR_BOTTOM - (FLOOR_TOP + 30));
  return { x, y, r, kind: "thorns", solid: false, hazard: true, seed: nextSeed++ };
}

// Hand-placed obstacles down the length of the level. yFrac is 0 (back of the
// path) .. 1 (front). Rocks are kept to the back or front of the band and well
// spaced in x, so there is always a clear lane to walk around them — they are
// cover, never a wall. Thorns sit anywhere since you can push through them (at a
// cost). Tuned so the level stays completable (see scripts/sim-playthrough.ts).
export function createObstacles(): Obstacle[] {
  nextSeed = 1;
  const list: Obstacle[] = [
    rock(540, 0.16, 24),
    thorns(820, 0.62, 24),
    rock(1080, 0.82, 24),
    thorns(1340, 0.28, 22),
    rock(1560, 0.15, 26),
    thorns(1820, 0.72, 24),
    rock(2080, 0.84, 24),
    thorns(2320, 0.5, 24),
    rock(2560, 0.18, 26),
    thorns(2820, 0.66, 22),
    rock(3060, 0.85, 24),
    thorns(3320, 0.3, 22),
    rock(3560, 0.16, 24),
  ];
  // Keep obstacles clear of the very start and the end gate.
  return list.filter((o) => o.x > 240 && o.x < LEVEL_END_X - 80);
}
