export type PlataformaLicitacao = {
  id: string;
  nome: string;
  dominio: string;
  tipo: "oficial" | "privada";
  consulta: boolean;
  participacaoInterna: boolean;
  requisito: string;
};

export const PLATAFORMAS: PlataformaLicitacao[] = [
  {
    id: "pncp",
    nome: "PNCP",
    dominio: "pncp.gov.br",
    tipo: "oficial",
    consulta: true,
    participacaoInterna: false,
    requisito: "Consulta pública integrada. Operações autenticadas exigem credenciamento e autorização oficial da plataforma."
  },
  {
    id: "comprasgov",
    nome: "Compras.gov.br",
    dominio: "gov.br/compras",
    tipo: "oficial",
    consulta: true,
    participacaoInterna: false,
    requisito: "Participação exige cadastro de fornecedor, SICAF/Compras e autenticação oficial."
  },
  {
    id: "bll",
    nome: "BLL Compras",
    dominio: "bllcompras.com",
    tipo: "privada",
    consulta: true,
    participacaoInterna: false,
    requisito: "Necessita integração autorizada e credenciais válidas da plataforma."
  },
  {
    id: "licitanet",
    nome: "Licitanet",
    dominio: "licitanet.com.br",
    tipo: "privada",
    consulta: true,
    participacaoInterna: false,
    requisito: "Necessita integração autorizada e credenciais válidas da plataforma."
  }
];

export function identificarPlataforma(url: string) {
  const lower = (url || "").toLowerCase();
  return PLATAFORMAS.find((item) => lower.includes(item.dominio.split("/")[0])) || null;
}
