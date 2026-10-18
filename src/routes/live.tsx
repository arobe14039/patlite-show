import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { OctagonX, Power, PowerOff, Send, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tower } from "@/components/studio/Tower";
import { allOffCmd, saveSettings, sendControl, stopShow, useDevice, type ControlCmd, type TierCmd } from "@/lib/device/bridge";
import { LA6_COLORS } from "@/lib/show/engine";
import { stop } from "@/lib/show/studio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Control — PATLITE Light Show Studio" },
      { name: "description", content: "Manually control each tier and the buzzer of the physical LA6-POE tower." },
      { property: "og:title", content: "Live Control — PATLITE Light Show Studio" },
      { property: "og:description", content: "Manual tier, pattern and buzzer control for the tower." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Live,
});

const hexOf = (n: string) => LA6_COLORS.find((c) => c.name === n)?.hex ?? "#fff";

function Live() {
  const settings = useDevice((s) => s.settings);
  const last = useDevice((s) => s.lastCommand);
  const live = settings.mode === "live";
  const [tiers, setTiers] = useState<TierCmd[]>([1, 2, 3, 4, 5].map((tier) => ({ tier, state: "off", color: ["red", "amber", "lemon", "green", "blue"][tier - 1]! })));
  const [buzzer, setBuzzer] = useState<ControlCmd["buzzer"]["pattern"]>("off");
  const [confirm, setConfirm] = useState<null | { cmd: ControlCmd; label: string }>(null);
  const [busy, setBusy] = useState(false);

  const setT = (tier: number, p: Partial<TierCmd>) => setTiers((ts) => ts.map((t) => (t.tier === tier ? { ...t, ...p } : t)));

  const send = async (cmd: ControlCmd, label: string, disruptive = false) => {
    if (disruptive) { setConfirm({ cmd, label }); return; }
    setBusy(true);
    const r = await sendControl(cmd, label);
    setBusy(false);
    r.ok ? toast.success(`${label}: accepted (HTTP ${r.status})`) : toast.error(`${label}: ${r.error}`);
  };
  const current = (): ControlCmd => ({ tiers, buzzer: { pattern: buzzer } });
  const isDisruptive = (c: ControlCmd) => c.buzzer.pattern !== "off" || c.tiers.filter((t) => t.state === "flash" && t.color === "red").length >= 3;

  const preview = tiers.map((t) => ({ on: t.state !== "off", color: hexOf(t.color), intensity: t.state === "pulse" ? 0.6 : 1 }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className={cn("flex flex-wrap items-center gap-4 rounded-lg border p-4", live ? "border-live/60 bg-live/10" : "border-sim/40 bg-sim/10")}>
        <div className="flex-1">
          <div className={cn("font-mono text-xs font-bold uppercase tracking-widest", live ? "text-live" : "text-sim")}>{live ? "Live mode — commands reach the physical tower" : "Mock mode — nothing is sent to hardware"}</div>
          <p className="mt-1 text-sm text-muted-foreground">{live ? `Direct HTTP to ${settings.ip}${settings.port ? `:${settings.port}` : ""}${settings.apiPath}` : "Commands go to the built-in mock adapter so you can test safely."}</p>
        </div>
        <Button variant={live ? "panel" : "live"} onClick={() => saveSettings({ mode: live ? "mock" : "live" })}>{live ? "Switch to mock" : "Switch to live"}</Button>
        <Button variant="destructive" size="lg" onClick={async () => { stop(); const r = await stopShow(); r.ok ? toast.success("Emergency stop sent") : toast.error(`Stop failed: ${r.error}`); }}>
          <OctagonX /> Emergency Stop
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-2 rounded-lg border border-border bg-panel p-4">
          <div className="label-xs mb-2">Tier controls (top to bottom)</div>
          {tiers.map((t) => (
            <div key={t.tier} className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background/50 p-2">
              <span className="w-14 font-mono text-xs text-muted-foreground">TIER {t.tier}</span>
              <div className="flex overflow-hidden rounded-md border border-border">
                {(["off", "on", "flash", "pulse"] as const).map((st) => (
                  <button key={st} onClick={() => setT(t.tier, { state: st })} className={cn("px-3 py-1.5 text-xs capitalize", t.state === st ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>{st}</button>
                ))}
              </div>
              <div className="flex gap-1">
                {LA6_COLORS.map((c) => (
                  <button key={c.name} title={c.name} onClick={() => setT(t.tier, { color: c.name })}
                    className={cn("size-6 rounded-full border border-border", t.color === c.name && "ring-2 ring-primary ring-offset-2 ring-offset-background")} style={{ background: c.hex }} />
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background/50 p-2">
            <span className="flex w-14 items-center gap-1 font-mono text-xs text-muted-foreground"><Volume2 className="size-3" /> BUZZ</span>
            <Select value={buzzer} onValueChange={(v) => setBuzzer(v as typeof buzzer)}>
              <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="off">Off</SelectItem><SelectItem value="intermittent">Intermittent</SelectItem><SelectItem value="continuous">Continuous</SelectItem></SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">Requires confirmation</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-3">
            <Button variant={live ? "live" : "glow"} disabled={busy} onClick={() => { const c = current(); send(c, "Apply tier states", isDisruptive(c)); }}><Send /> Send to {live ? "tower" : "mock"}</Button>
            <Button variant="panel" disabled={busy} onClick={() => { const c: ControlCmd = { tiers: tiers.map((t) => ({ ...t, state: "on" })), buzzer: { pattern: "off" } }; setTiers(c.tiers); send(c, "All On"); }}><Power /> All On</Button>
            <Button variant="panel" disabled={busy} onClick={() => { const c = allOffCmd(); setTiers((ts) => ts.map((t) => ({ ...t, state: "off" }))); setBuzzer("off"); send(c, "All Off"); }}><PowerOff /> All Off</Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col items-center rounded-lg border border-border bg-panel p-4">
            <div className="label-xs mb-3">Pending command (not device state)</div>
            <Tower tiers={preview} buzzer={buzzer} size="md" />
          </div>
          <div className="rounded-lg border border-border bg-panel p-4 text-sm">
            <div className="label-xs mb-2">Last command sent</div>
            {last ? (
              <div className="space-y-1">
                <div className="font-medium">{last.label}</div>
                <div className="font-mono text-xs text-muted-foreground">{new Date(last.at).toLocaleTimeString()} · {last.mock ? "mock" : "live"}</div>
                <div className={cn("font-mono text-xs", last.ok ? "text-ok" : "text-destructive")}>{last.ok ? `Accepted by tower · HTTP ${last.status}` : `Failed · ${last.status ?? "no response"}`}</div>
                {last.error && <div className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{last.error}</div>}
                <p className="pt-1 text-[11px] text-muted-foreground">The tower doesn't report state back; this is the last accepted command, not confirmed device state.</p>
              </div>
            ) : <p className="text-xs text-muted-foreground">Nothing sent yet. <Link to="/settings" className="text-primary underline">Test the connection</Link> first.</p>}
          </div>
        </div>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate buzzer / alarm pattern?</AlertDialogTitle>
            <AlertDialogDescription>This command {live ? "will sound on the physical tower" : "would sound on the tower in live mode"} and may disturb people nearby.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { const c = confirm!; setConfirm(null); setBusy(true); const r = await sendControl(c.cmd, c.label); setBusy(false); r.ok ? toast.success(`Accepted (HTTP ${r.status})`) : toast.error(r.error); }}>Yes, send it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
