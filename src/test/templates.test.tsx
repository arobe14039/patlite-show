import { describe, expect, it } from "vitest";
import { TEMPLATES } from "@/lib/show/templates";
import { compileShow } from "@/lib/show/engine";

describe("preset shows are tower-safe", () => {
  it("no two light changes are closer than 1 second", () => {
    for (const t of TEMPLATES) {
      const steps = compileShow(t(), 250);
      for (let i = 1; i < steps.length; i++) expect(steps[i]!.at - steps[i - 1]!.at, t().name).toBeGreaterThanOrEqual(1000);
    }
  });
});
