import { useEffect, useMemo, useState } from "react";
import { evalClip, makeClip } from "@/lib/show/engine";
import type { Clip, EffectType } from "@/lib/show/types";
import { Tower } from "./Tower";

// Shared low-fps ticker so many thumbnails don't each run their own loop.
const subs = new Set<(t: number) => void>();
let timer: ReturnType<typeof setInterval> | null = null;
const t0 = typeof performance !== "undefined" ? performance.now() : 0;
function useTicker() {
  const [t, setT] = useState(0);
  useEffect(() => {
    subs.add(setT);
    if (!timer) timer = setInterval(() => { const n = performance.now() - t0; subs.forEach((f) => f(n)); }, 50);
    return () => {
      subs.delete(setT);
      if (!subs.size && timer) { clearInterval(timer); timer = null; }
    };
  }, []);
  return t;
}

export function EffectThumb({ effect, clip, size = "sm" }: { effect?: EffectType; clip?: Clip; size?: "sm" | "md" }) {
  const t = useTicker();
  const c = useMemo(() => clip ? { ...clip, start: 0 } : makeClip(effect!, { duration: 2500, tiers: [1, 2, 3, 4, 5] }), [clip, effect]);
  const local = t % Math.max(300, c.duration);
  const tiers = [1, 2, 3, 4, 5].map((tier) =>
    c.effect === "buzzer" ? { on: false, color: "#000", intensity: 0 } :
    (c.effect === "allOn" || c.effect === "allOff" || c.tiers.includes(tier)) ? evalClip(c, local, tier) : { on: false, color: "#000", intensity: 0 },
  );
  return <Tower tiers={tiers} size={size} buzzer={c.buzzer} />;
}
