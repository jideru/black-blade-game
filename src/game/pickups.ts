import {
  FLOOR_BOTTOM,
  FLOOR_TOP,
  PICKUP_HEALTH,
  PICKUP_MANA,
  PICKUP_POWER,
} from "./constants";
import type { Character, Pickup, PickupKind } from "./types";

function make(x: number, yFrac: number, kind: PickupKind): Pickup {
  const y = FLOOR_TOP + 30 + yFrac * (FLOOR_BOTTOM - (FLOOR_TOP + 30));
  return { x, y, kind, phase: Math.random() * Math.PI * 2 };
}

// Hand-placed pickups along the level, so there is always a reason to explore
// the depth of the path rather than hugging one lane.
export function createPickups(): Pickup[] {
  return [
    make(640, 0.85, "mana"),
    make(1180, 0.2, "health"),
    make(1700, 0.9, "power"),
    make(2200, 0.15, "mana"),
    make(2680, 0.85, "health"),
    make(3150, 0.2, "power"),
    make(3700, 0.8, "health"),
  ];
}

// A pickup dropped at a slain enemy's position.
export function dropPickup(x: number, y: number, kind: PickupKind): Pickup {
  return { x, y, kind, phase: Math.random() * Math.PI * 2 };
}

// Apply a pickup's effect to the player. Pure so it can be unit-tested.
export function applyPickup(player: Character, kind: PickupKind) {
  if (kind === "health") {
    player.hp = Math.min(player.maxHp, player.hp + PICKUP_HEALTH);
  } else if (kind === "mana") {
    player.mana = Math.min(player.maxMana, player.mana + PICKUP_MANA);
  } else {
    player.attackDamage += PICKUP_POWER;
  }
}
