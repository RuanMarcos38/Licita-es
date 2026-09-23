const BASE="https://pncp.gov.br/api/pncp/v1";

export type PncpDetail={
  contratacao:any;
  itens:any[];
  documentos:any[];
  historico:any[];
  consultadoEm:string;
};

function validCnpj(value:string){return /^\d{14}$/.test(value)}
function validYear(value:number){return Number.isInteger(value)&&value>=2021&&value<=2100}
function validSeq(value:number){return Number.isInteger(value)&&value>0}

async function safeJson(url:string){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const r=await fetch(url,{headers:{Accept:"application/json","User-Agent":"LicitaBrasil/1.0"},signal:controller.signal,next:{revalidate:900}});
    if(!r.ok)return null;
    return await r.json();
  }catch{return null}
  finally{clearTimeout(timeout)}
}

export async function buscarDetalheContratacao(cnpj:string,ano:number,sequencial:number):Promise<PncpDetail>{
  if(!validCnpj(cnpj)||!validYear(ano)||!validSeq(sequencial))throw new Error("Parâmetros inválidos");
  const root=`${BASE}/orgaos/${cnpj}/compras/${ano}/${sequencial}`;
  const [contratacao,itens,documentos,historico]=await Promise.all([
    safeJson(root),
    safeJson(root+"/itens"),
    safeJson(root+"/arquivos"),
    safeJson(root+"/historico")
  ]);
  return {
    contratacao:contratacao||{},
    itens:Array.isArray(itens)?itens:Array.isArray(itens?.data)?itens.data:[],
    documentos:Array.isArray(documentos)?documentos:Array.isArray(documentos?.data)?documentos.data:[],
    historico:Array.isArray(historico)?historico:Array.isArray(historico?.data)?historico.data:[],
    consultadoEm:new Date().toISOString()
  };
}
