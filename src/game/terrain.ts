import { FLOOR_BOTTOM, FLOOR_TOP, LEVEL_END_X } from "./constants";

export interface Obstacle {
  x: number;
  y: number;
  r: number;
  kind: "rock" | "thorns";
  solid: boolean;
  hazard: boolean;
  seed: number;
}

// The back edge of the walkable path undulates with world x. Both the renderer
// and the movement clamp use this, so what you see is what bounds you.
export function backEdgeY(worldX: number): number {
  return (
    FLOOR_TOP +
    22 +
    14 * Math.sin(worldX * 0.004) +
    8 * Math.sin(worldX * 0.011 + 1.3)
  );
}

export function clampDepth(worldX: number, y: number): number {
  return Math.max(backEdgeY(worldX), Math.min(FLOOR_BOTTOM, y));
}

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
    const reach = radius + o.r;
    if (dx * dx + dy * dy < reach * reach) return true;
  }
  return false;
}

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
    const reach = radius + o.r * 0.7;
    if (dx * dx + dy * dy < reach * reach) return o;
  }
  return null;
}

let nextSeed = 1;

function obstacleY(depthFraction: number): number {
  return FLOOR_TOP + 30 + depthFraction * (FLOOR_BOTTOM - (FLOOR_TOP + 30));
}

function rock(x: number, depthFraction: number, r: number): Obstacle {
  return { x, y: obstacleY(depthFraction), r, kind: "rock", solid: true, hazard: false, seed: nextSeed++ };
}

function thorns(x: number, depthFraction: number, r: number): Obstacle {
  return { x, y: obstacleY(depthFraction), r, kind: "thorns", solid: false, hazard: true, seed: nextSeed++ };
}

// Rocks hug the back or front of the band and are spaced out so there is
// always a clear lane around them — cover, never a wall. Thorns can sit
// anywhere since you can push through them at a cost. Completability is
// verified by scripts/sim-playthrough.ts.
export function createObstacles(): Obstacle[] {
  nextSeed = 1;
  const layout: Obstacle[] = [
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
  return layout.filter((o) => o.x > 240 && o.x < LEVEL_END_X - 80);
}
