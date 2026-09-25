import { NextResponse } from "next/server";
import { PLATAFORMAS } from "@/lib/plataformas";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    items: PLATAFORMAS,
    atualizadoEm: new Date().toISOString(),
    participacaoDireta: false,
    motivo: "O envio de proposta/lance depende de APIs oficiais, credenciamento da plataforma e credenciais do fornecedor."
  }, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=1800" }
  });
}
