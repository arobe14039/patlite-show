import { PALETTE, type Clip, type EffectType, type Frame, type Show, type TierState, effectDef } from "./types";

export const OFF: TierState = { on: false, color: "#000000", intensity: 0 };

let idc = 0;
export const uid = () => `c${Date.now().toString(36)}${(idc++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export function makeClip(effect: EffectType, partial: Partial<Clip> = {}): Clip {
  const d = effectDef(effect);
  const base: Clip = {
    id: uid(),
    effect,
    name: d.name,
    tiers: effect === "buzzer" ? [] : [1, 2, 3, 4, 5],
    start: 0,
    duration: 2000,
    color: "#22ff7a",
    color2: "#2f6bff",
    colors: ["#ff2a3d", "#ffe14a", "#22ff7a", "#2f6bff"],
    speed: 250,
    count: 0,
    direction: "up",
    transition: "cut",
    buzzer: "off",
  };
  return { ...base, ...d.defaults, ...partial, id: partial.id ?? base.id };
}

export const showDuration = (show: Show) =>
  Math.max(1000, ...show.clips.map((c) => c.start + c.duration));

function hash(a: number, b: number) {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Evaluate one clip for one tier at local time t (ms from clip start). */
export function evalClip(c: Clip, t: number, tier: number): TierState {
  const sorted = [...(c.effect === "allOn" || c.effect === "allOff" ? [1, 2, 3, 4, 5] : c.tiers)].sort((a, b) => b - a); // "up" runs bottom (tier 5) to top (tier 1)
  if (c.direction === "down") sorted.reverse();
  const idx = Math.max(0, sorted.indexOf(tier));
  const n = Math.max(1, sorted.length);
  const sp = Math.max(30, c.speed);
  const step = Math.floor(t / sp);
  const on = (color: string, intensity = 1): TierState => ({ on: true, color, intensity });

  let s: TierState;
  switch (c.effect) {
    case "solid":
    case "allOn":
      s = on(c.color);
      break;
    case "allOff":
      s = OFF;
      break;
    case "flash": {
      const cycle = Math.floor(t / (sp * 2));
      s = (c.count > 0 && cycle >= c.count) || step % 2 ? OFF : on(c.color);
      break;
    }
    case "double": {
      const p = t % (sp * 4);
      s = p < sp * 0.5 || (p >= sp && p < sp * 1.5) ? on(c.color) : OFF;
      break;
    }
    case "pulse":
      s = on(c.color, 0.15 + 0.85 * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / sp)));
      break;
    case "alternate":
      s = on((step + tier) % 2 ? c.color : c.color2);
      break;
    case "chase":
      s = step % n === idx ? on(c.color) : OFF;
      break;
    case "rainbow":
      s = on(PALETTE[(step + idx) % 7]!.hex);
      break;
    case "fill":
      s = idx < Math.floor((t / c.duration) * n) + 1 ? on(c.color) : OFF;
      break;
    case "drain":
      s = idx >= Math.floor((t / c.duration) * n) ? on(c.color) : OFF;
      break;
    case "sparkle":
      s = hash(step, tier) > 0.55 ? on(c.color) : OFF;
      break;
    case "alarm":
      s = on(step % 2 ? c.color2 : c.color);
      break;
    case "custom": {
      const cols = c.colors.length ? c.colors : [c.color];
      s = on(cols[(step + idx) % cols.length]!);
      break;
    }
    default:
      s = OFF;
  }
  if (c.transition === "fade" && s.on) {
    const f = Math.min(1, t / 200, (c.duration - t) / 200);
    s = { ...s, intensity: s.intensity * Math.max(0, f) };
  }
  return s;
}

const covers = (c: Clip, tier: number) =>
  c.effect === "allOn" || c.effect === "allOff" ? true : c.tiers.includes(tier);

/**
 * Same-tier overlap rule: the clip that started most recently wins.
 * Ties are broken by timeline order (later in list wins).
 */
export function activeClipFor(clips: Clip[], t: number, tier: number): Clip | null {
  let best: Clip | null = null;
  let bestIdx = -1;
  clips.forEach((c, i) => {
    if (c.effect === "buzzer" || !covers(c, tier)) return;
    if (t < c.start || t >= c.start + c.duration) return;
    if (!best || c.start > best.start || (c.start === best.start && i > bestIdx)) {
      best = c;
      bestIdx = i;
    }
  });
  return best;
}

export function frameAt(show: Show, t: number, base?: TierState[]): Frame {
  const tiers = [1, 2, 3, 4, 5].map((tier) => {
    const c = activeClipFor(show.clips, t, tier);
    return c ? evalClip(c, t - c.start, tier) : base?.[tier - 1] ?? OFF;
  });
  let buzzer: Frame["buzzer"] = "off";
  for (const c of show.clips) {
    if (t < c.start || t >= c.start + c.duration) continue;
    if (c.buzzer === "continuous") buzzer = "continuous";
    else if (c.buzzer === "intermittent" && buzzer === "off") buzzer = "intermittent";
  }
  return { tiers, buzzer };
}

/** Returns ids of clips that overlap another clip on at least one shared tier. */
export function findConflicts(clips: Clip[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < clips.length; i++)
    for (let j = i + 1; j < clips.length; j++) {
      const a = clips[i]!, b = clips[j]!;
      if (a.effect === "buzzer" || b.effect === "buzzer") continue;
      const overlap = a.start < b.start + b.duration && b.start < a.start + a.duration;
      if (!overlap) continue;
      if ([1, 2, 3, 4, 5].some((t) => covers(a, t) && covers(b, t))) {
        out.add(a.id);
        out.add(b.id);
      }
    }
  return out;
}

/* ---------- Hardware compilation ---------- */

export const LA6_COLORS: { name: string; hex: string }[] = [
  { name: "red", hex: "#ff0000" },
  { name: "amber", hex: "#ff8a00" },
  { name: "lemon", hex: "#ffe600" },
  { name: "green", hex: "#00ff40" },
  { name: "skyblue", hex: "#00d5ff" },
  { name: "blue", hex: "#0040ff" },
  { name: "purple", hex: "#a000ff" },
  { name: "pink", hex: "#ff30c0" },
  { name: "white", hex: "#ffffff" },
];

const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export function nearestHwColor(hex: string): string {
  const [r, g, b] = rgb(hex);
  let best = LA6_COLORS[0]!, bd = Infinity;
  for (const c of LA6_COLORS) {
    const [R, G, B] = rgb(c.hex);
    const d = (r - R) ** 2 + (g - G) ** 2 + (b - B) ** 2;
    if (d < bd) { bd = d; best = c; }
  }
  return best.name;
}

export interface HwStep {
  at: number; // ms from show start
  tiers: (string | null)[]; // index 0 = tier 1, null = off, else hardware color name
  buzzer: Frame["buzzer"];
}

/**
 * Sample the show at the command interval and collapse to discrete states.
 * Each step merges all five tiers into one command. Identical consecutive
 * states are dropped so we never send redundant requests.
 */
export function compileShow(show: Show, intervalMs: number): HwStep[] {
  const total = showDuration(show);
  const steps: HwStep[] = [];
  let prev = "";
  for (let t = 0; t < total; t += Math.max(50, intervalMs)) {
    const f = frameAt(show, t);
    const step: HwStep = {
      at: t,
      tiers: f.tiers.map((s) => (s.on && s.intensity > 0.35 ? nearestHwColor(s.color) : null)),
      buzzer: f.buzzer,
    };
    const key = JSON.stringify([step.tiers, step.buzzer]);
    if (key !== prev) steps.push(step);
    prev = key;
  }
  steps.push({ at: total, tiers: [null, null, null, null, null], buzzer: "off" });
  return steps;
}
