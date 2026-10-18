import { makeClip } from "./engine";
import { SHOW_SCHEMA, SHOW_VERSION, type Clip, type EffectType, type Show } from "./types";

const c = (effect: EffectType, start: number, duration: number, p: Partial<Clip> = {}) =>
  makeClip(effect, { start, duration, ...p });

const mk = (id: string, name: string, description: string, clips: Clip[]): Show => ({
  schema: SHOW_SCHEMA, version: SHOW_VERSION, id, name, description, clips, loop: true, updatedAt: 0,
});

export const TEMPLATES: (() => Show)[] = [
  () => mk("tpl-rainbow", "Rainbow Chase", "Palette cycles while a white light chases.", [
    c("rainbow", 0, 4000, { speed: 220 }),
    c("chase", 4000, 3000, { color: "#f4f7ff", speed: 120 }),
    c("rainbow", 7000, 3000, { speed: 120, direction: "down" }),
  ]),
  () => mk("tpl-emergency", "Emergency Alert", "Red/amber alarm with intermittent buzzer.", [
    c("alarm", 0, 4000, { speed: 220, buzzer: "intermittent" }),
    c("flash", 4000, 2000, { color: "#ff2a3d", speed: 120 }),
  ]),
  () => mk("tpl-knight", "Knight Rider Sweep", "Red light sweeping up and down.", [
    c("chase", 0, 1000, { color: "#ff2a3d", speed: 200, name: "Sweep up" }),
    c("chase", 1000, 1000, { color: "#ff2a3d", speed: 200, direction: "down", name: "Sweep down" }),
    c("chase", 2000, 1000, { color: "#ff2a3d", speed: 200, name: "Sweep up" }),
    c("chase", 3000, 1000, { color: "#ff2a3d", speed: 200, direction: "down", name: "Sweep down" }),
  ]),
  () => mk("tpl-wave", "Color Wave", "Colors roll through the stack.", [
    c("custom", 0, 6000, { colors: ["#22e6ff", "#2f6bff", "#ff2bd6", "#2f6bff"], speed: 300, transition: "fade" }),
  ]),
  () => mk("tpl-countdown", "Countdown", "Five tiers drain, one per second, then green.", [
    c("drain", 0, 5000, { color: "#ffe14a", direction: "down" }),
    c("flash", 5000, 2000, { color: "#22ff7a", speed: 150 }),
  ]),
  () => mk("tpl-celebrate", "Celebration", "Sparkles and rainbow bursts.", [
    c("sparkle", 0, 2500, { color: "#ff2bd6", speed: 100 }),
    c("rainbow", 2500, 2500, { speed: 100 }),
    c("sparkle", 5000, 2500, { color: "#ffe14a", speed: 80 }),
  ]),
  () => mk("tpl-loading", "Loading Progress", "Blue fill then green complete.", [
    c("fill", 0, 4000, { color: "#2f6bff" }),
    c("pulse", 4000, 2400, { color: "#22ff7a", speed: 800 }),
  ]),
  () => mk("tpl-startup", "Factory Startup", "Tier test, then steady green.", [
    c("solid", 0, 600, { tiers: [1], color: "#ff2a3d" }),
    c("solid", 600, 600, { tiers: [2], color: "#ff8a00" }),
    c("solid", 1200, 600, { tiers: [3], color: "#ffe14a" }),
    c("solid", 1800, 600, { tiers: [4], color: "#22ff7a" }),
    c("solid", 2400, 600, { tiers: [5], color: "#2f6bff" }),
    c("allOn", 3000, 800, { color: "#f4f7ff" }),
    c("solid", 3800, 2500, { tiers: [3], color: "#22ff7a" }),
  ]),
  () => mk("tpl-critical", "Critical Alarm", "Fast red strobe with continuous buzzer.", [
    c("flash", 0, 5000, { color: "#ff2a3d", speed: 90, buzzer: "continuous" }),
  ]),
  () => mk("tpl-party", "Random Party Mode", "Overlapping sparkle on every tier.", [
    c("sparkle", 0, 6000, { tiers: [1, 3, 5], color: "#22e6ff", speed: 90 }),
    c("sparkle", 0, 6000, { tiers: [2, 4], color: "#ff2bd6", speed: 110 }),
    c("rainbow", 6000, 2000, { speed: 80 }),
  ]),
];

export const defaultShow = () => ({ ...TEMPLATES[7]!(), id: "draft", name: "Untitled show", description: "" });
