import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Same-origin relay to the PATLITE on the local network.
 * Browsers can't call the tower directly (no CORS headers, and HTTPS pages
 * can't call plain-HTTP LAN devices), so the app's own server forwards the
 * request. Only private-network hosts and simple query strings are allowed.
 * In the Home Assistant add-on, PATLITE_HOST (from add-on options) overrides
 * the host sent by the browser.
 */
const Body = z.object({
  protocol: z.enum(["http", "https"]),
  host: z.string().min(1).max(253),
  port: z.string().regex(/^\d{1,5}$/).or(z.literal("")),
  path: z.string().regex(/^\/[A-Za-z0-9_\-/.]*$/).max(200),
  query: z.record(z.string().regex(/^[A-Za-z0-9_]{1,32}$/), z.string().regex(/^[A-Za-z0-9_\-]{0,32}$/)).default({}),
  timeoutMs: z.number().int().min(200).max(15000).default(3000),
});

const isPrivateHost = (h: string) =>
  /^(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|127\.\d+\.\d+\.\d+)$/.test(h) ||
  /^[a-z0-9-]+(\.local)?$/i.test(h);

export const Route = createFileRoute("/api/device")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(await request.json());
        } catch {
          return Response.json({ ok: false, status: null, error: "Invalid request to device relay." }, { status: 400 });
        }
        const envHost = process.env["PATLITE_HOST"];
        const host = envHost || body.host;
        if (!isPrivateHost(host)) {
          return Response.json({ ok: false, status: null, error: `Host ${host} is not a local-network address.` }, { status: 400 });
        }
        const qs = new URLSearchParams(body.query).toString();
        const url = `${body.protocol}://${host}${body.port ? `:${body.port}` : ""}${body.path}${qs ? `?${qs}` : ""}`;
        const t0 = Date.now();
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), body.timeoutMs);
        try {
          const res = await fetch(url, { method: "GET", signal: ctrl.signal, headers: { Connection: "close" } });
          const text = (await res.text()).slice(0, 400);
          return Response.json({ ok: res.ok, status: res.status, body: text, ms: Date.now() - t0, url, hostOverride: !!envHost });
        } catch (e) {
          const msg = (e as Error).name === "AbortError"
            ? `The tower did not answer within ${body.timeoutMs} ms.`
            : `Could not reach the tower at ${url}: ${(e as Error).message}. This only works when the app runs on your local network (e.g. as the Home Assistant add-on).`;
          return Response.json({ ok: false, status: null, error: msg, ms: Date.now() - t0, url });
        } finally {
          clearTimeout(timer);
        }
      },
    },
  },
});
