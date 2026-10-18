import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EFFECTS } from "@/lib/show/types";
import { addClip, studio, useStudio } from "@/lib/show/studio";
import { EffectThumb } from "./EffectThumb";

export function LibraryPanel() {
  const [q, setQ] = useState("");
  const presets = useStudio((s) => s.presets);
  const list = EFFECTS.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));
  const plist = presets.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const item = (key: string, name: string, desc: string, thumb: React.ReactNode, data: string, onAdd: () => void) => (
    <div
      key={key}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("application/x-pls", data); e.dataTransfer.effectAllowed = "copy"; }}
      onDoubleClick={onAdd}
      className="group flex cursor-grab items-center gap-3 rounded-md border border-transparent px-2 py-1.5 hover:border-border hover:bg-panel-2 active:cursor-grabbing"
      title="Drag onto the timeline, or double-click to add at the playhead"
    >
      <div className="flex w-8 justify-center">{thumb}</div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="truncate text-xs text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <div className="label-xs mb-2">Effects library</div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search effects" className="h-8 pl-7 text-sm" />
        </div>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {list.map((e) =>
          item(e.type, e.name, e.description, <EffectThumb effect={e.type} />, JSON.stringify({ effect: e.type }), () => addClip(e.type, studio.get().time)),
        )}
        {plist.length > 0 && <div className="label-xs px-2 pb-1 pt-4">My presets</div>}
        {plist.map((p) =>
          item(p.id, p.name, "Saved preset", <EffectThumb clip={p} />, JSON.stringify({ preset: p.id }), () => addClip(p.effect, studio.get().time, undefined, p)),
        )}
      </div>
    </div>
  );
}
