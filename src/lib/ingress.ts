// Home Assistant ingress serves the add-on under /api/hassio_ingress/<token>.
// The server injects that prefix as window.__INGRESS_PATH__ (see src/server.ts).
declare global {
  interface Window {
    __INGRESS_PATH__?: string;
  }
}

export function ingressPrefix(): string {
  if (typeof window === "undefined") return "";
  const p = window.__INGRESS_PATH__ ?? "";
  return p.replace(/\/$/, "");
}

export function withIngress(path: string): string {
  return `${ingressPrefix()}${path}`;
}

/** Rewrite root-absolute URLs in server HTML so they resolve under the ingress prefix. */
export function rewriteIngressHtml(html: string, prefix: string): string {
  const p = prefix.replace(/\/$/, "");
  if (!p) return html;
  const out = html
    .replace(/(["'(])\/(assets|_build|_serverFn|favicon\.ico)/g, `$1${p}/$2`)
    .replace(/(href|src|action)="\/(?!\/)/g, `$1="${p}/`);
  const tag = `<script>window.__INGRESS_PATH__=${JSON.stringify(p)}</script>`;
  return out.includes("<head>") ? out.replace("<head>", `<head>${tag}`) : tag + out;
}
