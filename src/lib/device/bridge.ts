/**
 * Hardware integration: browser -> app server relay (/api/device) -> PATLITE LA6-POE.
 * Encoding lives in ./patlite.ts; timing (show scheduling) runs here in the browser
 * with a single serialized, cancellable loop — never one request per animation frame.
 */
import { withIngress } from "@/lib/ingress";
import { createStore } from "../store";
import { compileShow } from "../show/engine";
import type { Show } from "../show/types";
import { encodeClear, encodeState, type CommandConfig, type TowerState } from "./patlite";

export type Mode = "mock" | "live";

export interface DeviceSettings extends CommandConfig {
  mode: Mode;
  deviceName: string;
  protocol: "http" | "https";
  ip: string;
  port: string;
  timeoutMs: number;
  intervalMs: number;
  safeState: "allOff" | "greenSteady";
  failurePolicy: "stop" | "continue";
  apiVerified: boolean;
}

export const DEFAULT_SETTINGS: DeviceSettings = {
  mode: "mock",
  deviceName: "LA6-POE Line 1",
  protocol: "http",
  ip: "192.168.4.26",
  port: "",
  apiPath: "/api/control",
  colorParam: "color",
  buzzerParam: "buzzer",
  flashParam: "",
  clearParam: "clear",
  buzzerIntermittent: "1",
  buzzerContinuous: "2",
  timeoutMs: 3000,
  intervalMs: 300,
  safeState: "allOff",
  failurePolicy: "stop",
  apiVerified: false,
};

export interface LogEntry {
  id: number;
  at: number;
  kind: "test" | "control" | "show" | "stop";
  url: string;
  summary: string;
  status: number | null;
  ok: boolean;
  ms: number | null;
  error?: string | undefined;
  response?: string | undefined;
}

export type TierCmd = { tier: number; state: "off" | "on" | "flash" | "pulse"; color: string };
export interface ControlCmd {
  tiers: TierCmd[];
  buzzer: { pattern: "off" | "continuous" | "intermittent" };
}

interface DeviceState {
  settings: DeviceSettings;
  connection: "unknown" | "ok" | "error" | "testing";
  lastResponseMs: number | null;
  lastCommand: { label: string; at: number; ok: boolean; status: number | null; error?: string | undefined; mock: boolean } | null;
  log: LogEntry[];
  showRunning: boolean;
  showProgress: number;
}

const LS = "pls.device.v2";
export const device = createStore<DeviceState>({
  settings: DEFAULT_SETTINGS,
  connection: "unknown",
  lastResponseMs: null,
  lastCommand: null,
  log: [],
  showRunning: false,
  showProgress: 0,
});
export const useDevice = device.use;

let hydrated = false;
export function hydrateDevice() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const s = JSON.parse(localStorage.getItem(LS) || "null");
    if (s) device.set({ settings: { ...DEFAULT_SETTINGS, ...s } });
  } catch { /* ignore */ }
}
export function saveSettings(patch: Partial<DeviceSettings>) {
  const settings = { ...device.get().settings, ...patch };
  localStorage.setItem(LS, JSON.stringify(settings));
  device.set({ settings, connection: "unknown" });
}

let logId = 0;
function log(e: Omit<LogEntry, "id" | "at">) {
  device.set((s) => ({ log: [{ ...e, id: ++logId, at: Date.now() }, ...s.log].slice(0, 300) }));
}
export const clearLog = () => device.set({ log: [] });

interface Result { ok: boolean; status: number | null; ms: number; error?: string | undefined }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request(kind: LogEntry["kind"], path: string, query: Record<string, string>, summary: string): Promise<Result> {
  const s = device.get().settings;
  const qs = new URLSearchParams(query).toString();
  const shown = `${s.protocol}://${s.ip}${s.port ? `:${s.port}` : ""}${path}${qs ? `?${qs}` : ""}`;
  const t0 = performance.now();

  if (s.mode === "mock") {
    await sleep(30 + Math.random() * 50);
    const ms = Math.round(performance.now() - t0);
    log({ kind, url: `mock → ${shown}`, summary, status: 200, ok: true, ms });
    return { ok: true, status: 200, ms };
  }

  try {
    const res = await fetch(withIngress("/api/device"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ protocol: s.protocol, host: s.ip, port: s.port, path, query, timeoutMs: s.timeoutMs }),
    });
    const d = (await res.json()) as { ok: boolean; status: number | null; body?: string; error?: string; url?: string };
    const ms = Math.round(performance.now() - t0);
    const error = d.ok ? undefined : d.error || `Tower answered HTTP ${d.status}`;
    log({ kind, url: d.url ?? shown, summary, status: d.status, ok: d.ok, ms, error, response: d.body });
    return { ok: d.ok, status: d.status, ms, error };
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    const error = `App server unreachable: ${(e as Error).message}`;
    log({ kind, url: shown, summary, status: null, ok: false, ms, error });
    return { ok: false, status: null, ms, error };
  }
}

/** Requests the tower's web page root — does not change any lights. */
export async function testConnection() {
  device.set({ connection: "testing" });
  const r = await request("test", "/", {}, "Reach device web interface (no lights activated)");
  device.set({ connection: r.ok ? "ok" : "error", lastResponseMs: r.ms });
  return r;
}

function record(label: string, r: Result) {
  device.set({
    lastResponseMs: r.ms,
    lastCommand: { label, at: Date.now(), ok: r.ok, status: r.status, error: r.error, mock: device.get().settings.mode === "mock" },
  });
}

async function sendState(state: TowerState, kind: LogEntry["kind"], label: string) {
  const s = device.get().settings;
  return request(kind, s.apiPath, encodeState(s, state), label);
}

export async function sendControl(cmd: ControlCmd, label: string) {
  const state: TowerState = {
    tiers: [1, 2, 3, 4, 5].map((t) => {
      const c = cmd.tiers.find((x) => x.tier === t);
      return c && c.state !== "off" ? c.color : null;
    }),
    flash: cmd.tiers.some((t) => t.state === "flash"),
    buzzer: cmd.buzzer.pattern,
  };
  const r = await sendState(state, "control", label);
  record(label, r);
  return r;
}

export const allOffCmd = (): ControlCmd => ({
  tiers: [1, 2, 3, 4, 5].map((tier) => ({ tier, state: "off", color: "red" })),
  buzzer: { pattern: "off" },
});

const safeState = (): TowerState => ({
  tiers: device.get().settings.safeState === "greenSteady" ? [null, null, "green", null, null] : [null, null, null, null, null],
  flash: false,
  buzzer: "off",
});

let runToken = 0;

export async function runShow(show: Show): Promise<Result> {
  const token = ++runToken;
  const s = device.get().settings;
  const steps = compileShow(show, s.intervalMs);
  const total = steps[steps.length - 1]?.at ?? 0;
  device.set({ showRunning: true, showProgress: 0 });
  log({ kind: "show", url: "-", summary: `Start "${show.name}" — ${steps.length} steps over ${(total / 1000).toFixed(1)}s`, status: null, ok: true, ms: null });
  const t0 = performance.now();
  let first: Result | null = null;
  for (const [i, step] of steps.entries()) {
    const wait = step.at - (performance.now() - t0);
    if (wait > 0) await sleep(wait);
    if (token !== runToken) return first ?? { ok: true, status: null, ms: 0 };
    const r = await sendState({ tiers: step.tiers, flash: false, buzzer: step.buzzer }, "show", `Step ${i + 1}/${steps.length} @ ${(step.at / 1000).toFixed(2)}s`);
    first ??= r;
    if (token !== runToken) return r;
    device.set({ showProgress: (i + 1) / steps.length });
    if (!r.ok && s.failurePolicy === "stop") {
      record(`Show "${show.name}" stopped at step ${i + 1}`, r);
      await sendState(safeState(), "stop", "Apply safe state after failure");
      device.set({ showRunning: false });
      return r;
    }
  }
  record(`Show "${show.name}" finished`, first ?? { ok: true, status: null, ms: 0 });
  device.set({ showRunning: false });
  return first ?? { ok: true, status: null, ms: 0 };
}

/** Cancels any pending steps immediately, then applies the safe state. */
export async function stopShow() {
  runToken++;
  device.set({ showRunning: false });
  const s = device.get().settings;
  const r = s.safeState === "allOff"
    ? await request("stop", s.apiPath, encodeClear(s), "Stop show — clear tower")
    : await sendState(safeState(), "stop", "Stop show — safe state");
  record("Stop / safe state", r);
  return r;
}
