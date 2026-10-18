import { PALETTE } from "@/lib/show/types";
import { cn } from "@/lib/utils";

export function ColorPalette({ value, onChange, compact }: { value?: string; onChange: (hex: string) => void; compact?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PALETTE.map((p) => (
        <button
          key={p.hex}
          type="button"
          title={p.name}
          onClick={() => onChange(p.hex)}
          className={cn(
            "rounded-full border border-border transition-transform hover:scale-110",
            compact ? "size-5" : "size-7",
            value?.toLowerCase() === p.hex && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}
          style={{ background: p.hex, boxShadow: `0 0 10px -2px ${p.hex}` }}
        />
      ))}
      <label
        title="Custom color"
        className={cn("relative cursor-pointer overflow-hidden rounded-full border border-dashed border-muted-foreground", compact ? "size-5" : "size-7")}
        style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}
      >
        <input type="color" value={value ?? "#ffffff"} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
    </div>
  );
}
