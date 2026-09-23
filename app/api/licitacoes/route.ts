import { NextRequest, NextResponse } from "next/server";
import { buscarLicitacoes } from "@/lib/pncp";

export const runtime = "nodejs";

function parseDate(value:string|null,fallback:Date){
  if(!value)return fallback;
  const d=new Date(value+"T12:00:00");
  return Number.isNaN(d.getTime())?fallback:d;
}
function ymd(date:Date){return date.toISOString().slice(0,10).replace(/-/g,"")}

export async function GET(request:NextRequest){
  const q=request.nextUrl.searchParams;
  const end=parseDate(q.get("fim"),new Date());
  const fallbackStart=new Date(end); fallbackStart.setDate(fallbackStart.getDate()-6);
  const start=parseDate(q.get("inicio"),fallbackStart);

  if(start>end)return NextResponse.json({error:"A data inicial não pode ser posterior à data final."},{status:400});
  if(end.getTime()-start.getTime()>366*86400000)return NextResponse.json({error:"Consulte no máximo 366 dias por busca."},{status:400});

  const modalidade=Number(q.get("modalidade"))||null;
  const uf=(q.get("uf")||"").toUpperCase().replace(/[^A-Z]/g,"").slice(0,2);

  try{
    const result=await buscarLicitacoes({
      dataInicial:ymd(start),
      dataFinal:ymd(end),
      modalidade,
      uf:uf||undefined,
      keyword:q.get("q")||undefined,
      paginas:Math.max(1,Math.min(Number(q.get("paginas"))||1,3))
    });
    return NextResponse.json(result,{headers:{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=900"}});
  }catch(error){
    return NextResponse.json({error:"Não foi possível consultar o PNCP agora.",detail:error instanceof Error?error.message:"erro desconhecido"},{status:502});
  }
}
