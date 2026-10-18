import { describe, it, expect } from "vitest";
import { rewriteIngressHtml } from "@/lib/ingress";
describe("ingress rewrite", () => {
  it("prefixes asset and link URLs and injects the prefix", () => {
    const out = rewriteIngressHtml('<head></head><script src="/assets/a.js"></script><a href="/live">x</a>', "/api/hassio_ingress/abc");
    expect(out).toContain('src="/api/hassio_ingress/abc/assets/a.js"');
    expect(out).toContain('href="/api/hassio_ingress/abc/live"');
    expect(out).toContain('window.__INGRESS_PATH__="/api/hassio_ingress/abc"');
  });
});
