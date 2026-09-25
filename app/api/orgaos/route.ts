import { NextRequest, NextResponse } from "next/server";
import { consultarOrgaoPorCnpj, descobrirOrgaosAtivos } from "@/lib/orgaos";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const cnpj = (q.get("cnpj") || "").replace(/\D/g, "");

  try {
    if (cnpj) {
      const item = await consultarOrgaoPorCnpj(cnpj);
      return NextResponse.json({
        items: [item],
        total: 1,
        fonte: "PNCP",
        atualizadoEm: new Date().toISOString()
      }, {
        headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=1800" }
      });
    }

    const result = await descobrirOrgaosAtivos({
      q: q.get("q") || undefined,
      uf: (q.get("uf") || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2) || undefined,
      dias: Number(q.get("dias")) || 60
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=1800" }
    });
  } catch (err) {
    return NextResponse.json({
      error: "Não foi possível consultar os órgãos agora.",
      detail: err instanceof Error ? err.message : "erro desconhecido"
    }, { status: 502 });
  }
}
