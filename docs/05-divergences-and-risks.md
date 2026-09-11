# 05 — Divergências e riscos (consolidado)

Este é o artefato de maior valor dos quatro relatórios: junta tudo que foi
sinalizado como risco real de segurança, bug latente, gap operacional, ou
inconsistência de produto, ranqueado por severidade. Nada aqui é opinião —
cada item cita `arquivo:linha` no doc de origem correspondente.

## [ALTA] Autenticação de `check-access` é opcional e silenciosamente
desativada se `API_SECRET_TOKEN` não estiver setada; `get-pending-tag` não
tem autenticação nenhuma

- `check-access/route.ts:11,16`: `if (API_SECRET && authHeader !== ...)` —
  se o deploy esquecer de setar `API_SECRET_TOKEN`, essa condição é sempre
  falsa e a checagem é pulada inteiramente; a rota (que dispara
  `check_access_and_log`, presumivelmente concedendo/negando acesso físico
  ao prédio e escrevendo um log de auditoria) fica aberta pra qualquer um
  que alcance a URL, sem aviso, sem log, sem default fail-closed.
- `get-pending-tag/route.ts:9-25`: não existe checagem de auth em forma
  nenhuma. Esse endpoint expõe (e destrutivamente consome, via
  read-then-delete) dados de cadastro de tag RFID pendente pra qualquer
  chamador não-autenticado.
- **Recomendação**: fail closed — rejeitar todas as requisições a
  `check-access` se `API_SECRET_TOKEN` não estiver configurada (tratar
  config ausente como erro de deploy, não "acesso livre"), e adicionar a
  mesma checagem de Bearer token em `get-pending-tag`.
- Origem: doc 01, §5.1.

## [MÉDIA] Sem validação de input em `rfid_uid` no `check-access`

- `check-access/route.ts:20-27`: só uma checagem de truthiness (`if
  (!rfid_uid)`) antes de passar o valor direto como parâmetro de RPC
  Supabase. Sem validação de tipo/tamanho/charset. A chamada RPC
  parametrizada do Supabase mitiga SQL injection clássico, mas um payload
  malformado/oversized ainda passa sem checagem.
- Origem: doc 01, §5.2.

## [BAIXA-MÉDIA] `get-pending-tag` confunde "nada pendente" com "erro de
banco"

- `get-pending-tag/route.ts:17`: `if (error || !data) return
  NextResponse.json({ rfid_uid: null })` — um erro real do Supabase (falha
  de conexão, credencial ruim, RLS mal configurada) é indistinguível do
  estado legítimo "nada pendente", e o erro em si nunca é logado (sem
  `console.error` aqui, diferente de `check-access/route.ts:30`). Problemas
  de produção ficam invisíveis.
- Origem: doc 01, §5.3.

## [BAIXA] Condição de corrida no read-then-delete do `get-pending-tag`

- `get-pending-tag/route.ts:10-22`: select e delete são dois round-trips
  separados em vez de uma operação atômica (ex: `delete ... returning`).
  Pollers concorrentes poderiam ambos receber o mesmo `rfid_uid` antes de
  qualquer delete completar. Severidade baixa dado uso presumido de baixa
  concorrência (um admin fazendo polling).
- Origem: doc 01, §5.4.

## [ALTA/OPERACIONAL] Badge "Sistema Ativo" do monitoramento é decorativo,
não reflete o estado real da conexão realtime

- `monitoring/page.tsx:24-27`: ponto pulsante hardcoded, sem checagem de
  estado de subscription do WebSocket em `useAccessLogs.ts` (sem handler de
  erro de conexão, sem reconexão/backoff). Se o canal cair silenciosamente,
  um operador olhando a tela continuaria achando que o feed está ao vivo.
  Relevante porque este é o painel de auditoria de um sistema que controla
  uma porta física — um operador confiando nesse feed pra saber "quem
  entrou agora" pode estar vendo dados velhos sem saber.
- Sem fallback de polling: só fetch inicial + subscription, sem refetch por
  intervalo — uma subscription perdida deixa o admin desatualizado até
  reload manual.
- Origem: doc 03, §2.4.

## [MÉDIA] Dashboard nunca refletede o estado atual — fetch único no mount,
sem refetch/realtime

- `useDashboard.ts:17-19,43-59`: todos os dados (`customer`, `subscription`,
  `payment`, tabelas inteiras) são buscados uma vez no mount. Trocar o ano
  no seletor só refiltra dados já em memória, não reconsulta o banco. Uma
  sessão administrativa aberta por horas mostraria KPIs cada vez mais
  desatualizados sem qualquer indicação disso na UI.
- Origem: doc 03, §1.1, §1.4 (ressalva de staleness).

## [MÉDIA — dado de produto, não bug] Escritas multi-tabela sem transação
podem deixar linhas órfãs

- `CreateMemberModal.tsx:50-109`: insere em `customer`, depois
  `subscription`, depois `payment` — 3 chamadas sequenciais, sem
  transação/RPC única. O insert de `payment` é fire-and-forget (erro não
  checado, `CreateMemberModal.tsx:89-96`). Uma falha no meio da sequência
  pode deixar `customer` criado sem `subscription`/`payment` correspondente.
- `RenewMemberModal.tsx:71-87`: mesmo padrão (2 inserts sequenciais sem
  transação).
- Nenhum dos três fluxos de escrita usa transação/RPC — só `try/catch` +
  `alert()` na falha.
- Origem: doc 02, seção Members > Page composition.

## [MÉDIA — dívida de dados] Tipo `Plan` duplicado e já divergente entre
módulos

- `members/types.ts:1-6` declara `Plan` sem `is_active`; `plans/types.ts:1-6`
  declara `Plan` com `is_active: boolean`. Mesma entidade, duas interfaces,
  já divergentes — sintoma clássico de módulo sem dono único. Se algum
  fluxo em `members` precisar checar `is_active` no futuro, vai descobrir
  que o campo nem existe no tipo local.
- Origem: doc 02 (Cross-cutting) e doc 04, §4.

## [BAIXA — inconsistência de produto] Cobertura de CRUD desigual entre os
4 módulos administrativos

| Módulo | Create | Read | Update | Delete/Archive |
|---|---|---|---|---|
| Members | ✅ | ✅ | ✅ | Archive (soft) |
| Memberships | ❌ (só via Members) | ✅ | ✅ (só datas) | ✅ (hard delete) |
| Payments | ❌ (só via Members) | ✅ | ✅ | ❌ |
| Plans | ✅ | ✅ | ✅ | Deactivate (soft, sem hard delete) |

Não é só estilo — não existe forma de deletar um pagamento pela UI, nem de
criar uma membership avulsa sem passar pelo módulo Members. Se isso não for
intencional, vale decidir e documentar.

- Origem: doc 02, Cross-cutting patterns.

## [BAIXA] Tratamento de erro inconsistente entre os 6 hooks de dados

3 estratégias diferentes coexistem sem motivo aparente: `alert()` visível
ao usuário (Members archive, Memberships delete, Plans save), só
`console.error` sem feedback nenhum ao usuário (Dashboard, Payments). Uma
mudança de UX em "como mostramos erro" hoje exige tocar 5-6 arquivos.

- Origem: doc 02 e doc 04, §4.

## [INFO] `recharts` está no `package.json` mas não é usado

Todos os 4 componentes de gráfico do dashboard usam Chart.js
(`react-chartjs-2` + `chart.js/auto`). `recharts` não aparece em nenhum
import verificado nesses módulos — dependência morta (não descarta uso em
outro lugar fora do escopo revisado, mas nenhum dos arquivos de dashboard
usa).

- Origem: doc 03, §1.4.

## [INFO] Guard de rota é só client-side

`useAuthGuard` (`src/app/hooks/useAuth.ts`) é o único mecanismo de proteção
do route group `(admin)`. Não há middleware Next.js nem checagem de sessão
em server component — o HTML/JS de página protegida ainda é entregue ao
browser antes do redirect disparar. Para uma ferramenta admin interna pode
ser risco aceitável, mas não é defesa em profundidade.

- Origem: doc 01, §5.6.

---

## Sugestão de ordem de ataque

Se for priorizar correções por impacto/esforço:

1. Fail-closed em `check-access` + adicionar auth em `get-pending-tag`
   (alto impacto de segurança, baixo esforço — é literalmente adicionar a
   checagem que já existe num arquivo, no outro).
2. Ligar o badge "Sistema Ativo" ao estado real da subscription, ou pelo
   menos remover se não for possível fazer isso rápido — hoje ele mente.
3. Unificar o tipo `Plan` (baixo esforço, resolve uma divergência que é
   bug esperando acontecer).
4. Decidir e documentar se a cobertura de CRUD desigual entre módulos é
   intencional; se não for, é decisão de produto antes de ser trabalho de
   engenharia.
5. O resto (transações multi-insert, tratamento de erro centralizado,
   dashboard sem refetch) é dívida técnica real mas de menor urgência —
   ver doc 04 §5 para o plano de "deepening" nesses pontos.
