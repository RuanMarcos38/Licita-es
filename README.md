# Licita Brasil

Sistema de inteligência para compras públicas, com frontend responsivo e backend Next.js conectado às APIs oficiais do PNCP.

## Entregue

- Dashboard inspirado na referência visual enviada: sidebar clara, cards brancos, paleta verde, topbar, tabelas e painéis.
- Busca nacional por palavra-chave, UF, modalidade e período.
- Backend server-side para consultar e normalizar dados do PNCP.
- Detalhamento de cada contratação com itens, documentos/anexos e histórico oficiais.
- Favoritos locais.
- Monitoramento por palavras-chave.
- Indicadores de valor potencial, oportunidades recentes e prazos próximos.
- Visão por estado.
- Exportação CSV.
- Layout responsivo para desktop, tablet e celular.
- Health check em `/api/health`.
- GitHub Actions para validar o build.

## APIs internas

- `GET /api/licitacoes`
- `GET /api/licitacoes/detalhe?cnpj=...&ano=...&sequencial=...`
- `GET /api/health`

## Fonte oficial

A fonte principal é o Portal Nacional de Contratações Públicas (PNCP). O sistema mantém links para a fonte oficial. Antes de participar de uma licitação, valide edital, anexos, prazos, retificações e requisitos no documento oficial.

## Rodar

```bash
npm install
npm run dev
```

## Produção

```bash
npm install
npm run build
npm start
```

O buscador PNCP não exige chave privada de API.
