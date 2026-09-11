# 03 — Dashboard e monitoramento

Escopo: `src/app/(admin)/dashboard/`, `src/app/(admin)/monitoring/`,
`src/app/layout.tsx`, `src/app/globals.css`, `src/components/ThemeProvider.tsx`,
`src/components/DashboardCard.tsx`.

---

## 1. Dashboard / Analytics

### 1.1 Fonte de dados e query (`dashboard/hooks/useDashboard.ts`)

Todos os dados vêm de **queries Supabase client-side diretas** — sem
RPC/stored procedure, sem server component/route envolvida.

- `useDashboard.ts:28-41` — `fetchAll(table, select)`: helper genérico de
  **paginação** que faz loop `supabase.from(table).select(select).range(from,
  from+999)` em blocos de 1000 linhas até uma página curta ser retornada,
  concatenando resultados. Isso significa que o dashboard puxa **a tabela
  inteira** de `customer`, `subscription` e `payment` para o browser, não só
  o ano corrente — o filtro por ano acontece client-side.
- `useDashboard.ts:43-59` (`fetchAllData`), chamado uma vez num `useEffect`
  com array de dependências vazio (`useDashboard.ts:17-19`) — ou seja,
  **fetch único no mount, sem polling, sem realtime, sem refetch ao trocar
  o ano**. Trocar o dropdown de ano só refiltra dados já carregados em
  memória; não reconsulta o Supabase.
  - `fetchAll('customer', 'id, name, status')` → `useDashboard.ts:47`
  - `fetchAll('subscription', '*, plan(name)')` → `useDashboard.ts:48`
  - `fetchAll('payment', '*')` → `useDashboard.ts:49`
  - As três rodam em paralelo via `Promise.all` (`useDashboard.ts:46-50`).
- KPIs computados num `useMemo` sobre `payments`/`members`/`year`
  (`useDashboard.ts:62-76`): filtra `payments` onde `payment_date` começa
  com o ano selecionado, calcula `totalSalesCount`, `totalRevenue`,
  `ticketMedio` (receita/contagem), e `activeMembers` (contagem de membros
  `status === 'active'`, **não filtrado por ano** — sempre atual entre todos
  os membros carregados).
- Nota: este hook também lê `useTheme()` independentemente e espelha o
  estado dark-mode no `localStorage`/`document.documentElement`
  (`useDashboard.ts:14,17,21-25`) — lógica duplicada da que já existe em
  `ThemeProvider.tsx` (ver §3), efetivamente redundante.

### 1.2 Tipos (`dashboard/types.ts`)

`Subscription` (`id, customer_id, start_date, end_date, created_at`, `plan:
{name}` opcional embedado), `Payment` (`id, amount, payment_date, method`),
`Member` (`id, name, status`), `DashboardKPIs` (`totalSalesCount,
totalRevenue, activeMembers, ticketMedio`).

### 1.3 Utils (`dashboard/utils.ts`)

Funções de agregação client-side puras, operando sobre arrays já
buscados (sem agrupamento no banco):

- `formatCurrency` — `toLocaleString('pt-BR', {style:'currency',
  currency:'BRL'})`.
- `getMonthlyData(payments, year, dataType)` — agrupa `payment_date`
  (parseado por string-slicing `substring(0,4)`/`substring(5,7)`, não
  `Date`) em array de 12 posições, somando `amount` (`'revenue'`) ou
  contando linhas (`'count'`).
- `getPaymentMethodsData(payments, year)` — agrupa `amount` por `method`
  capitalizado.
- `getPlansData(subscriptions, year)` — agrupa contagem de assinaturas por
  `plan?.name` (fallback `'Personalizado'`).

### 1.4 Gráficos — biblioteca realmente usada: **Chart.js via `react-chartjs-2`**, NÃO recharts

Apesar de `recharts` estar nas deps, todo componente de gráfico em
`dashboard/components/` importa `react-chartjs-2` + `chart.js/auto`:

| Componente | Tipo | Dados | Notas |
|---|---|---|---|
| `RevenueChart.tsx` | `Bar` | receita mensal | barras laranja, dark-mode-aware |
| `SalesChart.tsx` | `Line` | volume de vendas mensal | linha/área azul, `tension:0.3` |
| `PaymentMethodChart.tsx` | `Pie` (donut, `cutout:'70%'`) | receita por método de pagamento | paleta fixa de 4 cores |
| `PlansChart.tsx` | `Doughnut` | contagem de assinaturas por plano | paleta fixa de 4 cores |
| `DashboardStats.tsx` | não é gráfico — 4 tiles `DashboardCard` | consome `kpis` | `showRevenue` mascara receita/ticket atrás de `"R$ ••••••"` |

Todas as 4 paletas de gráfico são arrays hardcoded (nenhuma usa os tokens de
cor `--chart-1..5` definidos em `globals.css:48-52,75-79` — variáveis
existem mas não são consumidas pelos componentes Chart.js, inconsistência de
design).

`page.tsx` compõe o layout: linha de KPIs → grid 2-col (Revenue+Sales) →
grid 2-col (PaymentMethods+Plans). Seletor de ano (últimos 5 anos) e toggle
`showRevenue` só re-renderizam (sem refetch).

**Ressalva de staleness**: como os dados são buscados uma vez no mount sem
polling/realtime/refetch, o dashboard reflete o estado das tabelas **só no
momento do carregamento da página**. Uma sessão longa nesta página mostraria
KPIs/gráficos cada vez mais desatualizados até reload manual.

---

## 2. Monitoramento / log de acesso

### 2.1 Estratégia de fetch (`monitoring/hooks/useAccessLogs.ts`) — híbrido: fetch inicial + subscription Realtime

- Carga inicial: `supabase.from('access_logs').select('*').order('created_at',
  {ascending:false}).limit(15)` (`useAccessLogs.ts:11-17`) — últimas 15
  entradas, mais nova primeiro, fetch único (sem paginação, sem intervalo de
  polling).
- Atualizações ao vivo: `supabase.channel('monitoring-room').on
  ('postgres_changes', {event:'INSERT', schema:'public', table:'access_logs'},
  callback)` então `.subscribe()` (`useAccessLogs.ts:23-34`) — subscription
  **real** de CDC Postgres via Supabase Realtime (WebSocket), não polling.
  No INSERT, prepende a nova linha e trunca a lista de volta pra 15
  (`useAccessLogs.ts:30`). Canal é limpo no unmount via
  `supabase.removeChannel(channel)` (`useAccessLogs.ts:36-38`).
- Só escuta eventos `INSERT` — **UPDATE/DELETE em `access_logs` não são
  refletidos ao vivo** (gap menor, não bloqueador operacional já que logs
  parecem append-only).
- Toca um som de notificação a cada evento realtime (`playNotificationSound
  ('success'|'error')`, sintetizado via Web Audio API — 880Hz para
  permitido, 440Hz para negado).

### 2.2 Formato do log de acesso (`monitoring/types.ts`)

```ts
interface AccessLog {
  id: string;
  customer_id: string | null;   // nullable — tentativas com cartão não reconhecido
  customer_name: string;
  rfid_uid: string;
  allowed: boolean;
  reason: string;
  created_at: string;
}
```

### 2.3 Renderização (`monitoring/components/AccessLogCard.tsx`) — sim, distingue visualmente permitido vs. negado

- Borda/fundo: verde para permitido, vermelho para negado
  (`AccessLogCard.tsx:10`). Texto de motivo espelha as mesmas cores.
- Ícone: 🔓 (permitido) / 🔒 (negado) (`AccessLogCard.tsx:26-28`).
- Horário via `formatTime()` = só hora:minuto:segundo, sem data — combinado
  com o cap fixo de 15 entradas, logs mais antigos que "hoje" ou além das
  últimas 15 não têm contexto de data na UI.
- Entrada anima com `slide-in-from-right-5` para sensação de feed ao vivo.

`monitoring/page.tsx` renderiza um badge estático "Sistema Ativo" com
ponto pulsante (`animate-ping`) — **puramente decorativo/hardcoded**, não
ligado ao estado real da conexão WebSocket; mostraria "Sistema Ativo" mesmo
se o canal realtime desconectasse silenciosamente (sem tratamento de erro de
conexão, sem reconexão/backoff visível em `useAccessLogs.ts`).

### 2.4 Avaliação operacional de tempo real/staleness (relevante — esse app controla uma porta física)

- O monitoramento **é** genuinamente realtime para novos eventos (push CDC
  do Supabase Realtime, latência tipicamente sub-segundo), apropriado para
  uma tela de auditoria/observabilidade, não o caminho de controle de acesso
  em si.
- **Porém**: essa página é só um visualizador passivo de log — sem afinidade
  de controle (sem destravamento remoto, sem status ao vivo da porta, sem
  ação de "negar/sobrepor"), então não influencia o acesso físico; só
  espelha inserts em `access_logs` presumivelmente escritos pela API
  `check-access` separada depois da decisão já tomada. Riscos a sinalizar:
  1. **Sem tratamento visível de reconexão/erro** — se o WebSocket cair, a
     UI não dá indicação nenhuma; o badge hardcoded "Sistema Ativo"
     enganaria um operador achando que o feed está vivo quando na verdade
     está mudo.
  2. **Sem fallback de polling** — só fetch inicial + subscription (sem
     refetch por intervalo); uma subscription perdida/falha deixa o admin
     permanentemente desatualizado até reload manual.
  3. Cap rígido de 15 linhas sem paginação/"carregar mais" para fins de
     auditoria; revisão de histórico além disso exige consultar o banco
     diretamente.

---

## 3. Tema (`src/components/ThemeProvider.tsx`)

- **Não** é wrapper de `next-themes` nem lib externa — é um React Context
  feito à mão (`createContext`/`useContext`) com `useState<boolean>` local
  para `darkMode` e callback `toggleDarkMode`.
- Persistência: lê/escreve `localStorage.getItem/setItem('darkMode', ...)`
  diretamente e alterna a classe `dark` em `document.documentElement` —
  padrão clássico de `darkMode: 'class'` do Tailwind, implementado à mão.
- Sem tratamento de hidratação SSR-safe (sem `suppressHydrationWarning`, sem
  script injetado antes do paint como `next-themes` faz) — como a classe só
  é aplicada num `useEffect` pós-mount, há um flash breve do tema padrão
  (claro) no primeiro paint para usuários com preferência dark salva (risco
  de FOUC).
- **Não montado na raiz**: `src/app/layout.tsx` NÃO envolve `children` em
  `ThemeProvider` (body renderiza `{children}` diretamente, só com a classe
  da fonte Inter). `ThemeProvider` é montado um nível abaixo, em
  `src/app/(admin)/layout.tsx:33-43` — ou seja, o contexto de tema só está
  disponível dentro do route group `(admin)`, não em rotas públicas/de auth
  fora dele.
- Tanto `useDashboard.ts` quanto o próprio `ThemeProvider.tsx` escrevem
  independentemente o mesmo efeito colateral de `localStorage`/classe DOM —
  lógica duplicada e redundante, inofensiva mas valeria limpar.

---

## 4. `src/app/layout.tsx` (root layout)

Layout raiz mínimo: carrega `Inter` de `next/font/google`, define `metadata`
estático (`title: "RLFitness"`, descrição genérica), renderiza
`<html lang="en"><body className={inter.className}>{children}</body></html>`.
Sem providers, sem classe de tema, sem chrome global aqui — todo o chrome
admin (header, footer, tema) vive em `(admin)/layout.tsx`. Ou seja, o nome
real do produto na aba do browser é "RLFitness", não "GymChecker" (bate com
o rodapé "© 2025 RLFitness Evolution" em `(admin)/layout.tsx:25`).

---

## 5. `src/components/DashboardCard.tsx`

Card apresentacional estilo shadcn/ui: envolve `Card/CardHeader/CardTitle/
CardContent` de `@/components/ui/card`. Props: `title, value, description?,
icon?, trend?{value, isPositive}, className?`. Renderiza título+ícone
opcional no header, `value` grande no conteúdo, `description` opcional, e
linha de `trend` opcional (verde/vermelho, "from last month").

**Nota**: o uso real do dashboard (`DashboardStats.tsx:18-45`) nunca passa a
prop `trend` — nenhum dos 4 tiles de KPI mostra tendência mês-a-mês mesmo o
componente suportando isso; capacidade não usada (código morto do ponto de
vista do dashboard).

Fundo usa classe utilitária `bg-gradient-card` mesclada via `cn()` com a
classe do caller (dashboard passa `cardClass`, um par plain light/dark
bg+border calculado em `dashboard/page.tsx:21`, não derivado dos tokens CSS
do shadcn) — mais uma instância dos dois sistemas de tema (toggle manual de
classe Tailwind `dark:` vs. tokens CSS-variable do shadcn) coexistindo sem
unificação.

---

## 6. `src/app/globals.css` (tokens de design)

Duas mecânicas de tema sobrepostas no mesmo arquivo:
1. CSS vars legadas do starter Next.js (`--foreground-rgb`,
   `--background-start-rgb`, `--background-end-rgb`) dirigidas por
   `prefers-color-scheme: dark` no nível do SO — parece boilerplate
   remanescente, não claramente consumido em outros arquivos revisados.
2. Tokens HSL estilo shadcn/ui sob `:root` e `.dark` (`--background,
   --foreground, --card, --primary, --secondary, --muted, --accent,
   --destructive, --border, --input, --ring, --chart-1..5, --radius`) —
   essa é a mecânica que o toggle de classe do `ThemeProvider` realmente
   ativa, e o que componentes shadcn/ui como `Card` (usado por
   `DashboardCard`) consomem.

`--chart-1` a `--chart-5` estão definidos para light/dark mas, como notado
em §1.4, **não são usados** por nenhum gráfico Chart.js do dashboard, que
hardcodam suas próprias paletas hex.

---

## Resumo dos achados principais

1. **Dashboard é fetch único, client-side, de tabelas inteiras** (paginado
   em blocos de 1000) via Supabase JS — sem RPC, sem realtime, sem polling,
   sem refetch ao trocar ano. Dados podem ficar desatualizados pela duração
   da sessão da página.
2. **Biblioteca de gráfico realmente usada é Chart.js**, não `recharts`,
   nos 4 componentes de gráfico do dashboard. `recharts` parece dependência
   não utilizada para este módulo.
3. **Monitoramento é genuinamente realtime** para novos inserts via
   Supabase Realtime, com seed de fetch inicial de 15 linhas. Distingue
   visualmente permitido (verde/🔓) vs. negado (vermelho/🔒).
4. **Risco operacional**: o badge "Sistema Ativo" do monitoramento é
   decorativo/hardcoded, não ligado ao estado real da subscription — um
   WebSocket caído passaria despercebido por um operador olhando a tela,
   sem fallback de polling nem UI de reconexão.
5. **Tema é Context + localStorage + toggle de classe feito à mão**, não
   `next-themes`. Montado só dentro de `(admin)/layout.tsx`, escopado às
   rotas admin. Risco leve de FOUC. Dois sistemas de tokens paralelos
   coexistem em `globals.css`; gráficos não usam nenhum dos dois.
