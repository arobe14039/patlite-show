import { createStore } from "../store";
import { makeClip, showDuration, uid } from "./engine";
import { defaultShow } from "./templates";
import { SHOW_SCHEMA, SHOW_VERSION, type Clip, type EffectType, type Show, type TierState } from "./types";

interface StudioState {
  show: Show;
  selectedClipIds: string[];
  selectedTiers: number[];
  base: TierState[]; // manual preview colors when no clip is active
  time: number;
  playing: boolean;
  zoom: number; // px per second
  snap: boolean;
  clipboard: Clip[];
  past: Show[];
  future: Show[];
  dirty: boolean;
  savedShows: Show[];
  presets: Clip[];
  hydrated: boolean;
}

const LS_SHOWS = "pls.shows.v1";
const LS_PRESETS = "pls.presets.v1";
const LS_DRAFT = "pls.draft.v1";

const initialBase: TierState[] = [1, 2, 3, 4, 5].map(() => ({ on: false, color: "#22ff7a", intensity: 1 }));

export const studio = createStore<StudioState>({
  show: defaultShow(),
  selectedClipIds: [],
  selectedTiers: [],
  base: initialBase,
  time: 0,
  playing: false,
  zoom: 90,
  snap: true,
  clipboard: [],
  past: [],
  future: [],
  dirty: false,
  savedShows: [],
  presets: [],
  hydrated: false,
});

export const useStudio = studio.use;
const S = studio;

/* ---------- persistence ---------- */
export function hydrate() {
  if (S.get().hydrated || typeof window === "undefined") return;
  try {
    const shows = JSON.parse(localStorage.getItem(LS_SHOWS) || "[]") as Show[];
    const presets = JSON.parse(localStorage.getItem(LS_PRESETS) || "[]") as Clip[];
    const draft = localStorage.getItem(LS_DRAFT);
    S.set({ savedShows: shows, presets, hydrated: true, ...(draft ? { show: JSON.parse(draft) } : {}) });
  } catch {
    S.set({ hydrated: true });
  }
  S.subscribe(() => {
    const s = S.get();
    localStorage.setItem(LS_DRAFT, JSON.stringify(s.show));
  });
}
const persistShows = (shows: Show[]) => { localStorage.setItem(LS_SHOWS, JSON.stringify(shows)); S.set({ savedShows: shows }); };
const persistPresets = (p: Clip[]) => { localStorage.setItem(LS_PRESETS, JSON.stringify(p)); S.set({ presets: p }); };

/* ---------- editing with history ---------- */
export function checkpoint() {
  S.set((s) => ({ past: [...s.past.slice(-80), s.show], future: [] }));
}
export function mutate(fn: (clips: Clip[]) => Clip[], history = true) {
  if (history) checkpoint();
  S.set((s) => ({ show: { ...s.show, clips: fn(s.show.clips) }, dirty: true }));
}
export const updateClip = (id: string, patch: Partial<Clip>, history = true) =>
  mutate((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)), history);

export function undo() {
  const { past, show, future } = S.get();
  if (!past.length) return;
  S.set({ show: past[past.length - 1], past: past.slice(0, -1), future: [show, ...future], dirty: true });
}
export function redo() {
  const { past, show, future } = S.get();
  if (!future.length) return;
  S.set({ show: future[0], future: future.slice(1), past: [...past, show], dirty: true });
}

export function addClip(effect: EffectType, start: number, tier?: number, preset?: Clip) {
  const clip = preset
    ? { ...preset, id: uid(), start }
    : makeClip(effect, { start, ...(tier && effect !== "allOn" && effect !== "allOff" && effect !== "buzzer" ? { tiers: [tier] } : {}) });
  mutate((cs) => [...cs, clip]);
  S.set({ selectedClipIds: [clip.id] });
}
export function deleteSelected() {
  const ids = S.get().selectedClipIds;
  if (!ids.length) return;
  mutate((cs) => cs.filter((c) => !ids.includes(c.id)));
  S.set({ selectedClipIds: [] });
}
export function duplicateSelected() {
  const { selectedClipIds, show } = S.get();
  const src = show.clips.filter((c) => selectedClipIds.includes(c.id));
  if (!src.length) return;
  const copies = src.map((c) => ({ ...c, id: uid(), start: c.start + c.duration }));
  mutate((cs) => [...cs, ...copies]);
  S.set({ selectedClipIds: copies.map((c) => c.id) });
}
export function copySelected() {
  const { selectedClipIds, show } = S.get();
  S.set({ clipboard: show.clips.filter((c) => selectedClipIds.includes(c.id)) });
}
export function paste() {
  const { clipboard, time } = S.get();
  if (!clipboard.length) return;
  const min = Math.min(...clipboard.map((c) => c.start));
  const copies = clipboard.map((c) => ({ ...c, id: uid(), start: Math.round(time + c.start - min) }));
  mutate((cs) => [...cs, ...copies]);
  S.set({ selectedClipIds: copies.map((c) => c.id) });
}
export function selectClip(id: string, additive = false) {
  S.set((s) => ({
    selectedClipIds: additive
      ? s.selectedClipIds.includes(id) ? s.selectedClipIds.filter((x) => x !== id) : [...s.selectedClipIds, id]
      : [id],
  }));
}
export function toggleTier(tier: number, additive: boolean) {
  S.set((s) => ({
    selectedTiers: additive
      ? s.selectedTiers.includes(tier) ? s.selectedTiers.filter((t) => t !== tier) : [...s.selectedTiers, tier]
      : s.selectedTiers.length === 1 && s.selectedTiers[0] === tier ? [] : [tier],
  }));
}
export function setBaseTiers(tiers: number[], patch: Partial<TierState>) {
  S.set((s) => ({ base: s.base.map((b, i) => (tiers.includes(i + 1) ? { ...b, ...patch } : b)) }));
}

/* ---------- playback ---------- */
let raf = 0;
let last = 0;
function tick(now: number) {
  const s = S.get();
  if (!s.playing) return;
  const total = showDuration(s.show);
  let t = s.time + (now - last);
  last = now;
  if (t >= total) {
    if (s.show.loop) t = t % total;
    else { S.set({ time: total, playing: false }); return; }
  }
  S.set({ time: t });
  raf = requestAnimationFrame(tick);
}
export function play() {
  if (S.get().playing) return;
  const s = S.get();
  if (s.time >= showDuration(s.show)) S.set({ time: 0 });
  S.set({ playing: true });
  last = performance.now();
  raf = requestAnimationFrame(tick);
}
export function pause() { cancelAnimationFrame(raf); S.set({ playing: false }); }
export function stop() { pause(); S.set({ time: 0 }); }
export function restart() { S.set({ time: 0 }); play(); }
export const seek = (t: number) => S.set({ time: Math.max(0, t) });

/* ---------- show library ---------- */
export function loadShow(show: Show, opts: { play?: boolean } = {}) {
  stop();
  S.set({ show: structuredClone(show), past: [], future: [], selectedClipIds: [], dirty: false });
  if (opts.play) play();
}
export function saveCurrent(name?: string, description?: string) {
  const s = S.get();
  const isTpl = s.show.id.startsWith("tpl-") || s.show.id === "draft";
  const show: Show = {
    ...s.show,
    id: isTpl ? `show-${uid()}` : s.show.id,
    name: name ?? s.show.name,
    description: description ?? s.show.description,
    updatedAt: Date.now(),
  };
  const exists = s.savedShows.some((x) => x.id === show.id);
  persistShows(exists ? s.savedShows.map((x) => (x.id === show.id ? show : x)) : [show, ...s.savedShows]);
  S.set({ show, dirty: false });
  return show;
}
export const renameShow = (id: string, name: string) =>
  persistShows(S.get().savedShows.map((x) => (x.id === id ? { ...x, name, updatedAt: Date.now() } : x)));
export const deleteShow = (id: string) => persistShows(S.get().savedShows.filter((x) => x.id !== id));
export const duplicateShow = (show: Show) =>
  persistShows([{ ...structuredClone(show), id: `show-${uid()}`, name: `${show.name} copy`, updatedAt: Date.now() }, ...S.get().savedShows]);

export function exportShow(show: Show) {
  const blob = new Blob([JSON.stringify(show, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${show.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.patlite.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function parseShowFile(text: string): Show {
  const d = JSON.parse(text);
  if (d?.schema !== SHOW_SCHEMA) throw new Error("Not a PATLITE show file (missing schema).");
  if (d.version !== SHOW_VERSION) throw new Error(`Unsupported show version ${d.version}.`);
  if (!Array.isArray(d.clips)) throw new Error("Show file has no clips.");
  for (const c of d.clips) {
    if (typeof c.start !== "number" || typeof c.duration !== "number" || !Array.isArray(c.tiers))
      throw new Error("A clip in this file is malformed.");
  }
  return { ...d, id: `show-${uid()}`, updatedAt: Date.now() };
}
export function importShow(show: Show) {
  persistShows([show, ...S.get().savedShows]);
}

export function savePreset(clip: Clip, name: string) {
  persistPresets([{ ...clip, id: uid(), name, start: 0 }, ...S.get().presets]);
}
export const deletePreset = (id: string) => persistPresets(S.get().presets.filter((p) => p.id !== id));
