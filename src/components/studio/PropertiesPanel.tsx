import { useState } from "react";
import { BookmarkPlus, CopyPlus, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteSelected, duplicateSelected, savePreset, setBaseTiers, studio, updateClip, useStudio } from "@/lib/show/studio";
import { EFFECTS, effectDef, type Clip, type EffectType } from "@/lib/show/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ColorPalette } from "./ColorPalette";
import { EffectThumb } from "./EffectThumb";

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="label-xs">{label}</Label>
    {children}
  </div>
);

export function PropertiesPanel() {
  const ids = useStudio((s) => s.selectedClipIds);
  const clips = useStudio((s) => s.show.clips);
  const clip = clips.find((c) => c.id === ids[0]);
  if (clip) return <ClipProps clip={clip} multi={ids.length} />;
  return <TierProps />;
}

function TierProps() {
  const sel = useStudio((s) => s.selectedTiers);
  const base = useStudio((s) => s.base);
  const first = base[(sel[0] ?? 1) - 1];
  return (
    <div className="space-y-5 p-4">
      <div>
        <div className="label-xs">Tier properties</div>
        <p className="mt-1 text-xs text-muted-foreground">
          {sel.length ? `Tier ${sel.join(", ")} selected. Shown when no clip is active.` : "Click a tier on the tower (shift-click for several), or select a clip on the timeline."}
        </p>
      </div>
      {sel.length > 0 && (
        <>
          <Row label="Preview state">
            <div className="flex items-center gap-2 text-sm">
              <Switch checked={first.on} onCheckedChange={(on) => setBaseTiers(sel, { on })} /> {first.on ? "On" : "Off"}
            </div>
          </Row>
          <Row label="Color">
            <ColorPalette value={first.color} onChange={(color) => setBaseTiers(sel, { color, on: true })} />
          </Row>
          <Row label={`Glow intensity ${Math.round(first.intensity * 100)}%`}>
            <Slider value={[first.intensity * 100]} min={5} max={100} onValueChange={([v]) => setBaseTiers(sel, { intensity: v / 100 })} />
          </Row>
          <Button variant="panel" size="sm" onClick={() => setBaseTiers(sel, { on: false })}>Turn selected off</Button>
        </>
      )}
    </div>
  );
}

function ClipProps({ clip, multi }: { clip: Clip; multi: number }) {
  const def = effectDef(clip.effect);
  const p = def.params;
  const set = (patch: Partial<Clip>) => updateClip(clip.id, patch);
  const [presetName, setPresetName] = useState("");
  const allTiers = clip.effect === "allOn" || clip.effect === "allOff";

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-md border border-border bg-background p-2"><EffectThumb clip={clip} size="md" /></div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="label-xs">{multi > 1 ? `${multi} clips selected · editing first` : "Clip"}</div>
          <Input value={clip.name} onChange={(e) => set({ name: e.target.value })} className="h-8" />
          <Select value={clip.effect} onValueChange={(v) => set({ effect: v as EffectType, name: effectDef(v as EffectType).name })}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{EFFECTS.map((e) => <SelectItem key={e.type} value={e.type}>{e.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {p.tiers && !allTiers && (
        <Row label="Target tiers">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((t) => {
              const on = clip.tiers.includes(t);
              return (
                <button key={t} type="button"
                  onClick={() => set({ tiers: on ? clip.tiers.filter((x) => x !== t) : [...clip.tiers, t].sort() })}
                  className={cn("h-8 flex-1 rounded-md border font-mono text-xs", on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-accent")}
                >T{t}</button>
              );
            })}
          </div>
        </Row>
      )}

      {p.color && <Row label={clip.effect === "alarm" || clip.effect === "alternate" ? "Primary color" : "Color"}><ColorPalette value={clip.color} onChange={(color) => set({ color })} /></Row>}
      {p.color2 && <Row label="Secondary color"><ColorPalette value={clip.color2} onChange={(color2) => set({ color2 })} /></Row>}
      {p.colors && (
        <Row label="Color sequence">
          <div className="flex flex-wrap gap-1.5">
            {clip.colors.map((c, i) => (
              <button key={i} type="button" onClick={() => set({ colors: clip.colors.filter((_, j) => j !== i) })}
                className="group relative size-7 rounded-md border border-border" style={{ background: c }} title="Remove">
                <X className="absolute inset-0 m-auto size-3 opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1"><Plus className="size-3 text-muted-foreground" /><ColorPalette compact onChange={(c) => set({ colors: [...clip.colors, c] })} /></div>
        </Row>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Row label="Start (s)">
          <Input type="number" step={0.1} min={0} value={+(clip.start / 1000).toFixed(2)} onChange={(e) => set({ start: Math.max(0, +e.target.value * 1000) })} className="h-8 font-mono" />
        </Row>
        <Row label="Duration (s)">
          <Input type="number" step={0.1} min={0.1} value={+(clip.duration / 1000).toFixed(2)} onChange={(e) => set({ duration: Math.max(100, +e.target.value * 1000) })} className="h-8 font-mono" />
        </Row>
      </div>

      {p.speed && (
        <Row label={`Interval ${clip.speed} ms`}>
          <Slider value={[clip.speed]} min={50} max={2000} step={10} onValueChange={([v]) => set({ speed: v })} />
          {clip.speed < studioInterval() && <p className="text-[11px] text-warn">Faster than the hardware command interval — the physical tower may look different.</p>}
        </Row>
      )}
      {p.count && (
        <Row label="Flash count (0 = until clip ends)">
          <Input type="number" min={0} value={clip.count} onChange={(e) => set({ count: Math.max(0, Math.round(+e.target.value)) })} className="h-8 font-mono" />
        </Row>
      )}
      <div className="grid grid-cols-2 gap-3">
        {p.direction && (
          <Row label="Direction">
            <Select value={clip.direction} onValueChange={(v) => set({ direction: v as Clip["direction"] })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="up">Bottom → top</SelectItem><SelectItem value="down">Top → bottom</SelectItem></SelectContent>
            </Select>
          </Row>
        )}
        {clip.effect !== "buzzer" && (
          <Row label="Transition">
            <Select value={clip.transition} onValueChange={(v) => set({ transition: v as Clip["transition"] })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="cut">Cut</SelectItem><SelectItem value="fade">Fade (preview only)</SelectItem></SelectContent>
            </Select>
          </Row>
        )}
      </div>
      <Row label="Buzzer">
        <Select value={clip.buzzer} onValueChange={(v) => set({ buzzer: v as Clip["buzzer"] })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="off">Off</SelectItem>
            <SelectItem value="intermittent">Intermittent</SelectItem>
            <SelectItem value="continuous">Continuous</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      <div className="flex gap-2 border-t border-border pt-4">
        <Button size="sm" variant="panel" onClick={duplicateSelected}><CopyPlus /> Duplicate</Button>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={deleteSelected}><Trash2 /> Delete</Button>
      </div>
      <div className="flex gap-2">
        <Input placeholder="Preset name" value={presetName} onChange={(e) => setPresetName(e.target.value)} className="h-8" />
        <Button size="sm" variant="panel" onClick={() => { savePreset(clip, presetName || clip.name); setPresetName(""); toast.success("Saved to My presets"); }}><BookmarkPlus /> Save</Button>
      </div>
    </div>
  );
}

function studioInterval() {
  try { return JSON.parse(localStorage.getItem("pls.device.v1") || "{}").intervalMs ?? 250; } catch { return 250; }
}
void studio;
