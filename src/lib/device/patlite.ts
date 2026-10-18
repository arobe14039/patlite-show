/**
 * PATLITE LA6-POE HTTP command encoding.
 * Based on PATLITE's published example: /api/control?color=46091&buzzer=11
 * (5 digits = tiers 1..5; 0 off, 1 red, 2 amber, 3 lemon, 4 green, 5 sky blue,
 * 6 blue, 7 purple, 8 pink, 9 white). Parameter names and buzzer/flash values
 * are configurable because they must be verified against your device manual.
 */
export const COLOR_DIGITS: Record<string, string> = {
  red: "1", amber: "2", lemon: "3", green: "4", skyblue: "5", blue: "6", purple: "7", pink: "8", white: "9",
};

export interface CommandConfig {
  apiPath: string;
  colorParam: string;
  buzzerParam: string;
  flashParam: string; // empty = never send
  clearParam: string;
  buzzerIntermittent: string;
  buzzerContinuous: string;
}

export interface TowerState {
  tiers: (string | null)[]; // index 0 = tier 1; hardware color name or null = off
  flash: boolean;
  buzzer: "off" | "intermittent" | "continuous";
}

export function encodeState(cfg: CommandConfig, s: TowerState): Record<string, string> {
  const q: Record<string, string> = {
    [cfg.colorParam]: [0, 1, 2, 3, 4].map((i) => (s.tiers[i] ? COLOR_DIGITS[s.tiers[i]!] ?? "0" : "0")).join(""),
    [cfg.buzzerParam]: s.buzzer === "off" ? "0" : s.buzzer === "continuous" ? cfg.buzzerContinuous : cfg.buzzerIntermittent,
  };
  if (cfg.flashParam) q[cfg.flashParam] = s.flash ? "1" : "0";
  return q;
}

export const encodeClear = (cfg: CommandConfig) => ({ [cfg.clearParam]: "1" });
