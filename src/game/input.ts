export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  attackPressed: boolean;
  magicPressed: boolean;
  restartPressed: boolean;
}

export function neutralInput(): InputState {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    attackPressed: false,
    magicPressed: false,
    restartPressed: false,
  };
}

type HeldAction = "left" | "right" | "up" | "down" | "attack" | "magic";

const KEY_MAP: Record<string, HeldAction> = {
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
  KeyK: "magic",
  KeyL: "magic",
};

export class Input {
  private held: Record<HeldAction, boolean> = {
    left: false,
    right: false,
    up: false,
    down: false,
    attack: false,
    magic: false,
  };

  private attackEdge = false;
  private magicEdge = false;
  private restartEdge = false;

  private onKeyDown = (e: KeyboardEvent) => {
    const action = KEY_MAP[e.code];
    if (action) {
      e.preventDefault();
      if (action === "attack" && !this.held.attack) this.attackEdge = true;
      if (action === "magic" && !this.held.magic) this.magicEdge = true;
      this.held[action] = true;
    }
    if (e.code === "Enter" || e.code === "KeyR") this.restartEdge = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const action = KEY_MAP[e.code];
    if (action) {
      e.preventDefault();
      this.held[action] = false;
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

  poll(): InputState {
    const snapshot: InputState = {
      left: this.held.left,
      right: this.held.right,
      up: this.held.up,
      down: this.held.down,
      attackPressed: this.attackEdge,
      magicPressed: this.magicEdge,
      restartPressed: this.restartEdge,
    };
    this.attackEdge = false;
    this.magicEdge = false;
    this.restartEdge = false;
    return snapshot;
  }
}
