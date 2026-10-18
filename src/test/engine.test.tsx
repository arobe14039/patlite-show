import { describe, expect, it } from "vitest";
import { activeClipFor, compileShow, frameAt, makeClip } from "@/lib/show/engine";
import { SHOW_SCHEMA, SHOW_VERSION, type Show } from "@/lib/show/types";

const show = (clips: Show["clips"]): Show => ({ schema: SHOW_SCHEMA, version: SHOW_VERSION, id: "t", name: "t", description: "", clips, loop: false, updatedAt: 0 });

describe("animation engine", () => {
  it("later-starting clip wins on the same tier", () => {
    const a = makeClip("solid", { start: 0, duration: 2000, tiers: [1], color: "#ff0000" });
    const b = makeClip("solid", { start: 500, duration: 500, tiers: [1], color: "#00ff00" });
    expect(activeClipFor([a, b], 600, 1)?.id).toBe(b.id);
    expect(activeClipFor([a, b], 1200, 1)?.id).toBe(a.id);
  });
  it("compiles into merged deduped steps ending all off", () => {
    const s = show([makeClip("solid", { start: 0, duration: 1000, tiers: [1, 2, 3, 4, 5], color: "#ff0000" })]);
    const steps = compileShow(s, 250);
    expect(steps).toHaveLength(2);
    expect(steps[0].tiers).toEqual(["red", "red", "red", "red", "red"]);
    expect(steps[1].tiers).toEqual([null, null, null, null, null]);
  });
  it("flash count stops after N flashes", () => {
    const s = show([makeClip("flash", { start: 0, duration: 5000, tiers: [1], speed: 100, count: 2 })]);
    expect(frameAt(s, 250).tiers[0].on).toBe(true);
    expect(frameAt(s, 450).tiers[0].on).toBe(false);
  });
});
