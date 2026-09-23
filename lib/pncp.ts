export type PncpRaw = Record<string, any>;

export type Licitacao = {
  id: string;
  numeroControlePNCP: string;
  numeroCompra: string;
  numeroProcesso: string;
  objetoCompra: string;
  informacaoComplementar: string;
  modalidadeId: number | null;
  modalidadeNome: string;
  situacaoCompraNome: string;
  valorTotalEstimado: number | null;
  dataPublicacaoPncp: string;
  dataAberturaProposta: string;
  dataEncerramentoProposta: string;
  orgaoRazaoSocial: string;
  orgaoCnpj: string;
  unidadeNome: string;
  municipioNome: string;
  ufSigla: string;
  anoCompra: number | null;
  sequencialCompra: number | null;
  urlPncp: string;
  urlOrigem: string;
  fonte: "PNCP";
};

const CONSULTA_URL = "https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao";
const DOMINIO_URL = "https://pncp.gov.br/api/pncp/v1/modalidades";

const FALLBACK_MODALIDADES = Array.from({ length: 14 }, (_, i) => i + 1);

function onlyDigits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export function formatPncpDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function pncpOfficialUrl(raw: PncpRaw) {
  const cnpj = onlyDigits(raw?.orgaoEntidade?.cnpj || raw?.orgaoSubRogado?.cnpj || raw?.cnpjOrgao);
  const ano = Number(raw?.anoCompra || raw?.anoContratacao || raw?.ano);
  const seq = Number(raw?.sequencialCompra || raw?.sequencialContratacao || raw?.sequencial);
  if (cnpj && ano && seq) return `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${seq}`;
  return "https://pncp.gov.br/app/editais";
}

export function normalize(raw: PncpRaw): Licitacao {
  const numeroControle = String(raw?.numeroControlePNCP || raw?.numeroControlePncp || "");
  const cnpj = onlyDigits(raw?.orgaoEntidade?.cnpj || raw?.orgaoSubRogado?.cnpj || raw?.cnpjOrgao);
  const ano = Number(raw?.anoCompra || raw?.anoContratacao || raw?.ano) || null;
  const seq = Number(raw?.sequencialCompra || raw?.sequencialContratacao || raw?.sequencial) || null;

  return {
    id: numeroControle || [cnpj, ano, seq, raw?.numeroCompra].filter(Boolean).join("-"),
    numeroControlePNCP: numeroControle,
    numeroCompra: String(raw?.numeroCompra ?? ""),
    numeroProcesso: String(raw?.processo ?? raw?.numeroProcesso ?? ""),
    objetoCompra: String(raw?.objetoCompra ?? raw?.objeto ?? "Objeto não informado"),
    informacaoComplementar: String(raw?.informacaoComplementar ?? ""),
    modalidadeId: Number(raw?.modalidadeId ?? raw?.codigoModalidadeContratacao) || null,
    modalidadeNome: String(raw?.modalidadeNome ?? raw?.modalidadeContratacaoNome ?? "Não informada"),
    situacaoCompraNome: String(raw?.situacaoCompraNome ?? raw?.situacaoNome ?? "Publicada"),
    valorTotalEstimado: Number.isFinite(Number(raw?.valorTotalEstimado)) ? Number(raw.valorTotalEstimado) : null,
    dataPublicacaoPncp: String(raw?.dataPublicacaoPncp ?? raw?.dataPublicacaoPNCP ?? raw?.dataPublicacao ?? ""),
    dataAberturaProposta: String(raw?.dataAberturaProposta ?? raw?.dataInicioProposta ?? ""),
    dataEncerramentoProposta: String(raw?.dataEncerramentoProposta ?? raw?.dataFimProposta ?? ""),
    orgaoRazaoSocial: String(raw?.orgaoEntidade?.razaoSocial ?? raw?.orgaoRazaoSocial ?? "Órgão público"),
    orgaoCnpj: cnpj,
    unidadeNome: String(raw?.unidadeOrgao?.nomeUnidade ?? raw?.unidadeOrgao?.nome ?? raw?.unidadeNome ?? ""),
    municipioNome: String(raw?.unidadeOrgao?.municipioNome ?? raw?.municipioNome ?? ""),
    ufSigla: String(raw?.unidadeOrgao?.ufSigla ?? raw?.ufSigla ?? ""),
    anoCompra: ano,
    sequencialCompra: seq,
    urlPncp: pncpOfficialUrl(raw),
    urlOrigem: String(raw?.linkSistemaOrigem ?? raw?.urlProcesso ?? raw?.urlPlataformaOrigem ?? ""),
    fonte: "PNCP"
  };
}

async function getModalidades(): Promise<number[]> {
  try {
    const response = await fetch(`${DOMINIO_URL}?statusAtivo=true`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 }
    });
    if (!response.ok) throw new Error("dominio indisponivel");
    const json = await response.json();
    const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    const ids = list.map((item: any) => Number(item?.id)).filter((id: number) => Number.isFinite(id) && id > 0);
    return ids.length ? ids : FALLBACK_MODALIDADES;
  } catch {
    return FALLBACK_MODALIDADES;
  }
}

async function consultaModalidade(params: {
  dataInicial: string;
  dataFinal: string;
  modalidade: number;
  uf?: string;
  pagina: number;
}) {
  const url = new URL(CONSULTA_URL);
  url.searchParams.set("dataInicial", params.dataInicial);
  url.searchParams.set("dataFinal", params.dataFinal);
  url.searchParams.set("codigoModalidadeContratacao", String(params.modalidade));
  url.searchParams.set("pagina", String(params.pagina));
  if (params.uf) url.searchParams.set("uf", params.uf);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json", "User-Agent": "LicitacoesBrasil/1.0" },
      signal: controller.signal,
      next: { revalidate: 900 }
    });

    if (!response.ok) return { data: [] as PncpRaw[], totalRegistros: 0, totalPaginas: 0 };

    const json = await response.json();
    const data = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    return {
      data,
      totalRegistros: Number(json?.totalRegistros ?? data.length ?? 0),
      totalPaginas: Number(json?.totalPaginas ?? 1)
    };
  } catch {
    return { data: [] as PncpRaw[], totalRegistros: 0, totalPaginas: 0 };
  } finally {
    clearTimeout(timeout);
  }
}

export async function buscarLicitacoes(input: {
  dataInicial: string;
  dataFinal: string;
  modalidade?: number | null;
  uf?: string;
  keyword?: string;
  paginas?: number;
}) {
  const modalidades = input.modalidade ? [input.modalidade] : await getModalidades();
  const maxPaginas = Math.max(1, Math.min(input.paginas || 1, input.modalidade ? 5 : 2));

  const firstPages = await Promise.all(
    modalidades.map((modalidade) =>
      consultaModalidade({
        dataInicial: input.dataInicial,
        dataFinal: input.dataFinal,
        modalidade,
        uf: input.uf,
        pagina: 1
      })
    )
  );

  const extraJobs: Promise<{ data: PncpRaw[]; totalRegistros: number; totalPaginas: number }>[] = [];
  if (maxPaginas > 1) {
    firstPages.forEach((first, index) => {
      const modalidade = modalidades[index];
      const last = Math.min(maxPaginas, Math.max(1, first.totalPaginas));
      for (let pagina = 2; pagina <= last; pagina++) {
        extraJobs.push(
          consultaModalidade({
            dataInicial: input.dataInicial,
            dataFinal: input.dataFinal,
            modalidade,
            uf: input.uf,
            pagina
          })
        );
      }
    });
  }

  const extraPages = extraJobs.length ? await Promise.all(extraJobs) : [];
  const raw = [...firstPages, ...extraPages].flatMap((r) => r.data);
  const unique = new Map<string, Licitacao>();

  raw.map(normalize).forEach((item) => {
    if (item.id) unique.set(item.id, item);
  });

  const needle = (input.keyword || "").trim().toLocaleLowerCase("pt-BR");
  const items = [...unique.values()]
    .filter((item) => {
      if (!needle) return true;
      const haystack = [
        item.objetoCompra,
        item.informacaoComplementar,
        item.orgaoRazaoSocial,
        item.municipioNome,
        item.numeroCompra,
        item.numeroProcesso
      ].join(" ").toLocaleLowerCase("pt-BR");
      return needle.split(/\s+/).every((term) => haystack.includes(term));
    })
    .sort((a, b) => (b.dataPublicacaoPncp || "").localeCompare(a.dataPublicacaoPncp || ""));

  return {
    items,
    coletados: raw.length,
    unicos: unique.size,
    modalidadesConsultadas: modalidades.length,
    fonte: "PNCP",
    atualizadoEm: new Date().toISOString()
  };
}
