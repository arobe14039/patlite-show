import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clearLog, saveSettings, testConnection, useDevice, type DeviceSettings } from "@/lib/device/bridge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Device Settings — PATLITE Light Show Studio" },
      { name: "description", content: "Configure the Node-RED bridge, test connectivity and inspect diagnostics." },
      { property: "og:title", content: "Device Settings — PATLITE Light Show Studio" },
      { property: "og:description", content: "Bridge configuration, connection test and diagnostics console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const settings = useDevice((s) => s.settings);
  const connection = useDevice((s) => s.connection);
  const lastMs = useDevice((s) => s.lastResponseMs);
  const last = useDevice((s) => s.lastCommand);
  const log = useDevice((s) => s.log);
  const [f, setF] = useState<DeviceSettings>(settings);
  useEffect(() => setF(settings), [settings]);
  const dirty = JSON.stringify(f) !== JSON.stringify(settings);
  const field = (k: keyof DeviceSettings, label: string, opts: { type?: string; mono?: boolean; hint?: string } = {}) => (
    <div className="space-y-1.5">
      <Label className="label-xs">{label}</Label>
      <Input type={opts.type ?? "text"} value={String(f[k])} onChange={(e) => setF({ ...f, [k]: opts.type === "number" ? +e.target.value : e.target.value })} className={cn("h-9", opts.mono && "font-mono text-sm")} />
      {opts.hint && <p className="text-[11px] text-muted-foreground">{opts.hint}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Device Settings</h1>
          <p className="text-sm text-muted-foreground">Frontend → Node-RED bridge → PATLITE LA6-POE</p>
        </div>
        <div className="flex gap-2">
          <Button variant="panel" onClick={async () => { const r = await testConnection(); r.ok ? toast.success(`Bridge reachable (${r.ms} ms)`) : toast.error(r.error); }} disabled={connection === "testing" || dirty}>
            <Activity /> Test Connection
          </Button>
          <Button variant="glow" disabled={!dirty} onClick={() => { saveSettings(f); toast.success("Settings saved"); }}><Save /> Save</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Integration mode", settings.mode === "live" ? "LIVE" : "MOCK", settings.mode === "live" ? "text-live" : "text-sim"],
          ["Connection", connection, connection === "ok" ? "text-ok" : connection === "error" ? "text-destructive" : "text-muted-foreground"],
          ["Last response", lastMs != null ? `${lastMs} ms` : "—", ""],
          ["Last command", last ? `${last.ok ? "OK" : "FAILED"} · ${last.label}` : "—", last ? (last.ok ? "text-ok" : "text-destructive") : ""],
        ].map(([k, v, c]) => (
          <div key={k} className="rounded-lg border border-border bg-panel p-4">
            <div className="label-xs">{k}</div>
            <div className={cn("mt-1 truncate font-mono text-sm uppercase", c)}>{v}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-lg border border-border bg-panel p-5">
          <div className="label-xs">Mode & safety</div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div><div className="text-sm font-medium">Live mode</div><div className="text-xs text-muted-foreground">Off = all commands go to the mock adapter.</div></div>
            <Switch checked={f.mode === "live"} onCheckedChange={(v) => setF({ ...f, mode: v ? "live" : "mock" })} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div><div className="text-sm font-medium">PATLITE command mapping verified</div><div className="text-xs text-muted-foreground">Tick once your Node-RED flow is checked against the LA6-POE manual.</div></div>
            <Switch checked={f.apiVerified} onCheckedChange={(v) => setF({ ...f, apiVerified: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="label-xs">Default safe state</Label>
              <Select value={f.safeState} onValueChange={(v) => setF({ ...f, safeState: v as DeviceSettings["safeState"] })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="allOff">All off</SelectItem><SelectItem value="greenSteady">Green steady</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="label-xs">On command failure</Label>
              <Select value={f.failurePolicy} onValueChange={(v) => setF({ ...f, failurePolicy: v as DeviceSettings["failurePolicy"] })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="stop">Stop show + safe state</SelectItem><SelectItem value="continue">Skip step, continue</SelectItem></SelectContent>
              </Select>
            </div>
            {field("timeoutMs", "Request timeout (ms)", { type: "number", mono: true })}
            {field("intervalMs", "Command interval (ms)", { type: "number", mono: true, hint: "Minimum gap between hardware steps." })}
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-panel p-5">
          <div className="label-xs">Bridge & device</div>
          <div className="grid grid-cols-2 gap-3">
            {field("bridgeUrl", "Node-RED base URL", { mono: true })}
            {field("authToken", "Bridge auth token", { type: "password", mono: true, hint: "Sent as Bearer header. Never logged." })}
            {field("healthPath", "Health path", { mono: true })}
            {field("controlPath", "Control path", { mono: true })}
            {field("showPath", "Show path", { mono: true })}
            {field("stopPath", "Stop path", { mono: true })}
            {field("deviceName", "Device name")}
            {field("ip", "PATLITE IP", { mono: true })}
            {field("port", "HTTP port", { mono: true, hint: "Not 10000 — that port isn't HTTP." })}
            {field("apiPath", "Device API path", { mono: true, hint: "Used by your Node-RED flow; verify in manual." })}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-panel">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="label-xs">Diagnostics console</div>
          <Button size="sm" variant="ghost" onClick={clearLog}><Trash2 /> Clear</Button>
        </div>
        <div className="max-h-80 overflow-auto bg-background/60 p-3 font-mono text-xs">
          {log.length === 0 && <div className="text-muted-foreground">No requests yet.</div>}
          {log.map((l) => (
            <div key={l.id} className="grid grid-cols-[80px_60px_50px_1fr] gap-2 border-b border-border/40 py-1">
              <span className="text-muted-foreground">{new Date(l.at).toLocaleTimeString()}</span>
              <span className={l.ok ? "text-ok" : "text-destructive"}>{l.status ?? "ERR"}</span>
              <span className="text-muted-foreground">{l.ms}ms</span>
              <span className="min-w-0">
                <span className="text-sim">{l.method}</span> {l.url} — {l.summary}
                {l.error && <div className="text-destructive">{l.error}</div>}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-panel p-5 text-sm">
        <div className="label-xs mb-3">Expected Node-RED bridge contract</div>
        <p className="mb-3 text-muted-foreground">Build these http-in endpoints in Node-RED (enable CORS for this site). The flow translates abstract states into verified LA6-POE commands, rate-limits, and schedules steps. All responses: <code className="text-primary">{"{ ok: boolean, error?: string, deviceStatus?: number }"}</code>.</p>
        <pre className="overflow-auto rounded-md bg-background p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">{`GET  {health}   → checks bridge (+ optionally device reachability). Must NOT change lights.

POST {control}  { "type":"control",
                  "tiers":[{"tier":1,"state":"off|on|flash|pulse","color":"red|amber|lemon|green|skyblue|blue|purple|pink|white"}],
                  "buzzer":{"pattern":"off|intermittent|continuous"} }

POST {show}     { "type":"show","schema":"patlite-show","version":1,"name":"…",
                  "intervalMs":250,"failurePolicy":"stop|continue","safeState":"allOff|greenSteady",
                  "steps":[{"at":0,"tiers":["red",null,null,"green",null],"buzzer":"off"}] }
                  tiers index 0 = tier 1 (bottom); null = off. Reject if a show is already running.

POST {stop}     { "type":"stop","safeState":"allOff" }  → cancel pending steps, apply safe state.`}</pre>
      </section>
    </div>
  );
}
