// Counts finished compressions: one data point per file, holding only "pdf"
// or "jpg". No IP, cookie, file name or size is read or stored. Cloudflare
// keeps Analytics Engine data for three months.

interface Env {
  USAGE: { writeDataPoint(point: { blobs?: string[]; indexes?: string[] }): void };
}

const KINDS = new Set(["pdf", "jpg"]);

export async function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  // Turns away other sites' pages. A script can still fake this, so the counts are a rough guide.
  if (request.headers.get("Origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
  const kind = (await request.text()).slice(0, 8);
  if (!KINDS.has(kind)) return new Response(null, { status: 400 });
  env.USAGE.writeDataPoint({ blobs: [kind], indexes: [kind] });
  return new Response(null, { status: 204 });
}
