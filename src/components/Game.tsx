import { useEffect, useRef, useState } from "react";
import { CANVAS_SIZE, GameEngine } from "../game/engine";
import type { GameState } from "../game/types";
import { Hud } from "./Hud";

const EMPTY_HUD: GameState["hud"] = {
  playerHp: 100,
  playerMaxHp: 100,
  playerMana: 100,
  playerMaxMana: 100,
  attackDamage: 34,
  enemiesRemaining: 0,
  progress: 0,
  phase: "playing",
};

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hud, setHud] = useState<GameState["hud"]>(EMPTY_HUD);

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
      <div className="game-frame" style={{ aspectRatio: `${CANVAS_SIZE.width} / ${CANVAS_SIZE.height}` }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE.width}
          height={CANVAS_SIZE.height}
          className="game-canvas"
        />
        <Hud hud={hud} onRestart={() => engineRef.current?.reset()} />
      </div>
      <p className="controls">
        Move <kbd>WASD</kbd> / <kbd>arrows</kbd> &nbsp;·&nbsp; Attack <kbd>Space</kbd> / <kbd>J</kbd>
        &nbsp;·&nbsp; Magic <kbd>K</kbd> / <kbd>L</kbd> &nbsp;·&nbsp; Restart <kbd>R</kbd>
      </p>
    </div>
  );
}
