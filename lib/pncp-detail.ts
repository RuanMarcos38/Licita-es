const BASE = "https://pncp.gov.br/api/pncp/v1";
const REQUEST_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;

export type PncpDetail = {
  contratacao: any;
  itens: any[];
  documentos: any[];
  historico: any[];
  consultadoEm: string;
  parcial: boolean;
};

function validCnpj(value: string) {
  return /^\d{14}$/.test(value);
}

function validYear(value: number) {
  return Number.isInteger(value) && value >= 2021 && value <= 2100;
}

function validSeq(value: number) {
  return Number.isInteger(value) && value > 0;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeJson(url: string) {
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
        next: { revalidate: 900 }
      });

      if (response.ok) return { ok: true as const, data: await response.json() };

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === MAX_RETRIES) {
        return { ok: false as const, data: null };
      }
    } catch {
      if (attempt === MAX_RETRIES) return { ok: false as const, data: null };
    } finally {
      clearTimeout(timeout);
    }

    await sleep(400 * 2 ** attempt);
  }

  return { ok: false as const, data: null };
}

function asList(value: any) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

export async function buscarDetalheContratacao(
  cnpj: string,
  ano: number,
  sequencial: number
): Promise<PncpDetail> {
  if (!validCnpj(cnpj) || !validYear(ano) || !validSeq(sequencial)) {
    throw new Error("Parâmetros inválidos");
  }

  const root = `${BASE}/orgaos/${cnpj}/compras/${ano}/${sequencial}`;
  const [contratacao, itens, documentos, historico] = await Promise.all([
    safeJson(root),
    safeJson(root + "/itens"),
    safeJson(root + "/arquivos"),
    safeJson(root + "/historico")
  ]);

  if (![contratacao, itens, documentos, historico].some((result) => result.ok)) {
    throw new Error("O PNCP está temporariamente indisponível.");
  }

  return {
    contratacao: contratacao.ok ? contratacao.data || {} : {},
    itens: itens.ok ? asList(itens.data) : [],
    documentos: documentos.ok ? asList(documentos.data) : [],
    historico: historico.ok ? asList(historico.data) : [],
    consultadoEm: new Date().toISOString(),
    parcial: !contratacao.ok || !itens.ok || !documentos.ok || !historico.ok
  };
}
