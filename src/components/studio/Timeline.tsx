import { useEffect, useMemo, useRef } from "react";
import { AlertTriangle, Copy, Magnet, Pause, Play, Redo2, Repeat, RotateCcw, Square, Trash2, Undo2, ZoomIn, ZoomOut, ClipboardPaste, CopyPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findConflicts, showDuration } from "@/lib/show/engine";
import {
  addClip, checkpoint, copySelected, deleteSelected, duplicateSelected, mutate, pause, paste, play, redo, restart,
  seek, selectClip, stop, studio, undo, updateClip, useStudio,
} from "@/lib/show/studio";
import type { Clip } from "@/lib/show/types";
import { cn } from "@/lib/utils";

const TRACKS: (number | "buzzer")[] = [1, 2, 3, 4, 5, "buzzer"];
const LABEL_W = 76;
const ROW_H = 34;
const GRID = 100;

const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${((ms / 1000) % 60).toFixed(2).padStart(5, "0")}`;

export function Timeline() {
  const show = useStudio((s) => s.show);
  const zoom = useStudio((s) => s.zoom);
  const snap = useStudio((s) => s.snap);
  const playing = useStudio((s) => s.playing);
  const selected = useStudio((s) => s.selectedClipIds);
  const past = useStudio((s) => s.past.length);
  const future = useStudio((s) => s.future.length);
  const total = showDuration(show);
  const conflicts = useMemo(() => findConflicts(show.clips), [show.clips]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const width = Math.max(total + 4000, 12000) / 1000 * zoom;

  const snapT = (t: number) => (studio.get().snap ? Math.round(t / GRID) * GRID : Math.round(t));
  const xToT = (clientX: number) => {
    const el = scrollRef.current!;
    const r = el.getBoundingClientRect();
    return Math.max(0, ((clientX - r.left - LABEL_W + el.scrollLeft) / studio.get().zoom) * 1000);
  };

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const mod = e.metaKey || e.ctrlKey;
      if (e.code === "Space") { e.preventDefault(); studio.get().playing ? pause() : play(); }
      else if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if (mod && e.key.toLowerCase() === "c") copySelected();
      else if (mod && e.key.toLowerCase() === "v") paste();
      else if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSelected(); }
      else if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const startDrag = (e: React.PointerEvent, clip: Clip, mode: "move" | "resize") => {
    e.stopPropagation();
    selectClip(clip.id, e.shiftKey || e.metaKey);
    const startX = e.clientX;
    const orig = { start: clip.start, duration: clip.duration };
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      const dt = ((ev.clientX - startX) / studio.get().zoom) * 1000;
      if (!moved && Math.abs(ev.clientX - startX) < 3) return;
      if (!moved) { checkpoint(); moved = true; }
      if (mode === "move") updateClip(clip.id, { start: Math.max(0, snapT(orig.start + dt)) }, false);
      else updateClip(clip.id, { duration: Math.max(GRID, snapT(orig.duration + dt)) }, false);
    };
    const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const scrub = (e: React.PointerEvent) => {
    seek(xToT(e.clientX));
    const onMove = (ev: PointerEvent) => seek(xToT(ev.clientX));
    const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const onDrop = (e: React.DragEvent, track: number | "buzzer") => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-pls");
    if (!raw) return;
    const d = JSON.parse(raw) as { effect?: Clip["effect"]; preset?: string };
    const t = snapT(xToT(e.clientX));
    if (d.preset) {
      const p = studio.get().presets.find((x) => x.id === d.preset);
      if (p) addClip(p.effect, t, undefined, p);
    } else if (d.effect) {
      addClip(track === "buzzer" ? "buzzer" : d.effect, t, track === "buzzer" ? undefined : track);
    }
  };

  const clipsFor = (track: number | "buzzer") =>
    show.clips.filter((c) =>
      track === "buzzer" ? c.effect === "buzzer" || c.buzzer !== "off"
      : c.effect !== "buzzer" && (c.effect === "allOn" || c.effect === "allOff" || c.tiers.includes(track)),
    );

  const seconds = Math.ceil(width / zoom);

  return (
    <div className="flex h-full flex-col bg-panel">
      {/* transport */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-1.5">
        <Button size="icon" variant={playing ? "glow" : "panel"} className="size-8" onClick={() => (playing ? pause() : play())} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button size="icon" variant="ghost" className="size-8" onClick={stop} aria-label="Stop"><Square /></Button>
        <Button size="icon" variant="ghost" className="size-8" onClick={restart} aria-label="Restart"><RotateCcw /></Button>
        <Playhead total={total} />
        <div className="mx-2 h-5 w-px bg-border" />
        <Button size="icon" variant="ghost" className="size-8" disabled={!past} onClick={undo} aria-label="Undo"><Undo2 /></Button>
        <Button size="icon" variant="ghost" className="size-8" disabled={!future} onClick={redo} aria-label="Redo"><Redo2 /></Button>
        <Button size="icon" variant="ghost" className="size-8" disabled={!selected.length} onClick={copySelected} aria-label="Copy"><Copy /></Button>
        <Button size="icon" variant="ghost" className="size-8" onClick={paste} aria-label="Paste"><ClipboardPaste /></Button>
        <Button size="icon" variant="ghost" className="size-8" disabled={!selected.length} onClick={duplicateSelected} aria-label="Duplicate"><CopyPlus /></Button>
        <Button size="icon" variant="ghost" className="size-8" disabled={!selected.length} onClick={deleteSelected} aria-label="Delete"><Trash2 /></Button>
        <div className="mx-2 h-5 w-px bg-border" />
        <Button size="sm" variant={snap ? "secondary" : "ghost"} onClick={() => studio.set({ snap: !snap })}><Magnet /> Snap</Button>
        <Button size="sm" variant={show.loop ? "secondary" : "ghost"} onClick={() => studio.set((s) => ({ show: { ...s.show, loop: !s.show.loop } }))}><Repeat /> Loop</Button>
        <div className="ml-auto flex items-center gap-1">
          {conflicts.size > 0 && (
            <span className="mr-2 flex items-center gap-1 text-xs text-warn" title="Overlapping clips on the same tier: the clip that starts later takes priority.">
              <AlertTriangle className="size-3.5" /> {conflicts.size} overlapping — later clip wins
            </span>
          )}
          <span className="mr-2 font-mono text-xs text-muted-foreground">Total {fmt(total)}</span>
          <Button size="icon" variant="ghost" className="size-8" onClick={() => studio.set({ zoom: Math.max(20, zoom / 1.3) })} aria-label="Zoom out"><ZoomOut /></Button>
          <Button size="icon" variant="ghost" className="size-8" onClick={() => studio.set({ zoom: Math.min(400, zoom * 1.3) })} aria-label="Zoom in"><ZoomIn /></Button>
        </div>
      </div>

      {/* tracks */}
      <div ref={scrollRef} className="relative flex-1 overflow-auto" onPointerDown={(e) => { if (e.target === e.currentTarget) studio.set({ selectedClipIds: [] }); }}>
        <div className="relative" style={{ width: width + LABEL_W, minHeight: "100%" }}>
          {/* ruler */}
          <div className="sticky top-0 z-20 flex h-6 border-b border-border bg-panel">
            <div className="sticky left-0 z-10 shrink-0 border-r border-border bg-panel" style={{ width: LABEL_W }} />
            <div className="relative flex-1 cursor-ew-resize" onPointerDown={scrub}>
              {Array.from({ length: seconds + 1 }, (_, i) => (
                <div key={i} className="absolute top-0 h-full border-l border-border" style={{ left: i * zoom }}>
                  <span className="ml-1 font-mono text-[10px] text-muted-foreground">{i}s</span>
                </div>
              ))}
            </div>
          </div>
          {TRACKS.map((track) => (
            <div key={track} className="flex border-b border-border/60" style={{ height: ROW_H }}>
              <div className="sticky left-0 z-10 flex shrink-0 items-center border-r border-border bg-panel px-3 font-mono text-[11px] text-muted-foreground" style={{ width: LABEL_W }}>
                {track === "buzzer" ? "BUZZER" : `TIER ${track}`}
              </div>
              <div
                className="relative flex-1"
                style={{ backgroundImage: `repeating-linear-gradient(90deg, transparent 0 ${zoom - 1}px, oklch(1 0 0 / 5%) ${zoom - 1}px ${zoom}px)` }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
                onDrop={(e) => onDrop(e, track)}
                onPointerDown={(e) => { if (e.target === e.currentTarget) { studio.set({ selectedClipIds: [] }); scrub(e); } }}
              >
                {clipsFor(track).map((c) => {
                  const sel = selected.includes(c.id);
                  const conflict = track !== "buzzer" && conflicts.has(c.id);
                  const col = track === "buzzer" ? "#ffe14a" : c.effect === "allOff" ? "#555" : c.effect === "rainbow" ? "#22e6ff" : c.color;
                  return (
                    <div
                      key={c.id}
                      onPointerDown={(e) => startDrag(e, c, "move")}
                      className={cn(
                        "absolute top-1 bottom-1 flex cursor-grab items-center gap-1 overflow-hidden rounded-sm border px-1.5 text-[11px] font-medium active:cursor-grabbing",
                        sel ? "border-foreground z-10" : "border-transparent",
                        conflict && !sel && "border-warn border-dashed",
                      )}
                      style={{
                        left: (c.start / 1000) * zoom,
                        width: Math.max(8, (c.duration / 1000) * zoom),
                        background: `linear-gradient(180deg, color-mix(in oklab, ${col} 45%, #111), color-mix(in oklab, ${col} 25%, #111))`,
                        boxShadow: sel ? `0 0 14px -2px ${col}` : undefined,
                      }}
                      title={`${c.name} — ${(c.duration / 1000).toFixed(2)}s${conflict ? " (overlaps another clip on this tier)" : ""}`}
                    >
                      {conflict && <AlertTriangle className="size-3 shrink-0 text-warn" />}
                      <span className="truncate text-foreground">{track === "buzzer" && c.effect !== "buzzer" ? `♪ ${c.name}` : c.name}</span>
                      <span onPointerDown={(e) => startDrag(e, c, "resize")} className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-foreground/10 hover:bg-foreground/30" />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <PlayheadLine zoom={zoom} />
        </div>
      </div>
    </div>
  );
}

function Playhead({ total }: { total: number }) {
  const time = useStudio((s) => s.time);
  return <span className="ml-2 font-mono text-sm tabular-nums text-primary">{fmt(time)}<span className="text-muted-foreground"> / {fmt(total)}</span></span>;
}

function PlayheadLine({ zoom }: { zoom: number }) {
  const time = useStudio((s) => s.time);
  return (
    <div className="pointer-events-none absolute bottom-0 top-0 z-30 w-px bg-primary shadow-glow" style={{ left: LABEL_W + (time / 1000) * zoom }}>
      <div className="absolute -left-1.5 top-0 size-3 rotate-45 bg-primary" />
    </div>
  );
}

// re-export to keep mutate referenced for consumers
export { mutate };
