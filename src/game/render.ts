import {
  DEPTH_SCALE_MAX,
  DEPTH_SCALE_MIN,
  FLOOR_BOTTOM,
  FLOOR_TOP,
  LEVEL_END_X,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  WORLD_WIDTH,
} from "./constants";
import { backEdgeY, type Obstacle } from "./terrain";
import type { Character, Enemy, GameState } from "./types";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function depthScale(y: number) {
  const t = (y - FLOOR_TOP) / (FLOOR_BOTTOM - FLOOR_TOP);
  return lerp(DEPTH_SCALE_MIN, DEPTH_SCALE_MAX, Math.max(0, Math.min(1, t)));
}

interface KnightColors {
  body: string;
  bodyDark: string;
  trim: string;
  skin: string;
  blade: string;
}

const PLAYER_COLORS: KnightColors = {
  body: "#2f6fb0",
  bodyDark: "#1d4a7a",
  trim: "#d7c14a",
  skin: "#e6b48c",
  blade: "#22202b",
};

const ENEMY_COLORS: KnightColors = {
  body: "#5a8f3c",
  bodyDark: "#3d6627",
  trim: "#7a4a2a",
  skin: "#8fbf5e",
  blade: "#9a9a9a",
};

type Drawable =
  | { y: number; sort: number; kind: "player"; ref: Character }
  | { y: number; sort: number; kind: "enemy"; ref: Enemy }
  | { y: number; sort: number; kind: "obstacle"; ref: Obstacle };

export function render(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  drawBackground(ctx, state.camX);

  // Everything on the ground plane is drawn back-to-front (by feet y) so closer
  // things overlap farther ones — characters and obstacles interleave.
  const drawables: Drawable[] = [
    { y: state.player.y, sort: state.player.y, kind: "player", ref: state.player },
    ...state.enemies.map((e): Drawable => ({ y: e.y, sort: e.y, kind: "enemy", ref: e })),
    ...state.obstacles.map((o): Drawable => ({ y: o.y, sort: o.y, kind: "obstacle", ref: o })),
  ];
  drawables.sort((a, b) => a.sort - b.sort);

  for (const d of drawables) {
    const screenX = d.ref.x - state.camX;
    if (screenX < -140 || screenX > VIEW_WIDTH + 140) continue;
    if (d.kind === "player") {
      drawKnight(ctx, d.ref, screenX, PLAYER_COLORS, false);
    } else if (d.kind === "enemy") {
      drawKnight(ctx, d.ref, screenX, ENEMY_COLORS, d.ref.flashTimer > 0);
      if (d.ref.state !== "dead") drawEnemyHealthBar(ctx, d.ref, screenX);
    } else {
      drawObstacle(ctx, d.ref, screenX);
    }
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, camX: number) {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  sky.addColorStop(0, "#2a2350");
  sky.addColorStop(0.55, "#6d4a7a");
  sky.addColorStop(1, "#c98a6a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  // Distant hills (slow parallax)
  drawHills(ctx, camX * 0.2, FLOOR_TOP - 30, "#4a3a66", 220, 520);
  drawHills(ctx, camX * 0.4, FLOOR_TOP + 5, "#3a2e52", 160, 400);

  // Grassy embankment behind the path (fills down past the lowest back edge).
  const grass = ctx.createLinearGradient(0, FLOOR_TOP - 10, 0, FLOOR_TOP + 70);
  grass.addColorStop(0, "#3a5230");
  grass.addColorStop(1, "#2c3f24");
  ctx.fillStyle = grass;
  ctx.fillRect(0, FLOOR_TOP - 10, VIEW_WIDTH, 90);

  drawTrees(ctx, camX);

  // The walkable path: a polygon whose top edge follows the squiggly back edge.
  const step = 6;
  const pathTop = (sx: number) => backEdgeY(sx + camX);
  ctx.beginPath();
  ctx.moveTo(0, VIEW_HEIGHT);
  ctx.lineTo(0, pathTop(0));
  for (let sx = 0; sx <= VIEW_WIDTH; sx += step) ctx.lineTo(sx, pathTop(sx));
  ctx.lineTo(VIEW_WIDTH, VIEW_HEIGHT);
  ctx.closePath();
  const grnd = ctx.createLinearGradient(0, FLOOR_TOP, 0, VIEW_HEIGHT);
  grnd.addColorStop(0, "#5a4632");
  grnd.addColorStop(1, "#2c2018");
  ctx.fillStyle = grnd;
  ctx.fill();

  // Scrolling stripes, clipped to the path so they respect the squiggly edge.
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 2;
  const spacing = 120;
  const offset = -((camX * 0.9) % spacing);
  for (let x = offset; x < VIEW_WIDTH + 60; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, FLOOR_TOP - 20);
    ctx.lineTo(x - 40, VIEW_HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  // The squiggly edge itself: a soft shadow lip plus a lighter grass rim.
  ctx.beginPath();
  for (let sx = 0; sx <= VIEW_WIDTH; sx += step) {
    const y = pathTop(sx);
    if (sx === 0) ctx.moveTo(sx, y);
    else ctx.lineTo(sx, y);
  }
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  for (let sx = 0; sx <= VIEW_WIDTH; sx += step) {
    const y = pathTop(sx) - 3;
    if (sx === 0) ctx.moveTo(sx, y);
    else ctx.lineTo(sx, y);
  }
  ctx.strokeStyle = "#4f7038";
  ctx.lineWidth = 2;
  ctx.stroke();

  drawLevelEnd(ctx, camX);
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, screenX: number) {
  const scale = depthScale(o.y);
  ctx.save();
  ctx.translate(screenX, o.y);
  ctx.scale(scale, scale);

  // Ground shadow.
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 0, o.r * 1.05, o.r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (o.kind === "rock") {
    drawRock(ctx, o);
  } else {
    drawThorns(ctx, o);
  }
  ctx.restore();
}

function drawRock(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const r = o.r;
  // Main boulder body.
  ctx.fillStyle = "#7a7a82";
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(-r * 0.7, -r * 0.95);
  ctx.lineTo(-r * 0.1, -r * 1.25);
  ctx.lineTo(r * 0.6, -r * 1.0);
  ctx.lineTo(r, -r * 0.2);
  ctx.lineTo(r * 0.7, 0);
  ctx.closePath();
  ctx.fill();
  // Shading on the right/underside.
  ctx.fillStyle = "#5b5b63";
  ctx.beginPath();
  ctx.moveTo(r, -r * 0.2);
  ctx.lineTo(r * 0.6, -r * 1.0);
  ctx.lineTo(r * 0.1, -r * 0.7);
  ctx.lineTo(r * 0.7, 0);
  ctx.closePath();
  ctx.fill();
  // Highlight facet.
  ctx.fillStyle = "#9a9aa2";
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.95);
  ctx.lineTo(-r * 0.1, -r * 1.25);
  ctx.lineTo(-r * 0.15, -r * 0.7);
  ctx.lineTo(-r * 0.55, -r * 0.55);
  ctx.closePath();
  ctx.fill();
}

function drawThorns(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const r = o.r;
  // Low tangled mound.
  ctx.fillStyle = "#243018";
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.2, r, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Spikes poking up, pseudo-randomized by seed.
  ctx.strokeStyle = "#1a2410";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  const spikes = 9;
  for (let i = 0; i < spikes; i++) {
    const t = i / (spikes - 1);
    const bx = -r + t * 2 * r;
    const wob = Math.sin(o.seed * 1.7 + i * 2.3);
    const h = r * (0.5 + 0.4 * Math.abs(wob));
    ctx.beginPath();
    ctx.moveTo(bx, -r * 0.2);
    ctx.lineTo(bx + wob * 4, -r * 0.2 - h);
    ctx.stroke();
  }
  // A few menacing tips.
  ctx.fillStyle = "#6d8a3a";
  for (let i = 0; i < spikes; i += 2) {
    const t = i / (spikes - 1);
    const bx = -r + t * 2 * r;
    const wob = Math.sin(o.seed * 1.7 + i * 2.3);
    const h = r * (0.5 + 0.4 * Math.abs(wob));
    ctx.beginPath();
    ctx.arc(bx + wob * 4, -r * 0.2 - h, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHills(
  ctx: CanvasRenderingContext2D,
  scroll: number,
  baseY: number,
  color: string,
  height: number,
  _period: number
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  for (let x = 0; x <= VIEW_WIDTH; x += 8) {
    const y = baseY - Math.abs(Math.sin((x + scroll) * 0.004)) * height;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(VIEW_WIDTH, baseY);
  ctx.closePath();
  ctx.fill();
}

function drawTrees(ctx: CanvasRenderingContext2D, camX: number) {
  // Decorative trees along the back of the path (mid parallax).
  const spacing = 360;
  const scroll = camX * 0.85;
  const start = Math.floor(scroll / spacing) - 1;
  for (let i = start; i < start + VIEW_WIDTH / spacing + 3; i++) {
    const worldX = i * spacing + 60;
    const sx = worldX - scroll;
    const baseY = FLOOR_TOP + 6;
    // trunk
    ctx.fillStyle = "#241712";
    ctx.fillRect(sx - 8, baseY - 70, 16, 70);
    // foliage
    ctx.fillStyle = "#2f4a26";
    ctx.beginPath();
    ctx.arc(sx, baseY - 86, 34, 0, Math.PI * 2);
    ctx.arc(sx - 26, baseY - 70, 26, 0, Math.PI * 2);
    ctx.arc(sx + 26, baseY - 70, 26, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLevelEnd(ctx: CanvasRenderingContext2D, camX: number) {
  const sx = LEVEL_END_X + 40 - camX;
  if (sx < -100 || sx > VIEW_WIDTH + 200) return;
  // A stone gate marking the end of the level.
  ctx.fillStyle = "#6b6b73";
  ctx.fillRect(sx, FLOOR_TOP - 150, 30, 160);
  ctx.fillRect(sx + 90, FLOOR_TOP - 150, 30, 160);
  ctx.fillRect(sx - 6, FLOOR_TOP - 170, 138, 28);
  ctx.fillStyle = "#3a3a40";
  ctx.fillRect(sx + 30, FLOOR_TOP - 140, 60, 150);
  // banner
  ctx.fillStyle = "#b03a3a";
  ctx.fillRect(sx + 44, FLOOR_TOP - 170, 32, 70);
}

function drawKnight(
  ctx: CanvasRenderingContext2D,
  c: Character,
  screenX: number,
  colors: KnightColors,
  flash: boolean
) {
  const scale = depthScale(c.y);
  const feetY = c.y;
  const dead = c.state === "dead";

  ctx.save();
  ctx.translate(screenX, feetY);
  ctx.scale(scale, scale);
  if (c.facing === -1) ctx.scale(-1, 1);

  // Blink while invulnerable (after taking a hit).
  if (c.invulnTimer > 0 && Math.floor(c.invulnTimer / 3) % 2 === 0) {
    ctx.globalAlpha = 0.35;
  }

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  if (dead) {
    // Fallen body lying on the ground.
    ctx.fillStyle = colors.bodyDark;
    ctx.beginPath();
    ctx.ellipse(6, -10, 34, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.skin;
    ctx.beginPath();
    ctx.arc(-26, -12, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const bob = c.state === "walk" ? Math.sin(c.animPhase) * 2 : 0;
  const legSwing = c.state === "walk" ? Math.sin(c.animPhase) * 8 : 0;
  const hurtTilt = c.hurtTimer > 0 ? 0.12 : 0;
  ctx.rotate(hurtTilt);

  const bodyTop = -c.h + 24; // top of torso relative to feet

  // Legs
  ctx.strokeStyle = colors.bodyDark;
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, -22);
  ctx.lineTo(-10 + legSwing, 0);
  ctx.moveTo(8, -22);
  ctx.lineTo(10 - legSwing, 0);
  ctx.stroke();

  // Torso
  ctx.fillStyle = flash ? "#ffffff" : colors.body;
  roundRect(ctx, -16, bodyTop + bob, 32, c.h - 48, 9);
  ctx.fill();
  // Belt / trim
  ctx.fillStyle = flash ? "#ffffff" : colors.trim;
  ctx.fillRect(-16, -28 + bob, 32, 6);

  // Shield arm (back arm)
  ctx.fillStyle = flash ? "#ffffff" : colors.bodyDark;
  ctx.beginPath();
  ctx.arc(-14, bodyTop + 24 + bob, 9, 0, Math.PI * 2);
  ctx.fill();

  // Head + helmet
  const headY = bodyTop - 12 + bob;
  ctx.fillStyle = flash ? "#ffffff" : colors.skin;
  ctx.beginPath();
  ctx.arc(0, headY, 13, 0, Math.PI * 2);
  ctx.fill();
  // Helmet dome
  ctx.fillStyle = flash ? "#ffffff" : colors.bodyDark;
  ctx.beginPath();
  ctx.arc(0, headY - 2, 14, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-14, headY - 4, 28, 5);

  // Sword arm + blade. When attacking, swing the blade forward.
  drawSword(ctx, c, colors, bob, flash);

  ctx.restore();
}

function drawSword(
  ctx: CanvasRenderingContext2D,
  c: Character,
  colors: KnightColors,
  bob: number,
  flash: boolean
) {
  const armY = c.h * -0.55 + bob;
  let swing = -0.5; // resting angle (blade up)
  if (c.state === "attack") {
    const elapsed = c.attackDuration - c.attackTimer;
    if (elapsed < c.attackWindup) {
      // Windup: rear the blade back as a telegraph.
      const t = elapsed / Math.max(1, c.attackWindup);
      swing = lerp(-0.5, -1.7, t);
    } else {
      // Follow-through: sweep the blade down and forward.
      const p = (elapsed - c.attackWindup) / Math.max(1, c.attackDuration - c.attackWindup);
      swing = lerp(-1.7, 0.9, Math.min(1, p));
    }
  }

  ctx.save();
  ctx.translate(14, armY);
  ctx.rotate(swing);

  // Arm
  ctx.strokeStyle = flash ? "#ffffff" : colors.body;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-14, 6);
  ctx.lineTo(6, 0);
  ctx.stroke();

  // Hilt
  ctx.fillStyle = colors.trim;
  ctx.fillRect(2, -3, 8, 6);
  // Blade
  ctx.fillStyle = flash ? "#ffffff" : colors.blade;
  ctx.beginPath();
  ctx.moveTo(10, -4);
  ctx.lineTo(54, -2);
  ctx.lineTo(60, 0);
  ctx.lineTo(54, 2);
  ctx.lineTo(10, 4);
  ctx.closePath();
  ctx.fill();
  // Edge highlight
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(12, -2);
  ctx.lineTo(54, -1);
  ctx.stroke();

  ctx.restore();
}

function drawEnemyHealthBar(ctx: CanvasRenderingContext2D, e: Enemy, screenX: number) {
  if (e.hp >= e.maxHp) return;
  const scale = depthScale(e.y);
  const w = 40;
  const x = screenX - w / 2;
  const y = e.y - e.h * scale - 14;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(x - 1, y - 1, w + 2, 6);
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(x, y, w * (e.hp / e.maxHp), 4);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Keep WORLD_WIDTH referenced for clarity of intent in this module.
void WORLD_WIDTH;
