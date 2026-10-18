import { createFileRoute } from "@tanstack/react-router";
import { frameAt } from "@/lib/show/engine";
import { setBaseTiers, studio, toggleTier, updateClip, useStudio } from "@/lib/show/studio";
import { Tower } from "@/components/studio/Tower";
import { LibraryPanel } from "@/components/studio/LibraryPanel";
import { PropertiesPanel } from "@/components/studio/PropertiesPanel";
import { Timeline } from "@/components/studio/Timeline";
import { ColorPalette } from "@/components/studio/ColorPalette";
import { useDevice } from "@/lib/device/bridge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Studio — PATLITE Light Show Studio" },
      { name: "description", content: "Design and preview light shows for a five-tier PATLITE LA6-POE signal tower." },
      { property: "og:title", content: "Studio — PATLITE Light Show Studio" },
      { property: "og:description", content: "Timeline editor and live five-tier tower preview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

function Studio() {
  return (
    <div className="grid h-full min-h-[760px] grid-rows-[minmax(0,1fr)_260px] lg:grid-cols-[260px_minmax(0,1fr)_320px]">
      <aside className="hidden overflow-hidden border-r border-border bg-panel lg:block"><LibraryPanel /></aside>
      <Preview />
      <aside className="hidden overflow-y-auto border-l border-border bg-panel lg:block"><PropertiesPanel /></aside>
      <div className="border-t border-border lg:col-span-3"><Timeline /></div>
    </div>
  );
}

function Preview() {
  const show = useStudio((s) => s.show);
  const time = useStudio((s) => s.time);
  const base = useStudio((s) => s.base);
  const selTiers = useStudio((s) => s.selectedTiers);
  const selClip = useStudio((s) => s.selectedClipIds[0]);
  const last = useDevice((s) => s.lastCommand);
  const frame = frameAt(show, time, base);

  const applyColor = (hex: string) => {
    const clip = studio.get().show.clips.find((c) => c.id === selClip);
    if (clip) updateClip(clip.id, { color: hex });
    else setBaseTiers(selTiers.length ? selTiers : [1, 2, 3, 4, 5], { color: hex, on: true });
  };

  return (
    <section className="grid-bg relative flex min-h-0 flex-col items-center justify-center gap-6 overflow-hidden p-6">
      <div className="absolute left-4 top-4 flex items-center gap-2">
        <span className="rounded bg-sim/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-sim">Software preview</span>
        <span className="text-xs text-muted-foreground">Not the physical tower state</span>
      </div>
      <div className="absolute right-4 top-4 max-w-56 rounded-md border border-border bg-panel/80 px-3 py-2 text-right backdrop-blur">
        <div className="label-xs">Hardware · last command sent</div>
        <div className="mt-0.5 truncate text-xs">{last ? `${last.label}${last.mock ? " (mock)" : ""}` : "None this session"}</div>
      </div>
      <Tower tiers={frame.tiers} buzzer={frame.buzzer} selected={selTiers} onSelectTier={toggleTier} label="LA6-POE · 5 tier" />
      <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-panel/80 px-4 py-3 backdrop-blur">
        <div className="label-xs">{selClip ? "Color → selected clip" : selTiers.length ? `Color → tier ${selTiers.join(", ")}` : "Color → all tiers"}</div>
        <ColorPalette onChange={applyColor} />
      </div>
    </section>
  );
}
