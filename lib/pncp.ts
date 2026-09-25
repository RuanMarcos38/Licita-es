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

type ConsultaResult = {
  data: PncpRaw[];
  totalRegistros: number;
  totalPaginas: number;
  failed: boolean;
};

const CONSULTA_URL = "https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao";
const DOMINIO_URL = "https://pncp.gov.br/api/pncp/v1/modalidades";
const FALLBACK_MODALIDADES = Array.from({ length: 14 }, (_, i) => i + 1);
const REQUEST_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;
const CONCURRENCY = 4;

function onlyDigits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(url: string, revalidate: number) {
  let lastError = "Falha desconhecida";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "LicitaBrasil/1.0"
        },
        signal: controller.signal,
        next: { revalidate }
      });

      if (response.ok) {
        return { ok: true as const, data: await response.json(), status: response.status };
      }

      lastError = `PNCP respondeu HTTP ${response.status}`;
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === MAX_RETRIES) break;

      const retryAfter = Number(response.headers.get("retry-after"));
      const wait = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 5000)
        : 400 * 2 ** attempt;

      await sleep(wait);
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Erro de rede";
      if (attempt === MAX_RETRIES) break;
      await sleep(400 * 2 ** attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  return { ok: false as const, error: lastError };
}

async function runWithConcurrency<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency = CONCURRENCY
) {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runner() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runner())
  );

  return results;
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
  const result = await fetchJsonWithRetry(`${DOMINIO_URL}?statusAtivo=true`, 86400);
  if (!result.ok) return FALLBACK_MODALIDADES;

  const json = result.data;
  const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
  const ids = list
    .map((item: any) => Number(item?.id))
    .filter((id: number) => Number.isFinite(id) && id > 0);

  return ids.length ? ids : FALLBACK_MODALIDADES;
}

async function consultaModalidade(params: {
  dataInicial: string;
  dataFinal: string;
  modalidade: number;
  uf?: string;
  pagina: number;
}): Promise<ConsultaResult> {
  const url = new URL(CONSULTA_URL);
  url.searchParams.set("dataInicial", params.dataInicial);
  url.searchParams.set("dataFinal", params.dataFinal);
  url.searchParams.set("codigoModalidadeContratacao", String(params.modalidade));
  url.searchParams.set("pagina", String(params.pagina));
  if (params.uf) url.searchParams.set("uf", params.uf);

  const result = await fetchJsonWithRetry(url.toString(), 900);
  if (!result.ok) {
    return { data: [], totalRegistros: 0, totalPaginas: 0, failed: true };
  }

  const json = result.data;
  const data = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];

  return {
    data,
    totalRegistros: Number(json?.totalRegistros ?? data.length ?? 0),
    totalPaginas: Number(json?.totalPaginas ?? 1),
    failed: false
  };
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

  const firstPages = await runWithConcurrency(modalidades, (modalidade) =>
    consultaModalidade({
      dataInicial: input.dataInicial,
      dataFinal: input.dataFinal,
      modalidade,
      uf: input.uf,
      pagina: 1
    })
  );

  if (firstPages.length && firstPages.every((result) => result.failed)) {
    throw new Error("O PNCP está temporariamente indisponível. Tente novamente em instantes.");
  }

  const extraJobs: Array<{ modalidade: number; pagina: number }> = [];
  if (maxPaginas > 1) {
    firstPages.forEach((first, index) => {
      if (first.failed) return;
      const modalidade = modalidades[index];
      const last = Math.min(maxPaginas, Math.max(1, first.totalPaginas));
      for (let pagina = 2; pagina <= last; pagina++) {
        extraJobs.push({ modalidade, pagina });
      }
    });
  }

  const extraPages = await runWithConcurrency(extraJobs, (job) =>
    consultaModalidade({
      dataInicial: input.dataInicial,
      dataFinal: input.dataFinal,
      modalidade: job.modalidade,
      uf: input.uf,
      pagina: job.pagina
    })
  );

  const allPages = [...firstPages, ...extraPages];
  const raw = allPages.flatMap((result) => result.data);
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

  const falhas = allPages.filter((result) => result.failed).length;

  return {
    items,
    coletados: raw.length,
    unicos: unique.size,
    modalidadesConsultadas: modalidades.length,
    requisicoesFalhas: falhas,
    parcial: falhas > 0,
    fonte: "PNCP",
    atualizadoEm: new Date().toISOString()
  };
}
