# GymChecker — Documentação técnica

Mapeamento do código real (não do README, que é boilerplate genérico do
`create-next-app` e não reflete o projeto). Toda afirmação não-trivial nos
documentos abaixo é citada como `arquivo:linha`.

Metodologia: 4 subagentes leram o código-fonte em paralelo (não os docs
antigos, que não existiam além do README genérico) e cada um produziu um
relatório verificado contra o código. Gerado em 2026-09-11, contra o commit
`359e066` (branch `main`).

O que é este app: painel administrativo de controle de acesso de academia
("RLFitness" no título/rodapé da UI, embora o repo se chame GymChecker).
Next.js 16 (App Router) + React 19 + TypeScript, backend inteiramente em
Supabase (Postgres + Auth + Realtime), UI Tailwind + shadcn/radix,
gráficos via Chart.js (`react-chartjs-2`).

## Índice

- [01 — Camada de dados e backend](01-backend-data-layer.md): cliente
  Supabase (público vs. admin), fluxo de autenticação (`useAuthGuard`), as
  duas rotas de API (`check-access`, `get-pending-tag`) que falam com o
  leitor RFID físico, e configuração de build/lint/TS.
- [02 — Módulos CRUD administrativos](02-crud-admin-modules.md): members,
  memberships, payments, plans — modelo de dados, hooks, composição de
  página, relações verificadas entre tabelas.
- [03 — Dashboard e monitoramento](03-dashboard-monitoring.md): agregação
  de KPIs/gráficos, feed de acesso em tempo real (Supabase Realtime), tema
  (dark/light) e shell do app.
- [04 — Revisão de arquitetura (deep modules)](04-architecture-review.md):
  aplicação da skill `codebase-architecture-review` — quais hooks são
  módulos profundos vs. rasos, onde (não) existem seams/adapters reais, e
  oportunidades de "deepening" priorizadas.
- [05 — Divergências e riscos](05-divergences-and-risks.md): achado
  consolidado de maior valor — tudo que os 4 relatórios sinalizaram como
  risco de segurança, bug latente, ou inconsistência de produto, com
  severidade.

## Como manter isso atualizado

Da próxima vez que pedir para "atualizar a doc" depois de mudanças no
código: rode `git log <último-hash-documentado>..HEAD --oneline` para ver
o que mudou, escopo os subagentes só pro diff, e peça pra eles expandirem
as seções existentes em vez de reescrever do zero (evita perder citações
ainda válidas). Último hash documentado: `359e066`.
