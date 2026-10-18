import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Play, Plus, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EffectThumb } from "@/components/studio/EffectThumb";
import { addClip, deletePreset, studio, useStudio } from "@/lib/show/studio";
import { EFFECTS, SHOW_SCHEMA, SHOW_VERSION, type Clip, type EffectType } from "@/lib/show/types";
import { makeClip } from "@/lib/show/engine";
import { runShow, stopShow, useDevice } from "@/lib/device/bridge";
import { useRef, useState } from "react";

function playOnTower(effect: EffectType, preset?: Partial<Clip>) {
  const { id: _id, start: _s, ...rest } = preset ?? {};
  const clip = makeClip(effect, { ...rest, start: 0, duration: preset?.duration ?? 6000, transition: "cut" });
  // Slow every effect down to one change per second so the tower keeps up.
  clip.speed = Math.max(1000, clip.speed);
  return runShow({ schema: SHOW_SCHEMA, version: SHOW_VERSION, id: "preview", name: clip.name, description: "", clips: [clip], loop: false, updatedAt: 0 });
}

function PlayButton({ id, effect, preset }: { id: string; effect: EffectType; preset?: Partial<Clip> }) {
  const running = useDevice((s) => s.showRunning);
  const [mine, setMine] = useState(false);
  const looping = useRef(false);
  const stop = () => { looping.current = false; setMine(false); void stopShow(); };
  const play = async () => {
    looping.current = true;
    setMine(true);
    // Loop until Stop is pressed (or a command fails).
    while (looping.current) {
      const r = await playOnTower(effect, preset);
      if (!r.ok) break;
    }
    looping.current = false;
    setMine(false);
  };
  return mine ? (
    <Button size="sm" variant="live" onClick={stop}><Square /> Stop</Button>
  ) : (
    <Button size="sm" variant="glow" disabled={running} aria-label={`Play ${id}`} onClick={play}><Play /> Play</Button>
  );
}

export const Route = createFileRoute("/effects")({
  head: () => ({
    meta: [
      { title: "Effects Library — PATLITE Light Show Studio" },
      { name: "description", content: "Animated catalogue of tower effects and your saved presets." },
      { property: "og:title", content: "Effects Library — PATLITE Light Show Studio" },
      { property: "og:description", content: "Animated catalogue of tower effects and presets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Effects,
});

const SOFTWARE = new Set(["pulse", "chase", "rainbow", "fill", "drain", "sparkle", "alternate", "custom", "double"]);

function Effects() {
  const presets = useStudio((s) => s.presets);
  const nav = useNavigate();
  return (
    <div className="mx-auto max-w-6xl space-y-10 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Effects Library</h1>
        <p className="text-sm text-muted-foreground">"Software-timed" effects are stepped by the animation engine, not native tower patterns.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EFFECTS.map((e) => (
          <div key={e.type} className="flex items-center gap-4 rounded-lg border border-border bg-panel p-4">
            <div className="rounded-md bg-background p-3"><EffectThumb effect={e.type} size="md" /></div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{e.name}</div>
              <div className="text-xs text-muted-foreground">{e.description}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-sim">{SOFTWARE.has(e.type) ? "Software-timed" : "Steady / native"}</div>
              <div className="mt-2 flex gap-1.5"><PlayButton id={e.type} effect={e.type} /><Button size="sm" variant="panel" onClick={() => { addClip(e.type, studio.get().time); nav({ to: "/" }); }}><Plus /> Add to timeline</Button></div>
            </div>
          </div>
        ))}
      </div>
      <section>
        <div className="label-xs mb-3">My presets</div>
        {presets.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map((p) => (
              <div key={p.id} className="flex items-center gap-4 rounded-lg border border-border bg-panel p-4">
                <div className="rounded-md bg-background p-3"><EffectThumb clip={p} size="md" /></div>
                <div className="flex-1">
                  <div className="font-semibold">{p.name}</div>
                  <div className="flex gap-1.5 pt-2">
                    <PlayButton id={p.id} effect={p.effect} preset={p} />
                    <Button size="sm" variant="panel" onClick={() => { addClip(p.effect, studio.get().time, undefined, p); nav({ to: "/" }); }}><Plus /> Add</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deletePreset(p.id)}><Trash2 /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Select a clip in the Studio and use "Save" in its properties to create a preset.</p>}
      </section>
    </div>
  );
}
