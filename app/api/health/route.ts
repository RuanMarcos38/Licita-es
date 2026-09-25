import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PNCP_HEALTH_URL = "https://pncp.gov.br/api/pncp/v1/modalidades?statusAtivo=true";

export async function GET() {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  let pncp = false;
  let pncpStatus: number | null = null;

  try {
    const response = await fetch(PNCP_HEALTH_URL, {
      headers: { Accept: "application/json", "User-Agent": "LicitaBrasil/1.0" },
      signal: controller.signal,
      cache: "no-store"
    });
    pncp = response.ok;
    pncpStatus = response.status;
  } catch {
    pncp = false;
  } finally {
    clearTimeout(timeout);
  }

  const body = {
    status: pncp ? "ok" : "degraded",
    service: "Licitações Brasil",
    backend: true,
    source: "PNCP",
    dependencies: {
      pncp: {
        ok: pncp,
        httpStatus: pncpStatus
      }
    },
    responseTimeMs: Date.now() - startedAt,
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(body, {
    status: pncp ? 200 : 503,
    headers: { "Cache-Control": "no-store" }
  });
}
