# 04 — Revisão de arquitetura (deep modules)

Feita aplicando a skill `codebase-architecture-review` (vocabulário
Ousterhout/Feathers: module / interface / implementation / depth / seam /
adapter / leverage / locality). Escopo: `src/app/(admin)/{members,
memberships,payments,plans,dashboard,monitoring}`, `src/lib/supabase.ts`,
`src/app/hooks/useAuth.ts`, `src/app/api/{check-access,get-pending-tag}/
route.ts`.

---

## 1. Os hooks `useXxx`: profundos ou rasos?

Aplicando o **teste da deleção** — se a lógica do hook fosse inlinada no
`page.tsx`, a complexidade se concentraria (profundo) ou só se moveria sem
redução (raso)?

| Hook | Interface retornada | Implementação | Veredito |
|---|---|---|---|
| `useMembers` | ~25 campos/handlers (members, plans, loading×2, estado de busca/ordenação/view, 3 flags de modal, 2 alvos de edição, 5 funções de ação) | Duas queries Supabase (join `customer`→`subscription`/`plan`, e `plan`), achatamento de linha, toggle de status com `window.confirm`/`alert`, sort/filter local | **Profundo, mas com interface quase tão larga quanto a implementação.** Existe lógica real (achatamento de join + localização de data + cálculo de inatividade), então deletar não move um passthrough — concentra comportamento real. Mas 25 campos de retorno é uma interface grande pro que faz. Veredito: **profundo-limítrofe, interface larga demais** — quem chama precisa aprender ~25 nomes. |
| `useMemberships` | 14 campos incl. mapas com lazy-load (`openMemberships`, `loadingMemberships` chaveados por id de membro) | Fetch sob demanda por membro, delete com `confirm()`, efeito colateral de dark-mode duplicado do `useDashboard` (verbatim) | **Profundo pro seu trabalho principal** (fetch lazy por membro + achatamento é comportamento real que quem chama não deveria reimplementar), mas carrega **uma responsabilidade não relacionada** — persistir `darkMode` no localStorage/DOM. Interface leaky: o módulo faz dois trabalhos não relacionados. |
| `usePayments` | 7 campos: payments, loading, filtros mês/ano, refresh, update | Matemática de intervalo de data mês/ano, uma query, um update+refetch | **Profundo e proporcional.** Interface pequena, uma peça real (mesmo que pequena) de lógica — a aritmética de rollover de mês — que quem chama genuinamente não deveria refazer. O hook mais bem desenhado dos quatro CRUD. |
| `usePlans` | 4 campos: plans, loading, savePlan, toggleStatus | Passthrough CRUD direto: `savePlan` é `if(id) update else insert`, `toggleStatus` é um único update | **Raso.** `savePlan`/`toggleStatus` não adicionam quase nada além do que `supabase.from('plan').update(...)` já dá — inlinar no `page.tsx` não concentraria lógica significativa em lugar nenhum, só removeria um hop. |
| `useDashboard` | 8 campos: datasets brutos + `kpis` + estado de UI | `fetchAll` genérico paginado (loop de range reutilizável), fetch paralelo de 3 tabelas, agregação de KPI em `useMemo` | **Profundo.** O loop de paginação do `fetchAll` e a redução de KPI são computação real que sujaria o `page.tsx` se inlinada, e são logicamente puras/testáveis independentemente (o `useMemo` de `kpis` recebe arrays simples, produz objeto simples — sem efeito colateral). Melhor candidato a teste unitário genuíno sem tocar Supabase. |
| `useAccessLogs` | 1 campo: `logs` | Fetch inicial + subscription/teardown de canal Realtime do Supabase + efeito sonoro | **Profundo.** Interface minúscula (`{ logs }`), mas esconde complexidade real: gerenciamento de ciclo de vida de canal realtime, cleanup no unmount, e merge de payload `postgres_changes` no estado local. O módulo mais profundo do código pela definição da skill — leverage máximo por campo de interface. |

**Veredito geral**: profundidade neste código correlaciona com *quanta
lógica de transformação/ciclo-de-vida* um hook possui, não com quantos
campos retorna. `usePlans` é o único hook claramente raso (passthrough
CRUD). `useAccessLogs` e `useDashboard` são os mais profundos (ciclo de vida
realtime, paginação+agregação). `useMembers` e `useMemberships` são módulos
reais cujas *interfaces* estão infladas com estado de UI/modal que
arguivelmente não pertence a um módulo de fetch de dados (ver §4).

---

## 2. Seams e adapters

**O único seam neste código é a própria fronteira do cliente Supabase**
(`src/lib/supabase.ts:6`), mais um segundo cliente admin instanciado
separadamente em cada rota de API.

- **Não existe porta (port).** Todo hook (`useMembers`, `useMemberships`,
  `usePayments`, `usePlans`, `useDashboard`, `useAccessLogs`) e
  `useAuthGuard` importam `supabase` diretamente de `@/lib/supabase` e
  chamam `.from()`/`.rpc()`/`.auth`/`.channel()` no SDK real. Não há
  interface (no sentido da skill — invariantes, modos de erro etc.) entre os
  hooks e a interface do próprio SDK do Supabase. Os hooks *são* adapters
  in-place, acoplados 1:1 a uma única implementação concreta.
- **Aplicando "um adapter = seam hipotético, dois = real":** hoje existe
  exatamente **um adapter** para a dependência Supabase (a chamada real de
  `createClient`) em todo o app — reutilizado diretamente, nem sequer
  encapsulado. Não há um segundo adapter em lugar nenhum (sem fake em
  memória, sem test double, sem mock client). Pela regra da skill, isso
  significa que **não existe um seam real na camada de dados hoje** —
  `supabase.ts` não é um seam, é só um singleton compartilhado importado.
- **Como seria um segundo adapter**: uma interface `GymDataPort` (ou portas
  por domínio: `MembersPort`, `PaymentsPort`) com métodos como
  `listActiveMembers()`, `archiveMember(id)`, `getSubscriptionsForMember(id)`.
  O adapter de produção envolve `supabase.from(...)`; o adapter de teste é
  um objeto em memória com arrays simples. Só quando os dois existem é que
  o `lib/supabase.ts` vira um seam real — hoje, introduzir a porta é
  **pré-requisito**, não algo já possível. Nada hoje permite rodar
  `useMembers` contra um fake sem (a) mockar o módulo `@supabase/supabase-js`
  no nível do test-runner (mock de módulo, não um seam de design) ou (b)
  bater num Supabase real.
- **Rotas de API como seam**: os dois route handlers **são** um seam
  legítimo — são a borda de rede chamada por hardware externo (leitores
  RFID), e ambos delegam para RPCs do Supabase em vez de embutir lógica de
  negócio na rota. Posicionamento razoável: a lógica real de controle de
  acesso vive numa função Postgres, não em TypeScript, então não há nada
  pra "aprofundar" do lado TS — a rota é um adapter fino e corretamente raso
  sobre um RPC Postgres. É o único lugar do código onde "wrapper fino" é a
  forma **correta**, porque a lógica real pertence ao Postgres (fora de
  escopo aqui).

**Conclusão §2**: GymChecker tem **zero adapters** no sentido Ports &
Adapters. `supabase` é uma implementação concreta compartilhada
globalmente, importada diretamente por ~7 call sites. Bom para leverage (um
cliente, reutilizado em todo lugar), ruim para testabilidade: nenhum dos
hooks CRUD pode ser testado unitariamente sem bater num Supabase real ou
mockar o módulo do SDK diretamente em cada arquivo de teste (duplicando
setup de mock por hook — o antipadrão de "testar raso" que a skill avisa).

---

## 3. Os 4 hooks CRUD se fundem num módulo genérico?

Veredito: **fusão parcial se justifica, fusão total não** — não são 4
módulos independentemente rasos com formas idênticas; dois têm lógica real
por domínio que resistiria a virar um `useSupabaseTable(tableName)`
genérico.

**Boilerplate estrutural que É idêntico entre os quatro** (candidato a
fusão): `useState` para coleção + `loading`; `try/catch/finally` em volta de
todo fetch, cada um com sua própria string de `console.error`;
`useEffect(() => { fetchX() }, [deps])` no mount — forma idêntica nos
quatro, mas copiada 4 vezes, não compartilhada.

**Lógica real por módulo que resiste à fusão:**
- `useMembers`: faz **join relacional + achatamento** (`customer` → última
  `subscription` → `plan`), escolhe a assinatura *mais recente* ordenando
  por `end_date` client-side, calcula `isInactiveMoreThan5Days`, formata
  duas datas em pt-BR. Nada disso é CRUD genérico de tabela — é lógica de
  dados derivados específica de members.
- `useMemberships`: busca **lazy por id de membro**, mantém um **mapa de
  loading chaveado** em vez de um boolean único, faz merge de novos dados
  num array existente filtrando primeiro as linhas antigas do membro
  afetado. Padrão de fetch/merge por chave estruturalmente diferente do
  padrão "buscar tudo num array" dos outros três hooks.
- `usePayments`: tem **lógica de parâmetro de query** — converte um filtro
  UI mês+ano num range `gte`/`lt` com tratamento de rollover de dezembro —
  que um hook genérico precisaria tratar como caso especial por tabela.
- `usePlans`: é o mais próximo de CRUD genuinamente genérico (`fetch` /
  `insert-ou-update` / `toggle de campo boolean`), e poderia realisticamente
  virar `useSupabaseTable('plan')` com quase nenhuma perda.

**Veredito concreto**: só `usePlans` e, frouxamente, o *scaffolding de
fetch* de `usePayments` parecem instâncias de um módulo genérico "CRUD
raso". `useMembers` e `useMemberships` carregam lógica de transformação
real e não-intercambiável (achatamento de join + cálculo de inatividade vs.
fetch/merge lazy por chave) que um hook genérico único teria de tratar como
casos especiais de volta por tabela (derrotando o propósito da fusão) ou
perder inteiramente. **Recomendação: extrair os ~20% realmente
compartilhados (wrapper de query + tratamento de erro + estado de loading)
num helper pequeno e profundo, não a lógica de domínio.** Ver §5.

---

## 4. Outros achados de módulo raso / interface leaky

- **Tipo `Plan` duplicado e divergente.** `members/types.ts:1-6` e
  `plans/types.ts:1-6` ambos declaram `export interface Plan`, mas
  diferem: `plans/types.ts` inclui `is_active: boolean`, `members/types.ts`
  não. Sintoma clássico de interface leaky — o mesmo conceito de domínio
  tem duas interfaces porque nenhum módulo compartilhado o possui, então
  cada módulo admin deriva sua própria visão parcial e elas já divergiram.
- **Tratamento de erro ad-hoc, por hook, sem localidade.** Cada hook
  implementa seu próprio `try/catch` e seu próprio canal de erro
  user-facing: `useMembers.ts:116` usa `alert(...)`,
  `useMemberships.ts:91` usa `alert('Erro ao excluir matrícula.')`,
  `usePlans.ts:63` usa `alert(...)` após `console.error`,
  `useDashboard.ts:55` só `console.error`, sem feedback ao usuário,
  `usePayments.ts:32` idem. Não há módulo compartilhado de report de erro —
  uma correção de bug ou mudança de UX em "como mostramos erros" exige
  tocar 6 arquivos em vez de 1. Oposto de localidade: uma mudança que
  deveria concentrar está espalhada.
- **`window.confirm`/`confirm()` chamado diretamente dentro de hooks**
  (`useMembers.ts:111`, `useMemberships.ts:85`) acopla hooks de lógica de
  negócio a um global do browser e a UI síncrona bloqueante — também
  significa que esses hooks nunca rodam num ambiente de teste não-browser
  sem mockar `window`, outro sintoma de seams ausentes.
- **Lógica de persistência de dark-mode duplicada verbatim** em dois hooks
  não relacionados: `useMemberships.ts:26-30` e `useDashboard.ts:21-25` são
  byte-a-byte o mesmo `useEffect`. Deveria viver uma vez, no
  `ThemeProvider` (que ambos já consomem para o próprio `darkMode`) ou num
  `useDarkModePersistence()` — não copiado em todo hook que lê `darkMode`.
- **Dois clientes Supabase criados independentemente, com privilégios
  diferentes, sem factory compartilhada.** `src/lib/supabase.ts:6` cria um
  cliente com anon key; as duas rotas de API cada uma chama `createClient`
  separadamente com a service-role key, duplicando o wiring de URL/key. Não
  está errado (anon vs. service-role precisam diferir), mas a duplicação
  significa que uma mudança de config futura (retries, headers, logging)
  precisa ser aplicada em 3 lugares.
- **A interface de `useMembers` está fazendo bookkeeping de UI/modal que
  não é lógica de dados de "members"** — 3 flags de abrir/fechar modal, 2
  objetos de "coisa sendo editada". Estado de apresentação andando dentro
  da interface de um módulo de fetch de dados, por isso a interface tem 25
  campos de largura pro que é fundamentalmente um hook de lista+CRUD de
  membros. Mesmo padrão, escala menor, em `useMemberships`.

---

## 5. Oportunidades de deepening priorizadas

Classificando por DEEPENING.md: Supabase (`@supabase/supabase-js` contra um
projeto Postgres hospedado) é uma dependência **"remote but owned"** — não é
um SaaS terceiro puro tipo Stripe (categoria 4), é *seu* banco de dados,
alcançado pela rede, mas cujo schema/RPCs você controla. Isso coloca na
**categoria 3 (Ports & Adapters)**: definir uma porta, injetar um adapter de
produção (o cliente Supabase real) e um adapter de teste (fake em memória),
pra lógica de hook ser testável sem banco ao vivo.

1. **(Maior leverage) Introduzir um seam `GymDataPort` sobre o Supabase
   antes de fundir ou testar qualquer hook.** Hoje existe um adapter (o
   cliente real) e zero adapters de teste — pela regra da skill, nenhum
   seam real existe ainda. Definir portas estreitas por domínio (ex:
   `MembersRepo.listMembers(view)`, `MembersRepo.archiveMember(id)`;
   `PaymentsRepo.listForMonth(y,m)`) com adapter de produção envolvendo
   `supabase.from(...)` e adapter em memória para testes. Isso desbloqueia
   todo o resto abaixo e é a única forma da lógica de KPI do `useDashboard`
   ou do achatamento de join do `useMembers` ficarem testáveis sem banco ao
   vivo.
2. **Centralizar tratamento de erro num módulo único e profundo,
   substituindo os 6 sites copy-pasted de `try/catch`+`alert`/`console.error`.**
   Um `reportError(context, error)` único (ou wrapper `useAsyncAction`
   padronizando loading/erro/sucesso) concentraria a decisão de "como
   mostramos falhas" num lugar só — hoje uma mudança de UX exige tocar
   `useMembers.ts`, `useMemberships.ts`, `usePayments.ts`, `usePlans.ts`,
   `useDashboard.ts` individualmente, com três UX de falha diferentes
   (`alert`, só-console, só-console) provavelmente acidentais.
3. **Extrair o scaffolding CRUD compartilhado (fetch-com-loading-e-erro) de
   `usePlans`/`usePayments` num helper genérico pequeno, mas manter a lógica
   de domínio de `useMembers`/`useMemberships` (achatamento de join, fetch
   lazy por chave) como módulos profundos separados que chamam esse
   helper.** Não tentar fundir os 4 num único `useSupabaseTable` — §3
   mostrou que `useMembers` e `useMemberships` têm comportamento real
   não-intercambiável que vazaria de volta como branches especiais,
   recriando o problema de interface rasa que a fusão pretendia resolver.
4. **Unificar o tipo `Plan` duplicado (e, de forma geral, elevar tipos de
   domínio de `types.ts` por módulo que representam a mesma linha de banco)
   num módulo de tipos de domínio compartilhado**, ex: `src/lib/types/
   plan.ts`, importado tanto por `members` quanto `plans`. Correção pequena
   e mecânica, mas endereça diretamente a divergência já observada
   (`is_active` presente numa cópia, ausente na outra) — um bug real
   esperando pra aparecer onde o `Plan` de `members/types.ts` for usado
   onde `is_active` for de fato necessário.

---

## Nota sobre disciplina de escopo

Nem todo lugar que parece raso precisa de correção. **As rotas de API são
corretamente rasas** (§2) — são adapters finos sobre RPCs Postgres que já
possuem a lógica real de controle de acesso, e aprofundá-las do lado
TypeScript só duplicaria lógica que pertence ao banco. Seguindo a própria
cautela da skill: não introduzir uma porta em todo seam por reflexo, só
onde o teste da deleção mostra que complexidade está de fato sendo escondida
ou espalhada (como demonstravelmente está nas chamadas Supabase dos hooks
CRUD e no tratamento de erro), não onde um passthrough fino é a forma certa.
