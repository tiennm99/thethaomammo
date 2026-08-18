export const dynamic = "force-dynamic";

/** Liveness probe. @returns {Response} */
export function GET() {
  return Response.json({ ok: true, ts: Date.now() });
}
