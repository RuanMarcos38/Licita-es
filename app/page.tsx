"use client";
import {FormEvent,useEffect,useMemo,useState} from "react";

type Licitacao={
  id:string;numeroControlePNCP:string;numeroCompra:string;numeroProcesso:string;objetoCompra:string;
  informacaoComplementar?:string;modalidadeNome:string;situacaoCompraNome:string;valorTotalEstimado:number|null;
  dataPublicacaoPncp:string;dataAberturaProposta:string;dataEncerramentoProposta:string;orgaoRazaoSocial:string;
  orgaoCnpj:string;municipioNome:string;ufSigla:string;anoCompra:number|null;sequencialCompra:number|null;
  urlPncp:string;urlOrigem:string;
};
type Detail={contratacao:any;itens:any[];documentos:any[];historico:any[];consultadoEm:string;parcial?:boolean};
type OrgaoPublico={cnpj:string;razaoSocial:string;esfera:string;poder:string;uf:string;municipio:string;oportunidades:number;valorEstimado:number;ultimaPublicacao:string;fonte:string};
type Plataforma={id:string;nome:string;dominio:string;tipo:string;consulta:boolean;participacaoInterna:boolean;requisito:string};
type Tab="dashboard"|"licitacoes"|"favoritos"|"monitoramento"|"orgaos"|"participacao"|"fontes"|"configuracoes";

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
 return Math.ceil((new Date(v).getTime()-Date.now())/86400000);
};

function I({children}:{children:React.ReactNode}){return <span className="ico">{children}</span>}

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
 const [orgaos,setOrgaos]=useState<OrgaoPublico[]>([]);
 const [orgQuery,setOrgQuery]=useState("");
 const [orgLoading,setOrgLoading]=useState(false);
 const [orgError,setOrgError]=useState("");
 const [orgUpdated,setOrgUpdated]=useState("");
 const [plataformas,setPlataformas]=useState<Plataforma[]>([]);
 const [participationItem,setParticipationItem]=useState<Licitacao|null>(null);

 useEffect(()=>{
  try{
   setFav(JSON.parse(localStorage.getItem("licitacoes:favoritos")||"[]"));
   setKeywords(JSON.parse(localStorage.getItem("licitacoes:keywords")||"[]"));
  }catch{}
 },[]);

 async function search(e?:FormEvent,goToList=true){
  e?.preventDefault();
  setLoading(true);setError("");
  const p=new URLSearchParams({inicio,fim,paginas:"1"});
  if(query.trim())p.set("q",query.trim());
  if(uf)p.set("uf",uf);
  if(modalidade)p.set("modalidade",modalidade);
  try{
   const r=await fetch("/api/licitacoes?"+p.toString(),{cache:"no-store"});
   const j=await r.json();
   if(!r.ok)throw new Error(j.detail||j.error||"Falha na consulta");
   setItems(j.items||[]);
   if(goToList)setTab("licitacoes");
  }catch(err){setError(err instanceof Error?err.message:"Erro ao consultar");}
  finally{setLoading(false);}
 }

 useEffect(()=>{search(undefined,false);},[]);
 useEffect(()=>{
  fetch("/api/plataformas").then(r=>r.json()).then(j=>setPlataformas(j.items||[])).catch(()=>{});
 },[]);

 async function searchOrgaos(){
  setOrgLoading(true);setOrgError("");
  try{
   const clean=orgQuery.replace(/\D/g,"");
   const params=new URLSearchParams();
   if(/^\d{14}$/.test(clean))params.set("cnpj",clean);
   else if(orgQuery.trim())params.set("q",orgQuery.trim());
   if(uf)params.set("uf",uf);
   params.set("dias","60");
   const r=await fetch("/api/orgaos?"+params.toString(),{cache:"no-store"});
   const j=await r.json();
   if(!r.ok)throw new Error(j.detail||j.error||"Falha ao consultar órgãos");
   setOrgaos(j.items||[]);setOrgUpdated(j.atualizadoEm||new Date().toISOString());
  }catch(err){setOrgError(err instanceof Error?err.message:"Erro ao consultar órgãos");}
  finally{setOrgLoading(false);}
 }

 function openParticipation(x:Licitacao){
  setParticipationItem(x);
  setTab("participacao");
  setMobileMenu(false);
 }

 function changeTab(next:Tab){setTab(next);setMobileMenu(false)}
 function toggleFav(id:string){
  const next=fav.includes(id)?fav.filter(x=>x!==id):[...fav,id];
  setFav(next);localStorage.setItem("licitacoes:favoritos",JSON.stringify(next));
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
 const recent=items.slice(0,7);
 const byUf=useMemo(()=>{
  const map=new Map<string,number>();
  items.forEach(x=>{const k=x.ufSigla||"N/I";map.set(k,(map.get(k)||0)+1)});
  return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,7);
 },[items]);
 const maxUf=Math.max(1,...byUf.map(([,v])=>v));
 const linePoints=byUf.length?byUf.map(([,v],i)=>`${i*(560/Math.max(1,byUf.length-1))},${170-(v/maxUf)*125}`).join(" "):"0,150 90,120 180,138 270,90 360,108 450,65 560,86";
 const title=tab==="dashboard"?"Dashboard":tab==="licitacoes"?"Buscar licitações":tab==="favoritos"?"Favoritos":tab==="monitoramento"?"Monitoramento inteligente":tab==="orgaos"?"Órgãos públicos":tab==="participacao"?"Centro de participação":tab==="fontes"?"Fontes oficiais":"Configurações";

 return <div className="appFrame">
  <aside className={"sidebar "+(mobileMenu?"open":"")}>
   <div className="brandRow">
    <div className="brandLogo">◇</div><strong>Licita Brasil</strong>
    <button className="sideCollapse" onClick={()=>setMobileMenu(false)}>↤</button>
   </div>
   <div className="sideSearch"><span>⌕</span><input placeholder="Pesquisar"/><kbd>⌘ F</kbd></div>

   <div className="sideLabel">Menu principal</div>
   <nav>
    <button className={tab==="dashboard"?"active":""} onClick={()=>changeTab("dashboard")}><I>⌂</I>Dashboard</button>
    <button className={tab==="licitacoes"?"active":""} onClick={()=>changeTab("licitacoes")}><I>▤</I>Licitações</button>
    <button className={tab==="favoritos"?"active":""} onClick={()=>changeTab("favoritos")}><I>☆</I>Favoritos <em>{fav.length}</em></button>
    <button className={tab==="monitoramento"?"active":""} onClick={()=>changeTab("monitoramento")}><I>◎</I>Monitoramento <em>{keywords.length}</em></button>
    <button onClick={()=>{changeTab("orgaos");setTimeout(()=>{if(!orgaos.length)searchOrgaos()},0)}} className={tab==="orgaos"?"active":""}><I>▦</I>Órgãos públicos</button>
    <button onClick={()=>changeTab("participacao")} className={tab==="participacao"?"active":""}><I>⇄</I>Participação</button>
    <button onClick={()=>changeTab("fontes")} className={tab==="fontes"?"active":""}><I>✓</I>Fontes oficiais</button>
   </nav>

   <div className="sideLabel">Outros</div>
   <nav>
    <a href="https://pncp.gov.br" target="_blank"><I>✉</I>PNCP</a>
    <a href="https://www.gov.br/compras" target="_blank"><I>⌁</I>Compras.gov.br</a>
    <button onClick={()=>changeTab("configuracoes")} className={tab==="configuracoes"?"active":""}><I>⌘</I>Configurações</button>
   </nav>

   <div className="sideBottom">
    <div className="sideLabel">Conta</div>
    <button><I>?</I>Central de ajuda</button>
    <button onClick={()=>changeTab("configuracoes")}><I>⚙</I>Ajustes</button>
    <div className="userCard"><span>LB</span><div><b>Licita Brasil</b><small>Administrador</small></div><i>↪</i></div>
   </div>
  </aside>

  <main className="main">
   <header className="topbar">
    <button className="mobileBtn" onClick={()=>setMobileMenu(!mobileMenu)}>☰</button>
    <div className="heading"><h1>{title}</h1><p>Dados oficiais do PNCP para decisões comerciais mais rápidas.</p></div>
    <div className="topbarActions">
      <div className="avatars"><span>LB</span><span>PN</span><span>BR</span><button>+</button></div>
      <button className="iconBtn">ⓘ</button><button className="iconBtn">♧</button>
      <button className="exportBtn" onClick={()=>exportCsv(tab==="favoritos"?favorites:items)}>Exportar ⤓</button>
    </div>
   </header>

   <div className="workspace">
    {error&&<div className="errorBox">{error}</div>}

    {tab==="dashboard"&&<>
      <section className="metricGrid">
       <article className="metricCard"><div><small>OPORTUNIDADES</small><strong>{items.length}</strong><span className="trend up">↗ PNCP</span></div><div className="metricIcon">◔</div><footer><b>+{items.length}</b><span>últimos 7 dias</span><i>→</i></footer></article>
       <article className="metricCard"><div><small>VALOR POTENCIAL</small><strong>{shortMoney(totalValue)}</strong><span className="trend up">↗ estimado</span></div><div className="metricIcon">⌁</div><footer><b>{shortMoney(totalValue)}</b><span>volume consultado</span><i>→</i></footer></article>
       <article className="metricCard"><div><small>FAVORITAS</small><strong>{fav.length}</strong><span className="trend down">◎ {matched.length} matches</span></div><div className="metricIcon">☆</div><footer><b>{favorites.length}</b><span>nesta consulta</span><i>→</i></footer></article>
       <article className="metricCard"><div><small>ENCERRAM EM BREVE</small><strong>{endingSoon}</strong><span className="trend warn">◷ até 3 dias</span></div><div className="metricIcon">⌁</div><footer><b>{endingSoon}</b><span>exigem atenção</span><i>→</i></footer></article>
      </section>

      <section className="dashboardBody">
       <article className="panel chartPanel">
        <div className="panelHead">
         <div><small>VISÃO GERAL</small><h2>Oportunidades por estado</h2></div><span className="softBadge">Fonte PNCP</span>
        </div>
        <div className="chartToolbar">
         <button>Dashboard⌄</button><button>Todos os estados⌄</button>
         <div className="legend"><span className="greenDot"></span>Este período <span className="grayDot"></span>Referência</div>
        </div>
        <div className="lineChart">
         <div className="axisY"><span>{maxUf}</span><span>{Math.round(maxUf*.66)}</span><span>{Math.round(maxUf*.33)}</span><span>0</span></div>
         <svg viewBox="0 0 560 190" preserveAspectRatio="none">
          <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#39d19a" stopOpacity=".25"/><stop offset="100%" stopColor="#39d19a" stopOpacity="0"/></linearGradient></defs>
          <polyline points={linePoints} fill="none" stroke="#22c98b" strokeWidth="3"/>
          <polyline points="0,130 95,145 190,125 285,138 380,118 470,126 560,140" fill="none" stroke="#6cb9a5" strokeWidth="2"/>
          <polygon points={"0,190 "+linePoints+" 560,190"} fill="url(#g)"/>
         </svg>
         <div className="axisX">{byUf.length?byUf.map(([u])=><span key={u}>{u}</span>):["SP","SC","PR","RS","MG","RJ","BA"].map(u=><span key={u}>{u}</span>)}</div>
        </div>
       </article>

       <article className="panel conversionPanel">
        <div className="panelHead"><div><small>CONVERSÃO</small><h2>{items.length?Math.min(99,(fav.length/Math.max(items.length,1))*100).toFixed(2):"0.00"}%</h2></div><div className="metricIcon">▥</div></div>
        <div className="funnelRow"><div><b>Oportunidades</b><small>100%</small></div><strong>{items.length}</strong></div>
        <div className="funnelRow"><div><b>Monitoradas</b><small>{items.length?Math.round(matched.length/items.length*100):0}%</small></div><strong>{matched.length}</strong></div>
        <div className="funnelRow"><div><b>Favoritas</b><small>{items.length?Math.round(favorites.length/items.length*100):0}%</small></div><strong>{favorites.length}</strong></div>
        <div className="funnelRow"><div><b>Encerramento próximo</b><small>{items.length?Math.round(endingSoon/items.length*100):0}%</small></div><strong>{endingSoon}</strong></div>
       </article>
      </section>

      <section className="bottomGrid">
       <article className="panel monitorCard">
        <div className="panelHead"><div><small>MONITORAMENTO</small><h2>Inteligência comercial</h2></div><button className="smallBtn" onClick={()=>changeTab("monitoramento")}>Configurar</button></div>
        <p>Cadastre termos dos seus produtos e serviços para destacar oportunidades compatíveis automaticamente.</p>
        <div className="monitorStats"><div><span>Matches</span><b>{matched.length}</b></div><div><span>Termos</span><b>{keywords.length}</b></div></div>
       </article>

       <article className="panel tablePanel">
        <div className="panelHead"><div><small>LISTA DE OPORTUNIDADES</small><h2>{items.length}</h2></div><button className="refreshBtn" onClick={()=>search(undefined,false)}>↻ Atualizar</button></div>
        <div className="miniSearch"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar"/><button onClick={()=>search(undefined,true)}>Buscar</button></div>
        <div className="tableWrap"><table><thead><tr><th>Oportunidade</th><th>Órgão</th><th>UF</th><th>Valor</th><th>Prazo</th><th></th></tr></thead>
         <tbody>{recent.map(x=><tr key={x.id}><td><b>{x.objetoCompra}</b><small>{x.modalidadeNome}</small></td><td>{x.orgaoRazaoSocial}</td><td>{x.ufSigla||"—"}</td><td>{money(x.valorTotalEstimado)}</td><td>{date(x.dataEncerramentoProposta)}</td><td><button className="rowAction" onClick={()=>openDetail(x)}>•••</button></td></tr>)}</tbody>
        </table></div>
       </article>
      </section>
    </>}

    {(tab==="licitacoes"||tab==="favoritos")&&<>
     <form className="searchPanel panel" onSubmit={e=>search(e,true)}>
      <div className="panelHead"><div><small>BUSCA OFICIAL</small><h2>Encontre licitações no PNCP</h2></div><span className="softBadge">{tab==="favoritos"?"Favoritos":"Todo Brasil"}</span></div>
      <div className="bigSearch"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex.: software, brindes, uniformes, marketing..."/><button disabled={loading}>{loading?"Consultando...":"Buscar"}</button></div>
      <div className="filters">
       <label>UF<select value={uf} onChange={e=>setUf(e.target.value)}>{UFS.map(x=><option key={x} value={x}>{x||"Todo Brasil"}</option>)}</select></label>
       <label>Modalidade<select value={modalidade} onChange={e=>setModalidade(e.target.value)}>{MODS.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
       <label>Publicação inicial<input type="date" value={inicio} onChange={e=>setInicio(e.target.value)}/></label>
       <label>Publicação final<input type="date" value={fim} onChange={e=>setFim(e.target.value)}/></label>
      </div>
     </form>
     <div className="listHeader"><b>{(tab==="favoritos"?favorites:items).length} oportunidades</b><button onClick={()=>exportCsv(tab==="favoritos"?favorites:items)}>Exportar CSV</button></div>
     <div className="opportunityGrid">
      {(tab==="favoritos"?favorites:items).map(x=><article className="oppCard" key={x.id}>
       <div className="oppTop"><span>{x.modalidadeNome}</span><button className={fav.includes(x.id)?"saved":""} onClick={()=>toggleFav(x.id)}>★</button></div>
       <h3>{x.objetoCompra}</h3><p>{x.orgaoRazaoSocial}</p>
       <div className="oppMeta"><span>⌖ {x.municipioNome||"—"} / {x.ufSigla||"—"}</span><span>▣ {x.numeroCompra||x.numeroProcesso||"Sem número"}</span></div>
       <div className="oppStats"><div><small>Valor</small><b>{money(x.valorTotalEstimado)}</b></div><div><small>Encerramento</small><b>{date(x.dataEncerramentoProposta)}</b></div></div>
       <div className="oppActions"><button onClick={()=>openDetail(x)}>Ver detalhes</button><button onClick={()=>openParticipation(x)}>Participar</button><a href={x.urlPncp} target="_blank">PNCP ↗</a></div>
      </article>)}
      {!loading&&!(tab==="favoritos"?favorites:items).length&&<div className="empty">Nenhuma oportunidade encontrada.</div>}
     </div>
    </>}

    {tab==="monitoramento"&&<section className="twoCol">
     <article className="panel"><div className="panelHead"><div><small>INTELIGÊNCIA</small><h2>Palavras-chave monitoradas</h2></div><span className="softBadge">Ativo</span></div>
      <p className="muted">Cadastre seus produtos e serviços. O sistema compara os termos com as oportunidades consultadas.</p>
      <div className="keywordForm"><input value={newKeyword} onChange={e=>setNewKeyword(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addKeyword()}}} placeholder="Ex.: copos personalizados"/><button onClick={addKeyword}>Adicionar</button></div>
      <div className="chips">{keywords.map(k=><span key={k}>{k}<button onClick={()=>removeKeyword(k)}>×</button></span>)}{!keywords.length&&<small>Nenhum termo cadastrado.</small>}</div>
     </article>
     <article className="panel centerCard"><span className="bigRound">◎</span><strong>{matched.length}</strong><h3>oportunidades compatíveis</h3><p>na consulta atual</p><button onClick={()=>changeTab("licitacoes")}>Analisar oportunidades</button></article>
    </section>}

    {tab==="orgaos"&&<section className="orgSection">
     <article className="panel orgSearchPanel">
      <div className="panelHead"><div><small>DIRETÓRIO NACIONAL</small><h2>Órgãos públicos e unidades compradoras</h2></div><span className="softBadge">Atualização obrigatória ≤ 30 min</span></div>
      <p className="muted">Pesquise por nome, cidade, UF ou CNPJ. CNPJ com 14 dígitos consulta diretamente o cadastro oficial do PNCP.</p>
      <div className="bigSearch"><span>⌕</span><input value={orgQuery} onChange={e=>setOrgQuery(e.target.value)} placeholder="Nome do órgão ou CNPJ"/><button type="button" onClick={searchOrgaos} disabled={orgLoading}>{orgLoading?"Consultando...":"Localizar"}</button></div>
      <div className="filters orgFilters"><label>UF<select value={uf} onChange={e=>setUf(e.target.value)}>{UFS.map(x=><option key={x} value={x}>{x||"Todo Brasil"}</option>)}</select></label><div className="syncInfo"><b>Fonte: PNCP</b><span>{orgUpdated?"Última consulta: "+new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(orgUpdated)):"Sincronização automática a cada 30 minutos"}</span></div></div>
      {orgError&&<div className="errorBox">{orgError}</div>}
     </article>
     <div className="orgGrid">
      {orgaos.map(o=><article className="panel orgCard" key={o.cnpj||o.razaoSocial}>
       <div className="orgCardTop"><span className="orgAvatar">🏛</span><span className="softBadge">{o.fonte}</span></div>
       <h3>{o.razaoSocial}</h3><p>{o.cnpj||"CNPJ não informado"}</p>
       <div className="orgMeta"><span>{o.municipio||"—"} {o.uf?"/ "+o.uf:""}</span><span>{o.esfera}</span><span>{o.poder}</span></div>
       <div className="orgStats"><div><small>Oportunidades</small><b>{o.oportunidades}</b></div><div><small>Valor estimado</small><b>{shortMoney(o.valorEstimado)}</b></div></div>
       <button className="smallBtn" onClick={()=>{setQuery(o.razaoSocial);setTab("licitacoes")}}>Ver licitações</button>
      </article>)}
      {!orgLoading&&!orgaos.length&&<div className="empty">Use a pesquisa para localizar órgãos públicos de todo o Brasil.</div>}
     </div>
    </section>}

    {tab==="participacao"&&<section className="participationGrid">
     <article className="panel participationMain">
      <div className="panelHead"><div><small>CENTRO DE PARTICIPAÇÃO</small><h2>{participationItem?"Processo selecionado":"Integrações de fornecedor"}</h2></div><span className="softBadge">Ambiente seguro</span></div>
      {participationItem?<div className="participationTender">
       <h3>{participationItem.objetoCompra}</h3><p>{participationItem.orgaoRazaoSocial}</p>
       <div className="detailGrid"><div><small>Modalidade</small><b>{participationItem.modalidadeNome}</b></div><div><small>Valor estimado</small><b>{money(participationItem.valorTotalEstimado)}</b></div><div><small>Encerramento</small><b>{date(participationItem.dataEncerramentoProposta)}</b></div></div>
       <div className="integrationNotice"><b>Envio direto de proposta/lance</b><p>Será habilitado somente quando houver API oficial/autorizada e credenciais válidas do fornecedor para a plataforma de origem. A ferramenta não contorna autenticação, certificado, SICAF ou regras da sessão pública.</p></div>
       <div className="oppActions"><button onClick={()=>openDetail(participationItem)}>Revisar edital e documentos</button>{participationItem.urlOrigem&&<a href={participationItem.urlOrigem} target="_blank">Sistema de origem ↗</a>}</div>
      </div>:<p className="muted">Selecione uma licitação e clique em Participar. O sistema identifica a plataforma de origem e verifica se existe integração autorizada disponível.</p>}
     </article>
     <article className="panel platformPanel">
      <div className="panelHead"><div><small>PLATAFORMAS</small><h2>Status de integração</h2></div></div>
      <div className="platformList">{plataformas.map(p=><div className="platformRow" key={p.id}><div><b>{p.nome}</b><small>{p.requisito}</small></div><span className={p.participacaoInterna?"statusReady":"statusAuth"}>{p.participacaoInterna?"Pronta":"Credencial/API necessária"}</span></div>)}</div>
     </article>
    </section>}

    {tab==="fontes"&&<section className="sourceGrid">
     <article className="panel source"><span>P</span><b>PNCP</b><p>Portal Nacional de Contratações Públicas. Fonte principal de dados da ferramenta.</p><a href="https://pncp.gov.br" target="_blank">Acessar ↗</a></article>
     <article className="panel source"><span>C</span><b>Compras.gov.br</b><p>Portal de compras do Governo Federal, mantido como fonte complementar.</p><a href="https://www.gov.br/compras" target="_blank">Acessar ↗</a></article>
     <article className="panel source"><span>✓</span><b>Validação oficial</b><p>Sempre confira edital, anexos, retificações e prazos na fonte oficial.</p></article>
    </section>}

    {tab==="configuracoes"&&<section className="twoCol">
     <article className="panel"><div className="panelHead"><div><small>PREFERÊNCIAS</small><h2>Busca padrão</h2></div></div>
      <div className="settingsForm"><label>Estado<select value={uf} onChange={e=>setUf(e.target.value)}>{UFS.map(x=><option key={x} value={x}>{x||"Todo Brasil"}</option>)}</select></label><label>Modalidade<select value={modalidade} onChange={e=>setModalidade(e.target.value)}>{MODS.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label></div>
     </article>
     <article className="panel"><div className="panelHead"><div><small>BACKEND</small><h2>Status da integração</h2></div><span className="softBadge">Operacional</span></div><div className="health"><i></i><div><b>API Next.js + PNCP</b><small>Retry, timeout e controle de concorrência ativos.</small></div></div></article>
    </section>}
   </div>
  </main>

  {selected&&<div className="modalBackdrop" onMouseDown={()=>{setSelected(null);setDetail(null)}}>
   <div className="modal" onMouseDown={e=>e.stopPropagation()}>
    <div className="modalHead"><div><span>{selected.modalidadeNome}</span><h2>Detalhes da licitação</h2></div><button onClick={()=>{setSelected(null);setDetail(null)}}>×</button></div>
    <div className="modalBody">
     <h3>{selected.objetoCompra}</h3><p>{selected.orgaoRazaoSocial}</p>
     <div className="detailGrid"><div><small>Local</small><b>{selected.municipioNome||"—"} / {selected.ufSigla||"—"}</b></div><div><small>Valor estimado</small><b>{money(selected.valorTotalEstimado)}</b></div><div><small>Encerramento</small><b>{date(selected.dataEncerramentoProposta)}</b></div></div>
     {detailLoading&&<div className="empty">Consultando dados oficiais...</div>}
     {detail&&!detailLoading&&<>
      {detail.itens.length>0&&<div className="detailSection"><h4>Itens</h4><div className="detailList">{detail.itens.slice(0,12).map((it:any,i)=><div key={i}><b>{it.descricao||it.materialOuServicoNome||"Item"}</b><span>{it.quantidade??""}</span></div>)}</div></div>}
      {detail.documentos.length>0&&<div className="detailSection"><h4>Documentos</h4><div className="detailList">{detail.documentos.slice(0,10).map((doc:any,i)=><a key={i} href={doc.url||doc.urlArquivo} target="_blank"><b>{doc.titulo||doc.nome||"Documento"}</b><span>Abrir ↗</span></a>)}</div></div>}
     </>}
    </div>
    <div className="modalFoot"><a href={selected.urlPncp} target="_blank">Abrir processo oficial no PNCP ↗</a></div>
   </div>
  </div>}
 </div>
}
