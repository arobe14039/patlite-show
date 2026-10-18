import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy, Download, Eye, FolderOpen, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EffectThumb } from "@/components/studio/EffectThumb";
import { showDuration } from "@/lib/show/engine";
import { TEMPLATES } from "@/lib/show/templates";
import { deleteShow, duplicateShow, exportShow, importShow, loadShow, parseShowFile, renameShow, useStudio } from "@/lib/show/studio";
import type { Show } from "@/lib/show/types";

export const Route = createFileRoute("/shows")({
  head: () => ({
    meta: [
      { title: "Light Shows — PATLITE Light Show Studio" },
      { name: "description", content: "Templates and saved PATLITE light shows: load, preview, duplicate, import and export." },
      { property: "og:title", content: "Light Shows — PATLITE Light Show Studio" },
      { property: "og:description", content: "Templates and saved light shows for the LA6-POE tower." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Shows,
});

function Shows() {
  const saved = useStudio((s) => s.savedShows);
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [name, setName] = useState("");
  const templates = TEMPLATES.map((t) => t());

  const open = (s: Show, playIt = false) => { loadShow(s, { play: playIt }); nav({ to: "/" }); };

  const onImport = async (f: File) => {
    try { const s = parseShowFile(await f.text()); importShow(s); toast.success(`Imported "${s.name}"`); }
    catch (e) { toast.error(`Import failed: ${(e as Error).message}`); }
  };

  const card = (s: Show, tpl: boolean) => (
    <div key={s.id} className="flex gap-4 rounded-lg border border-border bg-panel p-4 transition-colors hover:border-muted-foreground/40">
      <div className="flex w-10 justify-center pt-1"><EffectThumb clip={{ ...s.clips[0], duration: showDuration(s) }} /></div>
      <div className="min-w-0 flex-1">
        {renaming === s.id ? (
          <form onSubmit={(e) => { e.preventDefault(); renameShow(s.id, name || s.name); setRenaming(null); }}>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={() => { renameShow(s.id, name || s.name); setRenaming(null); }} className="h-8" />
          </form>
        ) : <div className="font-semibold">{s.name}</div>}
        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.description || "No description"}</div>
        <div className="mt-1 font-mono text-[11px] text-muted-foreground">{s.clips.length} clips · {(showDuration(s) / 1000).toFixed(1)}s{!tpl && ` · ${new Date(s.updatedAt).toLocaleString()}`}</div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button size="sm" variant="glow" onClick={() => open(s, true)}><Eye /> Run Preview</Button>
          <Button size="sm" variant="panel" onClick={() => open(s)}><FolderOpen /> Edit</Button>
          {!tpl && <>
            <Button size="sm" variant="ghost" onClick={() => { setRenaming(s.id); setName(s.name); }}><Pencil /></Button>
            <Button size="sm" variant="ghost" onClick={() => duplicateShow(s)}><Copy /></Button>
            <Button size="sm" variant="ghost" onClick={() => exportShow(s)}><Download /></Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm(`Delete "${s.name}"?`)) deleteShow(s.id); }}><Trash2 /></Button>
          </>}
          {tpl && <Button size="sm" variant="ghost" onClick={() => exportShow(s)}><Download /></Button>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Light Shows</h1>
          <p className="text-sm text-muted-foreground">Run Preview plays in simulation only — nothing is sent to the tower.</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />
          <Button variant="panel" onClick={() => fileRef.current?.click()}><Upload /> Import JSON</Button>
        </div>
      </div>
      <section>
        <div className="label-xs mb-3">My shows ({saved.length})</div>
        {saved.length ? <div className="grid gap-3 md:grid-cols-2">{saved.map((s) => card(s, false))}</div>
          : <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No saved shows yet. Edit a template or build one in the Studio, then hit Save.</p>}
      </section>
      <section>
        <div className="label-xs mb-3">Templates</div>
        <div className="grid gap-3 md:grid-cols-2">{templates.map((s) => card(s, true))}</div>
      </section>
    </div>
  );
}
