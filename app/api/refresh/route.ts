import { NextResponse } from "next/server";
import { buscarLicitacoes } from "@/lib/pncp";
import { descobrirOrgaosAtivos } from "@/lib/orgaos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 30);
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

  const started = Date.now();
  const [licitacoes, orgaos] = await Promise.all([
    buscarLicitacoes({
      dataInicial: ymd(inicio),
      dataFinal: ymd(fim),
      paginas: 2
    }),
    descobrirOrgaosAtivos({ dias: 60 })
  ]);

  return NextResponse.json({
    status: "ok",
    regraAtualizacaoMinutos: 30,
    licitacoes: licitacoes.items.length,
    orgaos: orgaos.total,
    durationMs: Date.now() - started,
    atualizadoEm: new Date().toISOString()
  }, {
    headers: { "Cache-Control": "no-store" }
  });
}
