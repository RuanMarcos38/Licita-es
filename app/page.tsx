"use client";
import {FormEvent,useEffect,useMemo,useState} from "react";

type Licitacao={
 id:string;numeroControlePNCP:string;numeroCompra:string;numeroProcesso:string;objetoCompra:string;
 informacaoComplementar?:string;modalidadeNome:string;situacaoCompraNome:string;valorTotalEstimado:number|null;
 dataPublicacaoPncp:string;dataAberturaProposta:string;dataEncerramentoProposta:string;orgaoRazaoSocial:string;
 orgaoCnpj:string;municipioNome:string;ufSigla:string;anoCompra:number|null;sequencialCompra:number|null;
 urlPncp:string;urlOrigem:string;
};
type Detail={contratacao:any;itens:any[];documentos:any[];historico:any[];consultadoEm:string};
type Tab="dashboard"|"licitacoes"|"favoritos"|"monitoramento"|"fontes"|"configuracoes";

const UFS=["","AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const MODS=[
 ["","Todas as modalidades"],["4","Concorrência eletrônica"],["5","Concorrência presencial"],["6","Pregão eletrônico"],
 ["7","Pregão presencial"],["8","Dispensa de licitação"],["9","Inexigibilidade"],["12","Credenciamento"]
];

const money=(v:number|null)=>v==null?"Não informado":new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(v);
const shortMoney=(v:number)=>{
 if(v>=1_000_000_000)return "R$ "+(v/1_000_000_000).toFixed(1).replace(".",",")+" bi";
 if(v>=1_000_000)return "R$ "+(v/1_000_000).toFixed(1).replace(".",",")+" mi";
 if(v>=1_000)return "R$ "+(v/1_000).toFixed(1).replace(".",",")+" mil";
 return money(v);
};
const date=(v:string)=>v?new Intl.DateTimeFormat("pt-BR",{dateStyle:"short"}).format(new Date(v)):"—";
const daysLeft=(v:string)=>{
 if(!v)return null;
 const d=Math.ceil((new Date(v).getTime()-Date.now())/86400000);
 return d;
};

function Icon({name}:{name:string}){return <span className="navIcon" aria-hidden>{name}</span>}

export default function Home(){
 const today=new Date().toISOString().slice(0,10);
 const before=new Date(Date.now()-6*86400000).toISOString().slice(0,10);
 const [query,setQuery]=useState("");
 const [uf,setUf]=useState("");
 const [modalidade,setModalidade]=useState("");
 const [inicio,setInicio]=useState(before);
 const [fim,setFim]=useState(today);
 const [items,setItems]=useState<Licitacao[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [fav,setFav]=useState<string[]>([]);
 const [tab,setTab]=useState<Tab>("dashboard");
 const [keywords,setKeywords]=useState<string[]>([]);
 const [newKeyword,setNewKeyword]=useState("");
 const [selected,setSelected]=useState<Licitacao|null>(null);
 const [detail,setDetail]=useState<Detail|null>(null);
 const [detailLoading,setDetailLoading]=useState(false);
 const [mobileMenu,setMobileMenu]=useState(false);

 useEffect(()=>{
   try{
    setFav(JSON.parse(localStorage.getItem("licitacoes:favoritos")||"[]"));
    setKeywords(JSON.parse(localStorage.getItem("licitacoes:keywords")||"[]"));
   }catch{}
 },[]);

 async function search(e?:FormEvent,goToList=true){
  e?.preventDefault(); setLoading(true); setError("");
  const p=new URLSearchParams({inicio,fim,paginas:"1"});
  if(query.trim())p.set("q",query.trim());
  if(uf)p.set("uf",uf);
  if(modalidade)p.set("modalidade",modalidade);
  try{
   const r=await fetch("/api/licitacoes?"+p.toString(),{cache:"no-store"});
   const j=await r.json();
   if(!r.ok)throw new Error(j.error||"Falha na consulta");
   setItems(j.items||[]);
   if(goToList)setTab("licitacoes");
  }catch(err){setError(err instanceof Error?err.message:"Erro ao consultar");}
  finally{setLoading(false);}
 }

 useEffect(()=>{search(undefined,false);},[]);

 function changeTab(next:Tab){setTab(next);setMobileMenu(false)}
 function toggleFav(id:string){
  const next=fav.includes(id)?fav.filter(x=>x!==id):[...fav,id];
  setFav(next); localStorage.setItem("licitacoes:favoritos",JSON.stringify(next));
 }
 function addKeyword(){
  const k=newKeyword.trim();
  if(!k||keywords.some(x=>x.toLowerCase()===k.toLowerCase()))return;
  const next=[...keywords,k];setKeywords(next);setNewKeyword("");localStorage.setItem("licitacoes:keywords",JSON.stringify(next));
 }
 function removeKeyword(k:string){
  const next=keywords.filter(x=>x!==k);setKeywords(next);localStorage.setItem("licitacoes:keywords",JSON.stringify(next));
 }
 function exportCsv(list:Licitacao[]=items){
  const rows=[["Órgão","Objeto","Modalidade","UF","Município","Valor","Publicação","Encerramento","PNCP"],...list.map(x=>[x.orgaoRazaoSocial,x.objetoCompra,x.modalidadeNome,x.ufSigla,x.municipioNome,String(x.valorTotalEstimado??""),x.dataPublicacaoPncp,x.dataEncerramentoProposta,x.urlPncp])];
  const csv=rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(";")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download="licitacoes-brasil.csv";a.click();URL.revokeObjectURL(a.href);
 }
 async function openDetail(x:Licitacao){
  setSelected(x);setDetail(null);
  if(!x.orgaoCnpj||!x.anoCompra||!x.sequencialCompra)return;
  setDetailLoading(true);
  try{
   const p=new URLSearchParams({cnpj:x.orgaoCnpj,ano:String(x.anoCompra),sequencial:String(x.sequencialCompra)});
   const r=await fetch("/api/licitacoes/detalhe?"+p.toString());
   const j=await r.json();
   if(r.ok)setDetail(j);
  }finally{setDetailLoading(false);}
 }

 const favorites=useMemo(()=>items.filter(x=>fav.includes(x.id)),[items,fav]);
 const matched=useMemo(()=>items.filter(x=>{
  const hay=(x.objetoCompra+" "+(x.informacaoComplementar||"")).toLowerCase();
  return keywords.some(k=>hay.includes(k.toLowerCase()));
 }),[items,keywords]);
 const totalValue=useMemo(()=>items.reduce((s,x)=>s+(x.valorTotalEstimado||0),0),[items]);
 const endingSoon=useMemo(()=>items.filter(x=>{const d=daysLeft(x.dataEncerramentoProposta);return d!==null&&d>=0&&d<=3}).length,[items]);
 const recent=items.slice(0,6);
 const byUf=useMemo(()=>{
   const map=new Map<string,number>();
   items.forEach(x=>{const k=x.ufSigla||"N/I";map.set(k,(map.get(k)||0)+1)});
   return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);
 },[items]);
 const maxUf=Math.max(1,...byUf.map(([,v])=>v));

 const title=tab==="dashboard"?"Dashboard":tab==="licitacoes"?"Buscar licitações":tab==="favoritos"?"Favoritos":tab==="monitoramento"?"Monitoramento inteligente":tab==="fontes"?"Fontes oficiais":"Configurações";

 return <div className="shell">
  <aside className={"sidebar "+(mobileMenu?"open":"")}>
   <div className="brand"><span className="brandMark">L</span><span><b>Licita Brasil</b><small>Compras públicas</small></span></div>
   <button className="collapseBtn" onClick={()=>setMobileMenu(false)}>‹</button>

   <div className="menuLabel">MENU PRINCIPAL</div>
   <nav>
    <button className={tab==="dashboard"?"active":""} onClick={()=>changeTab("dashboard")}><Icon name="⌂"/>Dashboard</button>
    <button className={tab==="licitacoes"?"active":""} onClick={()=>changeTab("licitacoes")}><Icon name="⌕"/>Buscar licitações</button>
    <button className={tab==="favoritos"?"active":""} onClick={()=>changeTab("favoritos")}><Icon name="☆"/>Favoritos <em>{fav.length}</em></button>
   </nav>

   <div className="menuLabel">INTELIGÊNCIA</div>
   <nav>
    <button className={tab==="monitoramento"?"active":""} onClick={()=>changeTab("monitoramento")}><Icon name="◎"/>Monitoramento <em>{keywords.length}</em></button>
    <button className={tab==="fontes"?"active":""} onClick={()=>changeTab("fontes")}><Icon name="✓"/>Fontes oficiais</button>
   </nav>

   <div className="menuLabel">GERAL</div>
   <nav>
    <button className={tab==="configuracoes"?"active":""} onClick={()=>changeTab("configuracoes")}><Icon name="⚙"/>Configurações</button>
    <a href="https://pncp.gov.br/app/editais" target="_blank"><Icon name="?"/>Central PNCP</a>
   </nav>

   <div className="sidePromo">
    <span className="promoIcon">◆</span><b>Dados oficiais</b>
    <p>Consulta integrada ao Portal Nacional de Contratações Públicas.</p>
    <a href="https://pncp.gov.br" target="_blank">Acessar PNCP ↗</a>
   </div>
  </aside>

  <main className="workspace">
   <div className="topbar">
    <button className="menuBtn" onClick={()=>setMobileMenu(!mobileMenu)}>☰</button>
    <form className="globalSearch" onSubmit={e=>search(e,true)}>
      <span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar licitações, órgãos ou produtos"/>
      <kbd>↵</kbd>
    </form>
    <div className="topActions">
      <button title="Ajuda">?</button><button title="Notificações">♢</button>
      <div className="profile"><span>LB</span><div><b>Licita Brasil</b><small>Administrador</small></div></div>
    </div>
   </div>

   <section className="content">
    <div className="pageHead">
      <div><h1>{title}</h1><p>{tab==="dashboard"?"Monitore oportunidades públicas e encontre novos negócios em todo o Brasil.":"Dados oficiais do PNCP organizados para acelerar sua análise comercial."}</p></div>
      <div className="headActions"><span className="datePill">▣ {new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium"}).format(new Date())}</span><button className="darkBtn" onClick={()=>exportCsv(tab==="favoritos"?favorites:items)}>⇩ Exportar</button></div>
    </div>

    {error&&<div className="error">{error}</div>}

    {tab==="dashboard"&&<>
      <section className="metrics">
       <article><div className="metricTop"><span className="metricIcon">▣</span><b>Oportunidades encontradas</b><button>•••</button></div><strong>{items.length}</strong><p><span className="up">PNCP</span> consulta dos últimos 7 dias</p></article>
       <article><div className="metricTop"><span className="metricIcon">R$</span><b>Valor potencial</b><button>•••</button></div><strong>{shortMoney(totalValue)}</strong><p><span className="up">Estimado</span> nos processos listados</p></article>
       <article><div className="metricTop"><span className="metricIcon">★</span><b>Favoritas</b><button>•••</button></div><strong>{fav.length}</strong><p><span className="up">{matched.length} matches</span> com seus interesses</p></article>
      </section>

      <section className="dashboardGrid">
       <article className="panel overview">
        <div className="panelTitle"><div><span className="miniIcon">☷</span><b>Visão geral por estado</b></div><span className="legendDot">● oportunidades</span></div>
        <div className="chart">
         {byUf.length?byUf.map(([label,value])=><div className="barCol" key={label}><div className="barValue">{value}</div><div className="bar" style={{height:Math.max(18,(value/maxUf)*150)}}></div><span>{label}</span></div>):<div className="chartEmpty">Carregando dados oficiais...</div>}
        </div>
       </article>
       <article className="panel quick">
        <div className="panelTitle"><b>Resumo rápido</b><button>•••</button></div>
        <div className="quickItem"><span className="qIcon">◷</span><div><b>{endingSoon}</b><small>encerram em até 3 dias</small></div></div>
        <div className="quickItem"><span className="qIcon">◎</span><div><b>{matched.length}</b><small>compatíveis com monitoramento</small></div></div>
        <div className="quickItem"><span className="qIcon">☆</span><div><b>{favorites.length}</b><small>favoritas nesta consulta</small></div></div>
        <button className="greenBtn full" onClick={()=>changeTab("licitacoes")}>Ver todas as oportunidades</button>
       </article>
      </section>

      <section className="panel recentPanel">
       <div className="panelTitle"><div><span className="miniIcon">↗</span><b>Licitações recentes</b></div><button className="textBtn" onClick={()=>changeTab("licitacoes")}>Ver todas</button></div>
       <div className="tableWrap"><table><thead><tr><th>Oportunidade</th><th>Órgão</th><th>Local</th><th>Valor estimado</th><th>Prazo</th><th>Status</th><th></th></tr></thead>
       <tbody>{recent.map(x=>{const d=daysLeft(x.dataEncerramentoProposta);return <tr key={x.id}><td><b>{x.objetoCompra}</b><small>{x.modalidadeNome}</small></td><td>{x.orgaoRazaoSocial}</td><td>{x.municipioNome||"—"} / {x.ufSigla||"—"}</td><td><b>{money(x.valorTotalEstimado)}</b></td><td>{d===null?"—":d<0?"Encerrada":d===0?"Hoje":d+" dias"}</td><td><span className="status live">Publicada</span></td><td><button className="dots" onClick={()=>openDetail(x)}>•••</button></td></tr>})}</tbody></table></div>
      </section>
    </>}

    {(tab==="licitacoes"||tab==="favoritos")&&<>
      <form className="searchPanel" onSubmit={e=>search(e,true)}>
       <div className="searchLine"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex.: material gráfico, software, uniformes, alimentos..."/><button className="greenBtn" disabled={loading}>{loading?"Consultando...":"Buscar"}</button></div>
       <div className="filters">
        <label>UF<select value={uf} onChange={e=>setUf(e.target.value)}>{UFS.map(x=><option key={x} value={x}>{x||"Todo Brasil"}</option>)}</select></label>
        <label>Modalidade<select value={modalidade} onChange={e=>setModalidade(e.target.value)}>{MODS.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
        <label>Publicação inicial<input type="date" value={inicio} onChange={e=>setInicio(e.target.value)}/></label>
        <label>Publicação final<input type="date" value={fim} onChange={e=>setFim(e.target.value)}/></label>
       </div>
      </form>
      <div className="listHeader"><div><b>{(tab==="favoritos"?favorites:items).length} oportunidades</b><span> • fonte oficial PNCP</span></div><button onClick={()=>exportCsv(tab==="favoritos"?favorites:items)}>⇩ Exportar CSV</button></div>
      <div className="cards">
       {(tab==="favoritos"?favorites:items).map(x=><article className="tenderCard" key={x.id}>
        <div className="cardTop"><span className="badge">{x.modalidadeNome}</span><button className={"star "+(fav.includes(x.id)?"saved":"")} onClick={()=>toggleFav(x.id)}>★</button></div>
        <h2>{x.objetoCompra}</h2><p className="org">{x.orgaoRazaoSocial}</p>
        <div className="meta"><span>⌖ {x.municipioNome||"Não informado"}{x.ufSigla?" / "+x.ufSigla:""}</span><span>▣ {x.numeroCompra||x.numeroProcesso||"Sem número"}</span></div>
        <div className="details"><div><small>Valor estimado</small><b>{money(x.valorTotalEstimado)}</b></div><div><small>Publicação</small><b>{date(x.dataPublicacaoPncp)}</b></div><div><small>Encerramento</small><b>{date(x.dataEncerramentoProposta)}</b></div></div>
        <div className="cardActions"><button className="darkBtn" onClick={()=>openDetail(x)}>Ver detalhes</button><a href={x.urlPncp} target="_blank">Abrir PNCP ↗</a></div>
       </article>)}
       {!loading&&!(tab==="favoritos"?favorites:items).length&&<div className="empty">Nenhuma oportunidade encontrada nesta visualização.</div>}
      </div>
    </>}

    {tab==="monitoramento"&&<section className="settingsGrid">
      <article className="panel"><div className="panelTitle"><b>Palavras-chave monitoradas</b><span className="status live">Ativo</span></div><p className="muted">Cadastre os produtos e serviços da empresa. O sistema compara os termos com as oportunidades obtidas do PNCP.</p>
       <div className="keywordForm"><input value={newKeyword} onChange={e=>setNewKeyword(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addKeyword()}}} placeholder="Ex.: copos personalizados"/><button className="greenBtn" onClick={addKeyword}>Adicionar</button></div>
       <div className="chips">{keywords.map(k=><span key={k}>{k}<button onClick={()=>removeKeyword(k)}>×</button></span>)}{!keywords.length&&<small className="muted">Nenhuma palavra monitorada ainda.</small>}</div>
      </article>
      <article className="panel matchPanel"><span className="metricIcon">◎</span><strong>{matched.length}</strong><h3>oportunidades compatíveis</h3><p>na consulta atual</p><button className="greenBtn full" onClick={()=>changeTab("licitacoes")}>Analisar oportunidades</button></article>
    </section>}

    {tab==="fontes"&&<section className="sourceGrid">
      <article className="panel sourceCard"><span className="sourceLogo">P</span><span className="status live">OFICIAL</span><h2>PNCP</h2><p>Portal Nacional de Contratações Públicas. É a fonte de dados utilizada pelo buscador e pelos detalhes de itens, documentos e histórico.</p><a href="https://pncp.gov.br" target="_blank">Acessar portal ↗</a></article>
      <article className="panel sourceCard"><span className="sourceLogo">C</span><span className="status live">OFICIAL</span><h2>Compras.gov.br</h2><p>Portal de compras do Governo Federal. Mantido como fonte complementar e caminho de expansão do sistema.</p><a href="https://www.gov.br/compras" target="_blank">Acessar portal ↗</a></article>
      <article className="panel sourceCard"><span className="sourceLogo">✓</span><span className="status live">SEGURANÇA</span><h2>Validação oficial</h2><p>Antes de participar, confira prazos, anexos, retificações e regras diretamente no documento oficial.</p></article>
    </section>}

    {tab==="configuracoes"&&<section className="settingsGrid">
      <article className="panel"><h2>Preferências de busca</h2><p className="muted">Configure os filtros padrão usados no painel.</p><div className="formStack"><label>Estado padrão<select value={uf} onChange={e=>setUf(e.target.value)}>{UFS.map(x=><option key={x} value={x}>{x||"Todo Brasil"}</option>)}</select></label><label>Modalidade padrão<select value={modalidade} onChange={e=>setModalidade(e.target.value)}>{MODS.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label></div></article>
      <article className="panel"><h2>Status do backend</h2><div className="health"><span></span><div><b>API operacional</b><small>Integração PNCP via backend Next.js</small></div></div><p className="muted">As consultas ao PNCP são executadas no servidor e entregues ao frontend já normalizadas.</p></article>
    </section>}
   </section>
  </main>

  {selected&&<div className="modalBackdrop" onMouseDown={()=>{setSelected(null);setDetail(null)}}>
   <div className="modal" onMouseDown={e=>e.stopPropagation()}>
    <div className="modalHead"><div><span className="badge">{selected.modalidadeNome}</span><h2>Detalhes da licitação</h2></div><button onClick={()=>{setSelected(null);setDetail(null)}}>×</button></div>
    <div className="modalBody">
      <h3>{selected.objetoCompra}</h3><p className="org">{selected.orgaoRazaoSocial}</p>
      <div className="detailSummary"><div><small>Local</small><b>{selected.municipioNome||"—"} / {selected.ufSigla||"—"}</b></div><div><small>Valor estimado</small><b>{money(selected.valorTotalEstimado)}</b></div><div><small>Encerramento</small><b>{date(selected.dataEncerramentoProposta)}</b></div></div>
      {detailLoading&&<div className="loadingBox">Consultando itens e documentos oficiais...</div>}
      {!detailLoading&&detail&&<>
       <div className="detailSection"><div className="panelTitle"><b>Itens da contratação</b><span>{detail.itens.length}</span></div><div className="detailList">{detail.itens.slice(0,20).map((it:any,i)=><div key={i}><b>{it.numeroItem?("#"+it.numeroItem+" "):""}{it.descricao||it.materialOuServicoNome||"Item da contratação"}</b><span>{it.quantidade?("Qtd. "+it.quantidade):""}{it.valorUnitarioEstimado?(" • "+money(Number(it.valorUnitarioEstimado))):""}</span></div>)}{!detail.itens.length&&<p className="muted">Nenhum item retornado pela fonte.</p>}</div></div>
       <div className="detailSection"><div className="panelTitle"><b>Documentos e anexos</b><span>{detail.documentos.length}</span></div><div className="detailList">{detail.documentos.slice(0,20).map((doc:any,i)=><a key={i} href={doc.uri||doc.url||"#"} target="_blank"><b>{doc.titulo||doc.tipoDocumentoNome||"Documento"}</b><span>{doc.dataPublicacaoPncp?date(doc.dataPublicacaoPncp):"Abrir documento"} ↗</span></a>)}{!detail.documentos.length&&<p className="muted">Nenhum documento retornado pela fonte.</p>}</div></div>
      </>}
    </div>
    <div className="modalFoot"><a className="greenBtn" href={selected.urlPncp} target="_blank">Abrir processo no PNCP ↗</a></div>
   </div>
  </div>}
 </div>;
}
