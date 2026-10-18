import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clapperboard, Library, ListMusic, Radio, Save, Settings2, Play, Square, Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { hydrate, pause, play, saveCurrent, stop, studio, useStudio } from "@/lib/show/studio";
import { hydrateDevice, runShow, stopShow, useDevice } from "@/lib/device/bridge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NAV = [
  { to: "/", label: "Studio", icon: Clapperboard },
  { to: "/shows", label: "Light Shows", icon: ListMusic },
  { to: "/effects", label: "Effects Library", icon: Library },
  { to: "/live", label: "Live Control", icon: Radio },
  { to: "/settings", label: "Device Settings", icon: Settings2 },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => { hydrate(); hydrateDevice(); }, []);
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <nav className="hidden w-52 shrink-0 flex-col gap-0.5 border-r border-border bg-sidebar p-2 md:flex">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "bg-accent !text-foreground shadow-[inset_2px_0_0_var(--primary)]" }}>
              <n.icon className="size-4" /> {n.label}
            </Link>
          ))}
          <div className="mt-auto rounded-md border border-border p-3 text-[11px] leading-relaxed text-muted-foreground">
            Preview animates locally. Physical commands are only sent in <span className="text-live">Live mode</span>.
          </div>
        </nav>
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
      <nav className="flex border-t border-border bg-sidebar md:hidden">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-muted-foreground" activeProps={{ className: "!text-primary" }}>
            <n.icon className="size-4" />{n.label.split(" ")[0]}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function TopBar() {
  const settings = useDevice((s) => s.settings);
  const connection = useDevice((s) => s.connection);
  const showRunning = useDevice((s) => s.showRunning);
  const playing = useStudio((s) => s.playing);
  const dirty = useStudio((s) => s.dirty);
  const name = useStudio((s) => s.show.name);
  const [saveOpen, setSaveOpen] = useState(false);
  const [confirmLive, setConfirmLive] = useState(false);
  const live = settings.mode === "live";
  const running = playing || showRunning;

  const start = async () => {
    if (live) { setConfirmLive(true); return; }
    play();
  };
  const startLive = async () => {
    setConfirmLive(false);
    stop(); play();
    toast.message("Show running on tower");
    const r = await runShow(studio.get().show);
    if (!r.ok) { pause(); toast.error(`Tower command failed: ${r.error}`); }
  };
  const halt = async () => {
    stop();
    if (live || showRunning) {
      const r = await stopShow();
      r.ok ? toast.success("Stop sent — pending steps cancelled") : toast.error(`Stop failed: ${r.error}`);
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-panel px-3 md:px-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-3 flex-col gap-px overflow-hidden rounded-sm">
          {["#ff2a3d", "#ff8a00", "#ffe14a", "#22ff7a", "#2f6bff"].map((c) => <span key={c} className="flex-1" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />)}
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight">PATLITE</div>
          <div className="label-xs !text-[9px]">Light Show Studio</div>
        </div>
      </div>
      <div className="mx-2 hidden h-6 w-px bg-border sm:block" />
      <div className="hidden items-center gap-3 sm:flex">
        <span className={cn("rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider", live ? "bg-live text-live-foreground" : "bg-sim/20 text-sim")}>
          {live ? "Live" : "Mock"}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Circle className={cn("size-2 fill-current", connection === "ok" ? "text-ok" : connection === "error" ? "text-destructive" : connection === "testing" ? "text-warn" : "text-muted-foreground")} />
          {connection === "ok" ? "Tower reachable" : connection === "error" ? "Tower unreachable" : connection === "testing" ? "Testing…" : "Not tested"}
        </span>
        <span className="font-mono text-xs text-muted-foreground">{settings.ip}</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button onClick={() => setSaveOpen(true)} className="hidden items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent lg:flex" title="Save show">
          {dirty ? <><Save className="size-3.5 text-warn" /> <span className="max-w-40 truncate">{name}</span> · unsaved</> : <><Check className="size-3.5 text-ok" /> <span className="max-w-40 truncate">{name}</span> · saved</>}
        </button>
        <Button variant="panel" size="sm" onClick={() => setSaveOpen(true)} className="lg:hidden"><Save /></Button>
        {running ? (
          <Button variant="destructive" onClick={halt}><Square /> Stop Show</Button>
        ) : (
          <Button variant={live ? "live" : "glow"} onClick={start}><Play /> {live ? "Start on tower" : "Start Show"}</Button>
        )}
      </div>
      <SaveDialog open={saveOpen} onOpenChange={setSaveOpen} />
      <Dialog open={confirmLive} onOpenChange={setConfirmLive}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run "{name}" on the physical tower?</DialogTitle>
            <DialogDescription>
              Commands will be sent step by step to {settings.deviceName} at {settings.ip}. Keep this page open while it runs. Fast effects may look different on hardware due to network latency.
            </DialogDescription>
          </DialogHeader>
          {!settings.apiVerified && <p className="rounded-md border border-warn/40 bg-warn/10 p-3 text-xs text-warn">The PATLITE command mapping is not marked as verified in Device Settings.</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmLive(false)}>Cancel</Button>
            <Button variant="live" onClick={startLive}>Send to tower</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}

export function SaveDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const show = useStudio((s) => s.show);
  const [name, setName] = useState(show.name);
  const [desc, setDesc] = useState(show.description);
  useEffect(() => { if (open) { setName(show.name); setDesc(show.description); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Save show</DialogTitle><DialogDescription>Stored in this browser. Export to JSON from Light Shows to back it up.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Show name" />
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" rows={3} />
        </div>
        <DialogFooter>
          <Button onClick={() => { saveCurrent(name.trim() || "Untitled show", desc); onOpenChange(false); toast.success("Show saved"); }} variant="glow">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
