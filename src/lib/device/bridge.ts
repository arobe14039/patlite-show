/**
 * Hardware integration adapter.
 * Frontend -> Node-RED bridge -> PATLITE LA6-POE.
 * All PATLITE-specific encoding lives in the Node-RED flow; this file only
 * speaks the documented bridge contract (see Device Settings page).
 */
import { createStore } from "../store";
import { compileShow, type HwStep } from "../show/engine";
import type { Show } from "../show/types";

export type Mode = "mock" | "live";

export interface DeviceSettings {
  mode: Mode;
  deviceName: string;
  ip: string;
  port: string;
  apiPath: string;
  bridgeUrl: string;
  healthPath: string;
  controlPath: string;
  showPath: string;
  stopPath: string;
  authToken: string;
  timeoutMs: number;
  intervalMs: number;
  safeState: "allOff" | "greenSteady";
  failurePolicy: "stop" | "continue";
  apiVerified: boolean;
}

export const DEFAULT_SETTINGS: DeviceSettings = {
  mode: "mock",
  deviceName: "LA6-POE Line 1",
  ip: "192.168.4.26",
  port: "80",
  apiPath: "/api/control",
  bridgeUrl: "http://localhost:1880",
  healthPath: "/patlite/health",
  controlPath: "/patlite/control",
  showPath: "/patlite/show",
  stopPath: "/patlite/stop",
  authToken: "",
  timeoutMs: 3000,
  intervalMs: 250,
  safeState: "allOff",
  failurePolicy: "stop",
  apiVerified: false,
};

export interface LogEntry {
  id: number;
  at: number;
  kind: "test" | "control" | "show" | "stop" | "info";
  method: string;
  url: string;
  summary: string;
  status: number | null;
  ok: boolean;
  ms: number | null;
  error?: string | undefined;
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

const LS = "pls.device.v1";
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

const join = (base: string, path: string) => base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");

interface Result { ok: boolean; status: number | null; ms: number; body?: unknown; error?: string | undefined }

async function request(kind: LogEntry["kind"], method: "GET" | "POST", path: string, summary: string, body?: unknown): Promise<Result> {
  const s = device.get().settings;
  const url = join(s.bridgeUrl, path);
  const t0 = performance.now();

  if (s.mode === "mock") {
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 60));
    const ms = Math.round(performance.now() - t0);
    log({ kind, method, url: `mock://${path}`, summary, status: 200, ok: true, ms });
    return { ok: true, status: 200, ms, body: { ok: true, mock: true } };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), s.timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(s.authToken ? { Authorization: `Bearer ${s.authToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : null,
    });
    const ms = Math.round(performance.now() - t0);
    let parsed: unknown = null;
    try { parsed = await res.json(); } catch { /* non-json */ }
    const bridgeOk = res.ok && !(parsed && typeof parsed === "object" && (parsed as { ok?: boolean }).ok === false);
    const error = bridgeOk ? undefined : (parsed as { error?: string })?.error || `HTTP ${res.status} ${res.statusText}`;
    log({ kind, method, url, summary, status: res.status, ok: bridgeOk, ms, error });
    return { ok: bridgeOk, status: res.status, ms, body: parsed, error };
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    const error =
      (e as Error).name === "AbortError"
        ? `Timed out after ${s.timeoutMs} ms — is Node-RED reachable at ${s.bridgeUrl}?`
        : `Network error: ${(e as Error).message}. Check the bridge URL, CORS headers on the Node-RED http-in node, and that this browser is on the same network.`;
    log({ kind, method, url, summary, status: null, ok: false, ms, error });
    return { ok: false, status: null, ms, error };
  } finally {
    clearTimeout(timer);
  }
}

export async function testConnection() {
  device.set({ connection: "testing" });
  const r = await request("test", "GET", device.get().settings.healthPath, "Health check (no lights activated)");
  device.set({ connection: r.ok ? "ok" : "error", lastResponseMs: r.ms });
  return r;
}

function record(label: string, r: Result) {
  device.set({
    lastResponseMs: r.ms,
    lastCommand: { label, at: Date.now(), ok: r.ok, status: r.status, error: r.error, mock: device.get().settings.mode === "mock" },
  });
}

export async function sendControl(cmd: ControlCmd, label: string) {
  const r = await request("control", "POST", device.get().settings.controlPath, label, { type: "control", ...cmd });
  record(label, r);
  return r;
}

export const allOffCmd = (): ControlCmd => ({
  tiers: [1, 2, 3, 4, 5].map((tier) => ({ tier, state: "off", color: "red" })),
  buzzer: { pattern: "off" },
});

let mockTimers: ReturnType<typeof setTimeout>[] = [];

export async function runShow(show: Show) {
  const s = device.get().settings;
  const steps: HwStep[] = compileShow(show, s.intervalMs);
  const total = steps[steps.length - 1]?.at ?? 0;
  device.set({ showRunning: true, showProgress: 0 });
  const r = await request("show", "POST", s.showPath, `Run "${show.name}" (${steps.length} steps, ${(total / 1000).toFixed(1)}s)`, {
    type: "show",
    schema: show.schema,
    version: show.version,
    name: show.name,
    intervalMs: s.intervalMs,
    failurePolicy: s.failurePolicy,
    safeState: s.safeState,
    steps,
  });
  record(`Run show "${show.name}"`, r);
  if (!r.ok) {
    device.set({ showRunning: false });
    return r;
  }
  // Track progress locally (bridge executes timing).
  mockTimers.forEach(clearTimeout);
  const t0 = Date.now();
  mockTimers = [
    setTimeout(() => device.set({ showRunning: false, showProgress: 1 }), total),
    ...Array.from({ length: 20 }, (_, i) => setTimeout(() => device.set({ showProgress: (Date.now() - t0) / Math.max(1, total) }), (total * i) / 20)),
  ];
  return r;
}

export async function stopShow() {
  mockTimers.forEach(clearTimeout);
  mockTimers = [];
  const s = device.get().settings;
  const r = await request("stop", "POST", s.stopPath, `Stop show & apply safe state (${s.safeState})`, {
    type: "stop",
    safeState: s.safeState,
  });
  device.set({ showRunning: false });
  record("Stop / safe state", r);
  return r;
}
