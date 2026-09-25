import { buscarLicitacoes } from "@/lib/pncp";

const PNCP_BASE = "https://pncp.gov.br/api/pncp/v1";
const TIMEOUT_MS = 10000;
const REVALIDATE_SECONDS = 1800;

export type OrgaoPublico = {
  cnpj: string;
  razaoSocial: string;
  esfera: string;
  poder: string;
  uf: string;
  municipio: string;
  oportunidades: number;
  valorEstimado: number;
  ultimaPublicacao: string;
  fonte: "PNCP";
};

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function labelEsfera(value: string) {
  return value === "F" ? "Federal" : value === "E" ? "Estadual" : value === "M" ? "Municipal" : value === "D" ? "Distrital" : value || "Não informada";
}

function labelPoder(value: string) {
  return value === "E" ? "Executivo" : value === "L" ? "Legislativo" : value === "J" ? "Judiciário" : value || "Não informado";
}

export async function consultarOrgaoPorCnpj(cnpjInput: string) {
  const cnpj = digits(cnpjInput);
  if (!/^\d{14}$/.test(cnpj)) throw new Error("Informe um CNPJ válido com 14 dígitos.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${PNCP_BASE}/orgaos/${cnpj}`, {
      headers: { Accept: "application/json", "User-Agent": "LicitaBrasil/1.0" },
      signal: controller.signal,
      next: { revalidate: REVALIDATE_SECONDS }
    });

    if (!response.ok) {
      throw new Error(response.status === 404 ? "Órgão não encontrado no PNCP." : `PNCP respondeu HTTP ${response.status}`);
    }

    const raw = await response.json();
    return {
      cnpj: String(raw?.cnpj || cnpj),
      razaoSocial: String(raw?.razaoSocial || raw?.nome || "Órgão público"),
      esfera: labelEsfera(String(raw?.esferaId || "")),
      poder: labelPoder(String(raw?.poderId || "")),
      uf: "",
      municipio: "",
      oportunidades: 0,
      valorEstimado: 0,
      ultimaPublicacao: "",
      fonte: "PNCP" as const
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function descobrirOrgaosAtivos(input: {
  q?: string;
  uf?: string;
  dias?: number;
}) {
  const dias = Math.max(1, Math.min(input.dias || 60, 366));
  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - dias);

  const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

  const result = await buscarLicitacoes({
    dataInicial: ymd(inicio),
    dataFinal: ymd(fim),
    uf: input.uf || undefined,
    paginas: 3
  });

  const needle = (input.q || "").trim().toLocaleLowerCase("pt-BR");
  const map = new Map<string, OrgaoPublico>();

  for (const item of result.items) {
    const key = item.orgaoCnpj || item.orgaoRazaoSocial;
    if (!key) continue;

    const current = map.get(key) || {
      cnpj: item.orgaoCnpj,
      razaoSocial: item.orgaoRazaoSocial,
      esfera: "Não informada",
      poder: "Não informado",
      uf: item.ufSigla,
      municipio: item.municipioNome,
      oportunidades: 0,
      valorEstimado: 0,
      ultimaPublicacao: item.dataPublicacaoPncp,
      fonte: "PNCP" as const
    };

    current.oportunidades += 1;
    current.valorEstimado += item.valorTotalEstimado || 0;

    if ((item.dataPublicacaoPncp || "") > (current.ultimaPublicacao || "")) {
      current.ultimaPublicacao = item.dataPublicacaoPncp;
    }
    if (!current.uf && item.ufSigla) current.uf = item.ufSigla;
    if (!current.municipio && item.municipioNome) current.municipio = item.municipioNome;

    map.set(key, current);
  }

  const items = [...map.values()]
    .filter((orgao) => {
      if (!needle) return true;
      const hay = [orgao.razaoSocial, orgao.cnpj, orgao.uf, orgao.municipio]
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      return needle.split(/\s+/).every((term) => hay.includes(term));
    })
    .sort((a, b) => b.oportunidades - a.oportunidades || a.razaoSocial.localeCompare(b.razaoSocial, "pt-BR"));

  return {
    items,
    total: items.length,
    janelaDias: dias,
    fonte: "PNCP",
    atualizadoEm: new Date().toISOString(),
    observacao: "Diretório dinâmico composto pelos órgãos encontrados nas contratações publicadas no período consultado. Consulta direta por CNPJ usa o cadastro oficial do PNCP."
  };
}
