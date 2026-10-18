import { describe, expect, it } from "vitest";
import { encodeState } from "@/lib/device/patlite";
import { DEFAULT_SETTINGS } from "@/lib/device/bridge";

describe("PATLITE encoding", () => {
  it("matches PATLITE's published example color=46091", () => {
    const q = encodeState(DEFAULT_SETTINGS, { tiers: ["green", "blue", null, "white", "red"], flash: false, buzzer: "off" });
    expect(q).toEqual({ color: "46091", buzzer: "0" });
  });
});
