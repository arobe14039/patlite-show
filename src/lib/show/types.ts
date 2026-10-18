export type EffectType =
  | "solid" | "flash" | "double" | "pulse" | "alternate" | "chase" | "rainbow"
  | "fill" | "drain" | "sparkle" | "alarm" | "allOn" | "allOff" | "custom" | "buzzer";

export type BuzzerMode = "off" | "continuous" | "intermittent";

export interface Clip {
  id: string;
  effect: EffectType;
  name: string;
  /** Tier numbers 1..5 (1 = bottom). Empty for buzzer-only clips. */
  tiers: number[];
  start: number; // ms
  duration: number; // ms
  color: string; // hex
  color2: string; // secondary hex (alarm / alternate)
  colors: string[]; // sequence for custom
  speed: number; // ms per step / flash interval
  count: number; // flash count, 0 = unlimited
  direction: "up" | "down";
  transition: "cut" | "fade";
  buzzer: BuzzerMode;
}

export const SHOW_SCHEMA = "patlite-show" as const;
export const SHOW_VERSION = 1 as const;

export interface Show {
  schema: typeof SHOW_SCHEMA;
  version: typeof SHOW_VERSION;
  id: string;
  name: string;
  description: string;
  clips: Clip[];
  loop: boolean;
  updatedAt: number;
}

export interface TierState {
  on: boolean;
  color: string;
  intensity: number; // 0..1
}

export interface Frame {
  tiers: TierState[]; // index 0 = tier 1
  buzzer: BuzzerMode;
}

export const TIERS = [1, 2, 3, 4, 5] as const;

export const PALETTE: { name: string; hex: string }[] = [
  { name: "Red", hex: "#ff2a3d" },
  { name: "Amber", hex: "#ff8a00" },
  { name: "Yellow", hex: "#ffe14a" },
  { name: "Green", hex: "#22ff7a" },
  { name: "Blue", hex: "#2f6bff" },
  { name: "White", hex: "#f4f7ff" },
  { name: "Magenta", hex: "#ff2bd6" },
  { name: "Cyan", hex: "#22e6ff" },
];

export interface EffectDef {
  type: EffectType;
  name: string;
  description: string;
  params: Partial<Record<"color" | "color2" | "colors" | "speed" | "count" | "direction" | "tiers" | "buzzer", true>>;
  defaults: Partial<Clip>;
}

export const EFFECTS: EffectDef[] = [
  { type: "solid", name: "Solid color", description: "Steady light on chosen tiers.", params: { color: true, tiers: true }, defaults: { duration: 2000 } },
  { type: "flash", name: "Flash", description: "On/off blink at a set interval.", params: { color: true, speed: true, count: true, tiers: true }, defaults: { speed: 250 } },
  { type: "double", name: "Double flash", description: "Two quick blinks, then a pause.", params: { color: true, speed: true, tiers: true }, defaults: { speed: 200 } },
  { type: "pulse", name: "Pulse", description: "Smooth breathing brightness (software-timed).", params: { color: true, speed: true, tiers: true }, defaults: { speed: 1200 } },
  { type: "alternate", name: "Alternating tiers", description: "Odd and even tiers swap.", params: { color: true, color2: true, speed: true, tiers: true }, defaults: { speed: 300 } },
  { type: "chase", name: "Color chase", description: "Single light travels along the tiers.", params: { color: true, speed: true, direction: true, tiers: true }, defaults: { speed: 150 } },
  { type: "rainbow", name: "Rainbow cycle", description: "Each tier cycles the palette.", params: { speed: true, direction: true, tiers: true }, defaults: { speed: 250 } },
  { type: "fill", name: "Stack fill", description: "Tiers light one by one until full.", params: { color: true, direction: true, tiers: true }, defaults: { duration: 2500 } },
  { type: "drain", name: "Stack drain", description: "Full stack empties one by one.", params: { color: true, direction: true, tiers: true }, defaults: { duration: 2500 } },
  { type: "sparkle", name: "Random sparkle", description: "Random tiers twinkle.", params: { color: true, speed: true, tiers: true }, defaults: { speed: 120 } },
  { type: "alarm", name: "Alarm pattern", description: "Hard alternating two-color alarm.", params: { color: true, color2: true, speed: true, tiers: true, buzzer: true }, defaults: { speed: 200, color: "#ff2a3d", color2: "#ff8a00" } },
  { type: "allOn", name: "All tiers on", description: "Every tier on in one color.", params: { color: true }, defaults: { color: "#f4f7ff" } },
  { type: "allOff", name: "All tiers off", description: "Forces every tier dark.", params: {}, defaults: {} },
  { type: "custom", name: "Custom sequence", description: "Step through your own color list.", params: { colors: true, speed: true, tiers: true }, defaults: { speed: 400 } },
  { type: "buzzer", name: "Buzzer", description: "Sounds the tower buzzer (buzzer track).", params: { buzzer: true }, defaults: { buzzer: "intermittent", duration: 1000 } },
];

export const effectDef = (t: EffectType) => EFFECTS.find((e) => e.type === t)!;
