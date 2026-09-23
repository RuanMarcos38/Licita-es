import { NextRequest, NextResponse } from "next/server";
import { buscarLicitacoes } from "@/lib/pncp";

export const runtime = "nodejs";

function ymd(value:string|null, fallback:Date){
  if(!value) return fallback.toISOString().slice(0,10).replace(/-/g,"");
  const clean=value.replace(/\D/g,"");
  return /^\d{8}$/.test(clean)?clean:fallback.toISOString().slice(0,10).replace(/-/g,"");
}

export async function GET(request:NextRequest){
  const q=request.nextUrl.searchParams;
  const end=new Date();
  const start=new Date();
  start.setDate(end.getDate()-2);
  const modalidade=Number(q.get("modalidade"))||null;
  const dataInicial=ymd(q.get("inicio"),start);
  const dataFinal=ymd(q.get("fim"),end);

  if(Number(dataFinal)-Number(dataInicial)>10000){
    return NextResponse.json({error:"Use períodos menores para obter resultados mais precisos."},{status:400});
  }

  try{
    const result=await buscarLicitacoes({
      dataInicial,
      dataFinal,
      modalidade,
      uf:(q.get("uf")||"").toUpperCase().slice(0,2) || undefined,
      keyword:q.get("q")||undefined,
      paginas:Number(q.get("paginas"))||1
    });
    return NextResponse.json(result,{headers:{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=900"}});
  }catch(error){
    return NextResponse.json({error:"Não foi possível consultar o PNCP agora.",detail:error instanceof Error?error.message:"erro desconhecido"},{status:502});
  }
}
