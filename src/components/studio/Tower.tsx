import type { BuzzerMode, TierState } from "@/lib/show/types";
import { cn } from "@/lib/utils";

interface Props {
  tiers: TierState[]; // index 0 = tier 1 (top)
  buzzer?: BuzzerMode;
  selected?: number[];
  onSelectTier?: (tier: number, additive: boolean) => void;
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function Tower({ tiers, buzzer = "off", selected = [], onSelectTier, size = "lg", label }: Props) {
  const w = size === "lg" ? 128 : size === "md" ? 72 : 28;
  const h = size === "lg" ? 58 : size === "md" ? 30 : 9;
  const order = [1, 2, 3, 4, 5]; // tier 1 is the top light
  return (
    <div className="flex flex-col items-center select-none">
      {/* cap */}
      <div
        className="rounded-t-full border border-border bg-gradient-to-b from-muted-foreground/40 to-panel-2"
        style={{ width: w * 0.92, height: size === "lg" ? 18 : size === "md" ? 10 : 4 }}
      />
      {order.map((tier) => {
        const s = tiers[tier - 1];
        const lit = s?.on && s.intensity > 0.02;
        const col = s?.color ?? "#000";
        const a = lit ? s.intensity : 0;
        const isSel = selected.includes(tier);
        return (
          <button
            key={tier}
            type="button"
            disabled={!onSelectTier}
            onClick={(e) => onSelectTier?.(tier, e.shiftKey || e.metaKey || e.ctrlKey)}
            className={cn(
              "relative overflow-hidden border-x border-b border-border transition-[outline] disabled:cursor-default",
              isSel && "z-10 outline-2 outline-offset-2 outline-primary",
            )}
            style={{
              width: w,
              height: h,
              background: lit
                ? `linear-gradient(90deg, color-mix(in oklab, ${col} ${30 + a * 40}%, #000) 0%, color-mix(in oklab, ${col} ${55 + a * 45}%, #fff ${a * 18}%) 45%, color-mix(in oklab, ${col} ${30 + a * 40}%, #000) 100%)`
                : "linear-gradient(90deg, #15171c, #2a2d34 45%, #15171c)",
              boxShadow: lit && size !== "sm" ? `0 0 ${18 + a * 40}px ${a * 6}px color-mix(in oklab, ${col} ${a * 70}%, transparent)` : undefined,
            }}
            aria-label={`Tier ${tier}`}
          >
            {/* lens ridges */}
            {size !== "sm" && (
              <span className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0 6px, rgba(255,255,255,.12) 6px 7px)" }} />
            )}
            {size === "lg" && (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[10px] font-semibold tracking-wider text-foreground/70 mix-blend-difference">
                T{tier}
              </span>
            )}
          </button>
        );
      })}
      {/* body / buzzer */}
      <div
        className="flex items-center justify-center border-x border-b border-border bg-gradient-to-b from-panel-2 to-background"
        style={{ width: w, height: size === "lg" ? 40 : size === "md" ? 16 : 5 }}
      >
        {size === "lg" && (
          <div className={cn("flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider", buzzer !== "off" ? "text-warn" : "text-muted-foreground")}>
            <span className={cn("size-2 rounded-full", buzzer !== "off" ? "bg-warn animate-pulse" : "bg-muted")} />
            Buzzer {buzzer === "off" ? "off" : buzzer}
          </div>
        )}
      </div>
      <div className="bg-muted-foreground/30" style={{ width: w * 0.18, height: size === "lg" ? 70 : size === "md" ? 24 : 6 }} />
      <div className="rounded-sm bg-muted-foreground/30" style={{ width: w * 0.7, height: size === "lg" ? 10 : 3 }} />
      {label && <div className="label-xs mt-3">{label}</div>}
    </div>
  );
}
