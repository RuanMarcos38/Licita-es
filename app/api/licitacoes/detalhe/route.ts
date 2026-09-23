import {NextRequest,NextResponse} from "next/server";
import {buscarDetalheContratacao} from "@/lib/pncp-detail";

export const runtime="nodejs";

export async function GET(request:NextRequest){
  const q=request.nextUrl.searchParams;
  const cnpj=(q.get("cnpj")||"").replace(/\D/g,"");
  const ano=Number(q.get("ano"));
  const sequencial=Number(q.get("sequencial"));
  if(!/^\d{14}$/.test(cnpj)||!Number.isInteger(ano)||!Number.isInteger(sequencial)||sequencial<=0){
    return NextResponse.json({error:"CNPJ, ano e sequencial são obrigatórios."},{status:400});
  }
  try{
    const data=await buscarDetalheContratacao(cnpj,ano,sequencial);
    return NextResponse.json(data,{headers:{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=900"}});
  }catch(error){
    return NextResponse.json({error:"Não foi possível consultar os detalhes oficiais.",detail:error instanceof Error?error.message:"erro desconhecido"},{status:502});
  }
}
