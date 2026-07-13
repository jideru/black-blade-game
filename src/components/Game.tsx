import { useEffect, useRef, useState } from "react";
import { VIEW_HEIGHT, VIEW_WIDTH } from "../game/constants";
import { GameEngine } from "../game/engine";
import type { HudState } from "../game/types";
import { buildHud, createWorld } from "../game/world";
import { Hud } from "./Hud";

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hud, setHud] = useState<HudState>(() => buildHud(createWorld()));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GameEngine(canvas, setHud);
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  return (
    <div className="game-shell">
      <div className="game-frame" style={{ aspectRatio: `${VIEW_WIDTH} / ${VIEW_HEIGHT}` }}>
        <canvas ref={canvasRef} width={VIEW_WIDTH} height={VIEW_HEIGHT} className="game-canvas" />
        <Hud hud={hud} onRestart={() => engineRef.current?.reset()} />
      </div>
      <p className="controls">
        Move <kbd>WASD</kbd> / <kbd>arrows</kbd> &nbsp;·&nbsp; Attack <kbd>Space</kbd> / <kbd>J</kbd>
        &nbsp;·&nbsp; Magic <kbd>K</kbd> / <kbd>L</kbd> &nbsp;·&nbsp; Restart <kbd>R</kbd>
      </p>
    </div>
  );
}
