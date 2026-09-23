"use client";
import {FormEvent,useEffect,useMemo,useState} from "react";

type L={
 id:string;numeroControlePNCP:string;numeroCompra:string;numeroProcesso:string;objetoCompra:string;
 modalidadeNome:string;situacaoCompraNome:string;valorTotalEstimado:number|null;dataPublicacaoPncp:string;
 dataAberturaProposta:string;dataEncerramentoProposta:string;orgaoRazaoSocial:string;municipioNome:string;
 ufSigla:string;urlPncp:string;urlOrigem:string;
};

const UFS=["","AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const MODS=[
 ["","Todas as modalidades"],["4","Concorrência eletrônica"],["5","Concorrência presencial"],["6","Pregão eletrônico"],
 ["7","Pregão presencial"],["8","Dispensa de licitação"],["9","Inexigibilidade"],["12","Credenciamento"]
];
const money=(v:number|null)=>v==null?"Não informado":new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const date=(v:string)=>v?new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:v.includes("T")?"short":undefined}).format(new Date(v)):"—";

export default function Home(){
 const today=new Date().toISOString().slice(0,10);
 const before=new Date(Date.now()-2*86400000).toISOString().slice(0,10);
 const [query,setQuery]=useState("");
 const [uf,setUf]=useState("");
 const [modalidade,setModalidade]=useState("");
 const [inicio,setInicio]=useState(before);
 const [fim,setFim]=useState(today);
 const [items,setItems]=useState<L[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [fav,setFav]=useState<string[]>([]);
 const [tab,setTab]=useState<"oportunidades"|"favoritos"|"monitoramento"|"fontes">("oportunidades");
 const [keywords,setKeywords]=useState<string[]>([]);
 const [newKeyword,setNewKeyword]=useState("");

 useEffect(()=>{
   try{
    setFav(JSON.parse(localStorage.getItem("licitacoes:favoritos")||"[]"));
    setKeywords(JSON.parse(localStorage.getItem("licitacoes:keywords")||"[]"));
   }catch{}
 },[]);

 async function search(e?:FormEvent){
  e?.preventDefault(); setLoading(true); setError("");
  const p=new URLSearchParams({inicio,fim,paginas:"2"});
  if(query.trim()) p.set("q",query.trim());
  if(uf) p.set("uf",uf);
  if(modalidade) p.set("modalidade",modalidade);
  try{
   const r=await fetch("/api/licitacoes?"+p.toString());
   const j=await r.json();
   if(!r.ok) throw new Error(j.error||"Falha na consulta");
   setItems(j.items||[]); setTab("oportunidades");
  }catch(err){setError(err instanceof Error?err.message:"Erro ao consultar");}
  finally{setLoading(false);}
 }

 useEffect(()=>{search();},[]);

 function toggleFav(id:string){
  const next=fav.includes(id)?fav.filter(x=>x!==id):[...fav,id];
  setFav(next); localStorage.setItem("licitacoes:favoritos",JSON.stringify(next));
 }
 function addKeyword(){
  const k=newKeyword.trim();
  if(!k||keywords.includes(k)) return;
  const next=[...keywords,k]; setKeywords(next); setNewKeyword(""); localStorage.setItem("licitacoes:keywords",JSON.stringify(next));
 }
 function removeKeyword(k:string){
  const next=keywords.filter(x=>x!==k); setKeywords(next); localStorage.setItem("licitacoes:keywords",JSON.stringify(next));
 }
 function exportCsv(){
  const rows=[["Órgão","Objeto","Modalidade","UF","Município","Valor","Publicação","PNCP"],...visible.map(x=>[x.orgaoRazaoSocial,x.objetoCompra,x.modalidadeNome,x.ufSigla,x.municipioNome,String(x.valorTotalEstimado??""),x.dataPublicacaoPncp,x.urlPncp])];
  const csv=rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(";")).join("\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"})); a.download="licitacoes.csv"; a.click();
 }
 const visible=useMemo(()=>tab==="favoritos"?items.filter(x=>fav.includes(x.id)):items,[tab,items,fav]);
 const matched=useMemo(()=>items.filter(x=>keywords.some(k=>x.objetoCompra.toLowerCase().includes(k.toLowerCase()))),[items,keywords]);
 const totalValue=items.reduce((s,x)=>s+(x.valorTotalEstimado||0),0);

 return <div className="app">
  <aside className="sidebar">
   <div className="brand"><span className="logo">L</span><div><b>Licitações Brasil</b><small>Inteligência pública</small></div></div>
   <nav>
    <button className={tab==="oportunidades"?"active":""} onClick={()=>setTab("oportunidades")}>⌕ Oportunidades</button>
    <button className={tab==="favoritos"?"active":""} onClick={()=>setTab("favoritos")}>★ Favoritos <span>{fav.length}</span></button>
    <button className={tab==="monitoramento"?"active":""} onClick={()=>setTab("monitoramento")}>◉ Monitoramento</button>
    <button className={tab==="fontes"?"active":""} onClick={()=>setTab("fontes")}>✓ Fontes oficiais</button>
   </nav>
   <div className="sourceBox"><b>Fonte principal</b><span>PNCP • Governo Federal</span><small>Dados oficiais e atualizados</small></div>
  </aside>
  <main>
   <header><div><h1>{tab==="favoritos"?"Favoritos":tab==="monitoramento"?"Monitoramento":tab==="fontes"?"Fontes oficiais":"Oportunidades públicas"}</h1><p>Encontre editais e contratações públicas em todo o Brasil.</p></div><a className="official" href="https://pncp.gov.br/app/editais" target="_blank">Abrir PNCP ↗</a></header>

   {(tab==="oportunidades"||tab==="favoritos")&&<>
    <form className="searchPanel" onSubmit={search}>
     <div className="searchInput"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex.: material gráfico, software, uniformes, alimentos..."/></div>
     <div className="filters">
      <label>UF<select value={uf} onChange={e=>setUf(e.target.value)}>{UFS.map(x=><option key={x} value={x}>{x||"Todo Brasil"}</option>)}</select></label>
      <label>Modalidade<select value={modalidade} onChange={e=>setModalidade(e.target.value)}>{MODS.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
      <label>De<input type="date" value={inicio} onChange={e=>setInicio(e.target.value)}/></label>
      <label>Até<input type="date" value={fim} onChange={e=>setFim(e.target.value)}/></label>
      <button className="primary" disabled={loading}>{loading?"Consultando...":"Buscar oportunidades"}</button>
     </div>
    </form>

    <section className="stats">
     <article><small>Encontradas</small><strong>{items.length}</strong><span>na consulta atual</span></article>
     <article><small>Valor estimado</small><strong>{money(totalValue)}</strong><span>soma dos valores informados</span></article>
     <article><small>Favoritas</small><strong>{fav.length}</strong><span>salvas neste navegador</span></article>
     <article><small>Monitoradas</small><strong>{matched.length}</strong><span>compatíveis com palavras-chave</span></article>
    </section>

    <div className="listHeader"><div><b>{visible.length} oportunidades</b><span> • fonte PNCP</span></div><button onClick={exportCsv} disabled={!visible.length}>Exportar CSV</button></div>
    {error&&<div className="error">{error}</div>}
    <div className="cards">
     {!loading&&!visible.length&&<div className="empty">Nenhuma oportunidade encontrada com estes filtros. Tente ampliar o período ou remover a palavra-chave.</div>}
     {visible.map(x=><article className="card" key={x.id}>
      <div className="cardTop"><span className="badge">{x.modalidadeNome}</span><button className={"star "+(fav.includes(x.id)?"saved":"")} onClick={()=>toggleFav(x.id)}>★</button></div>
      <h2>{x.objetoCompra}</h2>
      <p className="org">{x.orgaoRazaoSocial}</p>
      <div className="meta"><span>📍 {x.municipioNome||"Município não informado"}{x.ufSigla?" / "+x.ufSigla:""}</span><span>▣ {x.numeroCompra||x.numeroProcesso||"Processo não informado"}</span></div>
      <div className="details"><div><small>Valor estimado</small><b>{money(x.valorTotalEstimado)}</b></div><div><small>Publicação</small><b>{date(x.dataPublicacaoPncp)}</b></div><div><small>Encerramento</small><b>{date(x.dataEncerramentoProposta)}</b></div></div>
      <div className="cardActions"><a href={x.urlPncp} target="_blank">Ver no PNCP ↗</a>{x.urlOrigem&&<a className="secondary" href={x.urlOrigem} target="_blank">Portal de origem ↗</a>}</div>
     </article>)}
    </div>
   </>}

   {tab==="monitoramento"&&<section className="settings">
    <div className="panel"><h2>Palavras-chave monitoradas</h2><p>Cadastre produtos e serviços que sua empresa vende. O painel destaca oportunidades compatíveis na consulta atual.</p>
     <div className="keywordForm"><input value={newKeyword} onChange={e=>setNewKeyword(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addKeyword();}}} placeholder="Ex.: copos personalizados"/><button onClick={addKeyword}>Adicionar</button></div>
     <div className="chips">{keywords.map(k=><span key={k}>{k}<button onClick={()=>removeKeyword(k)}>×</button></span>)}</div>
    </div>
    <div className="panel"><h2>Oportunidades compatíveis</h2><strong className="big">{matched.length}</strong><p>Resultados da busca atual que contêm alguma palavra monitorada.</p><button className="primary" onClick={()=>setTab("oportunidades")}>Ver oportunidades</button></div>
   </section>}

   {tab==="fontes"&&<section className="sources">
    <article><div className="verified">✓ OFICIAL</div><h2>PNCP</h2><p>Portal Nacional de Contratações Públicas. É a fonte principal usada automaticamente pelo sistema para pesquisar contratações publicadas.</p><a href="https://pncp.gov.br" target="_blank">Acessar fonte ↗</a></article>
    <article><div className="verified">✓ OFICIAL</div><h2>Compras.gov.br</h2><p>Portal de compras do Governo Federal, com dados abertos e documentação de API para ampliar futuras integrações.</p><a href="https://www.gov.br/compras" target="_blank">Acessar fonte ↗</a></article>
    <article><div className="verified">✓ VERIFICAÇÃO</div><h2>Regra de segurança</h2><p>O sistema mantém o link da fonte oficial. Antes de participar, confirme prazos, anexos, retificações e exigências diretamente no edital oficial.</p></article>
   </section>}
  </main>
 </div>;
}
