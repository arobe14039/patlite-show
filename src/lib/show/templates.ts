import { makeClip } from "./engine";
import { SHOW_SCHEMA, SHOW_VERSION, type Clip, type EffectType, type Show } from "./types";

const c = (effect: EffectType, start: number, duration: number, p: Partial<Clip> = {}) =>
  makeClip(effect, { start, duration, ...p });

const mk = (id: string, name: string, description: string, clips: Clip[]): Show => ({
  schema: SHOW_SCHEMA, version: SHOW_VERSION, id, name, description, clips, loop: true, updatedAt: 0,
});

// Tower-safe presets: every light change is at least 1 second apart, so the
// tower gets at most about one command per second. No fades or fast strobes.
export const TEMPLATES: (() => Show)[] = [
  () => mk("tpl-rainbow", "Rainbow Chase", "Slow palette roll, then a white light climbs.", [
    c("rainbow", 0, 6000, { speed: 1200 }),
    c("chase", 6000, 5000, { color: "#f4f7ff", speed: 1000 }),
  ]),
  () => mk("tpl-emergency", "Emergency Alert", "Red/amber swap every 1.2s with intermittent buzzer.", [
    c("alarm", 0, 6000, { speed: 1200, buzzer: "intermittent" }),
    c("solid", 6000, 3000, { color: "#ff2a3d" }),
  ]),
  () => mk("tpl-knight", "Knight Rider Sweep", "Red light stepping up and down once per second.", [
    c("chase", 0, 5000, { color: "#ff2a3d", speed: 1000, name: "Sweep up" }),
    c("chase", 5000, 5000, { color: "#ff2a3d", speed: 1000, direction: "down", name: "Sweep down" }),
  ]),
  () => mk("tpl-wave", "Color Wave", "Colors roll gently through the stack.", [
    c("custom", 0, 8000, { colors: ["#22e6ff", "#2f6bff", "#ff2bd6", "#2f6bff"], speed: 1500 }),
  ]),
  () => mk("tpl-countdown", "Countdown", "Five tiers drain, one per second, then green.", [
    c("drain", 0, 5000, { color: "#ffe14a", direction: "down" }),
    c("flash", 5000, 4000, { color: "#22ff7a", speed: 1000 }),
  ]),
  () => mk("tpl-celebrate", "Celebration", "Slow sparkle and rainbow.", [
    c("sparkle", 0, 4000, { color: "#ff2bd6", speed: 1000 }),
    c("rainbow", 4000, 4000, { speed: 1000 }),
  ]),
  () => mk("tpl-loading", "Loading Progress", "Blue fill then steady green.", [
    c("fill", 0, 5000, { color: "#2f6bff" }),
    c("solid", 5000, 3000, { color: "#22ff7a" }),
  ]),
  () => mk("tpl-startup", "Factory Startup", "Tier test, then steady green.", [
    c("solid", 0, 1000, { tiers: [1], color: "#ff2a3d" }),
    c("solid", 1000, 1000, { tiers: [2], color: "#ff8a00" }),
    c("solid", 2000, 1000, { tiers: [3], color: "#ffe14a" }),
    c("solid", 3000, 1000, { tiers: [4], color: "#22ff7a" }),
    c("solid", 4000, 1000, { tiers: [5], color: "#2f6bff" }),
    c("allOn", 5000, 1500, { color: "#f4f7ff" }),
    c("solid", 6500, 3000, { tiers: [3], color: "#22ff7a" }),
  ]),
  () => mk("tpl-critical", "Critical Alarm", "Red on/off every second with continuous buzzer.", [
    c("flash", 0, 6000, { color: "#ff2a3d", speed: 1000, buzzer: "continuous" }),
  ]),
  () => mk("tpl-party", "Random Party Mode", "Gentle sparkle on every tier.", [
    c("sparkle", 0, 6000, { tiers: [1, 3, 5], color: "#22e6ff", speed: 1200 }),
    c("sparkle", 0, 6000, { tiers: [2, 4], color: "#ff2bd6", speed: 1200 }),
    c("rainbow", 6000, 3000, { speed: 1000 }),
  ]),
];

export const defaultShow = () => ({ ...TEMPLATES[7]!(), id: "draft", name: "Untitled show", description: "" });
