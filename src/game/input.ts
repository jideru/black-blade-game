// Tracks which game actions are currently held. We map several physical keys
// onto each logical action so arrows + WASD both work.

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  attack: boolean;
  // edge-triggered: true for one poll after the key goes down
  attackPressed: boolean;
  restartPressed: boolean;
}

const KEY_MAP: Record<string, keyof Omit<InputState, "attackPressed" | "restartPressed">> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  Space: "attack",
  KeyJ: "attack",
};

export class Input {
  private state: InputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    attack: false,
    attackPressed: false,
    restartPressed: false,
  };

  private attackEdge = false;
  private restartEdge = false;

  private onKeyDown = (e: KeyboardEvent) => {
    const action = KEY_MAP[e.code];
    if (action) {
      e.preventDefault();
      if (action === "attack" && !this.state.attack) this.attackEdge = true;
      this.state[action] = true;
    }
    if (e.code === "Enter" || e.code === "KeyR") {
      this.restartEdge = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const action = KEY_MAP[e.code];
    if (action) {
      e.preventDefault();
      this.state[action] = false;
    }
  };

  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  /** Returns the current frame's input, consuming edge-triggered presses. */
  poll(): InputState {
    const snapshot: InputState = {
      ...this.state,
      attackPressed: this.attackEdge,
      restartPressed: this.restartEdge,
    };
    this.attackEdge = false;
    this.restartEdge = false;
    return snapshot;
  }
}
