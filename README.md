# Licitações Brasil

Sistema web para pesquisar oportunidades de compras públicas em todo o Brasil usando fontes oficiais.

## Recursos entregues

- Consulta server-side à API pública do PNCP
- Busca por palavra-chave, UF, modalidade e período
- Agregação de modalidades e remoção de duplicidades
- Cards com órgão, objeto, valor estimado, publicação e encerramento
- Link direto para a página oficial da contratação no PNCP
- Link para o portal de origem quando informado pela API
- Favoritos salvos no navegador
- Monitoramento por palavras-chave de interesse
- Exportação dos resultados para CSV
- Layout responsivo para desktop, tablet e celular
- Endpoint de saúde em `/api/health`
- CI no GitHub Actions validando o build

## Fonte de dados

A fonte principal do MVP é o **Portal Nacional de Contratações Públicas (PNCP)**.

A aplicação não substitui a leitura do edital. Sempre valide prazos, documentos, retificações, anexos e regras de participação na fonte oficial antes de tomar uma decisão comercial.

## Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Produção

O projeto está pronto para plataformas compatíveis com Next.js, como Vercel ou infraestrutura Node.js.

```bash
npm install
npm run build
npm start
```

## Variáveis de ambiente

O buscador PNCP funciona **sem chave de API**.

O arquivo `.env.example` deixa preparada a evolução para:
- Supabase/Auth e persistência multiusuário
- alertas persistentes
- análise semântica/IA de documentos

## Estrutura

- `app/page.tsx` — dashboard
- `app/api/licitacoes/route.ts` — API interna de busca
- `lib/pncp.ts` — integração e normalização PNCP
- `app/globals.css` — interface responsiva
- `.github/workflows/ci.yml` — validação automática

## Segurança da informação

O sistema exibe a fonte e o link oficial da oportunidade. Dados resumidos devem ser tratados como apoio à busca; o documento oficial continua sendo a referência para participação na licitação.
