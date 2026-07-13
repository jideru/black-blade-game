import type { HudState } from "../game/types";

interface Props {
  hud: HudState;
  onRestart: () => void;
}

export function Hud({ hud, onRestart }: Props) {
  const hpPct = Math.max(0, (hud.playerHp / hud.playerMaxHp) * 100);
  const manaPct = Math.max(0, (hud.playerMana / hud.playerMaxMana) * 100);

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-panel">
          <div className="hud-label">WARRIOR</div>
          <div className="hp-bar">
            <div className="hp-fill" style={{ width: `${hpPct}%` }} />
          </div>
          <div className="mana-bar">
            <div className="mana-fill" style={{ width: `${manaPct}%` }} />
          </div>
        </div>
        <div className="hud-panel hud-right">
          <div className="hud-label">PWR</div>
          <div className="hud-value">{Math.round(hud.attackDamage)}</div>
        </div>
        <div className="hud-panel hud-right">
          <div className="hud-label">ENEMIES</div>
          <div className="hud-value">{hud.enemiesRemaining}</div>
        </div>
      </div>

      {hud.boss && (
        <div className={`boss-bar ${hud.boss.enraged ? "enraged" : ""}`}>
          <div className="boss-label">
            {hud.boss.enraged ? "⚔ THE GATE WARDEN — ENRAGED ⚔" : "THE GATE WARDEN"}
          </div>
          <div className="boss-hp">
            <div
              className="boss-hp-fill"
              style={{ width: `${(hud.boss.hp / hud.boss.maxHp) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="progress">
        <div className="progress-fill" style={{ width: `${hud.progress * 100}%` }} />
        <div className="progress-flag" style={{ left: `${hud.progress * 100}%` }}>
          🛡️
        </div>
      </div>

      {hud.phase !== "playing" && (
        <div className="overlay">
          <div className={`overlay-card ${hud.phase}`}>
            <h1>{hud.phase === "won" ? "LEVEL CLEARED" : "YOU FELL"}</h1>
            <p>
              {hud.phase === "won"
                ? "The Black Blade carves a path to the gate."
                : "The warrior has fallen in battle."}
            </p>
            <button onClick={onRestart}>Play again (R)</button>
          </div>
        </div>
      )}
    </div>
  );
}
