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

export function render(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  drawBackground(ctx, state.camX);

  // Draw characters back-to-front (smaller y first) for correct overlap.
  const drawables: Character[] = [state.player, ...state.enemies];
  drawables.sort((a, b) => a.y - b.y);

  for (const c of drawables) {
    const screenX = c.x - state.camX;
    if (screenX < -120 || screenX > VIEW_WIDTH + 120) continue;
    if (c === state.player) {
      drawKnight(ctx, c, screenX, PLAYER_COLORS, false);
    } else {
      const e = c as Enemy;
      drawKnight(ctx, e, screenX, ENEMY_COLORS, e.flashTimer > 0);
      if (e.state !== "dead") drawEnemyHealthBar(ctx, e, screenX);
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

  // Ground band
  ctx.fillStyle = "#3b2c22";
  ctx.fillRect(0, FLOOR_TOP, VIEW_WIDTH, VIEW_HEIGHT - FLOOR_TOP);
  const grnd = ctx.createLinearGradient(0, FLOOR_TOP, 0, VIEW_HEIGHT);
  grnd.addColorStop(0, "#5a4632");
  grnd.addColorStop(1, "#2c2018");
  ctx.fillStyle = grnd;
  ctx.fillRect(0, FLOOR_TOP, VIEW_WIDTH, VIEW_HEIGHT - FLOOR_TOP);

  // Path stripes for a sense of scrolling
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 2;
  const spacing = 120;
  const offset = -((camX * 0.9) % spacing);
  for (let x = offset; x < VIEW_WIDTH; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, FLOOR_TOP);
    ctx.lineTo(x - 40, VIEW_HEIGHT);
    ctx.stroke();
  }

  // Back wall edge line
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, FLOOR_TOP);
  ctx.lineTo(VIEW_WIDTH, FLOOR_TOP);
  ctx.stroke();

  drawTrees(ctx, camX);
  drawLevelEnd(ctx, camX);
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
    // Progress 0..1 across the swing, blade sweeps from up to forward.
    const p = 1 - c.attackTimer / 18;
    swing = lerp(-1.4, 0.9, Math.min(1, p * 1.4));
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
