# 01 — Camada de dados e backend

Escopo: `src/lib/`, `src/app/api/`, `src/app/hooks/useAuth.ts`, e config raiz
(`next.config.mjs`, `tsconfig.json`, `components.json`, `package.json`,
`.eslintrc.json`, `tailwind.config.ts`). O `README.md` genérico não foi usado
como fonte.

---

## 1. Cliente Supabase

### 1.1 Cliente público (browser-safe) — `src/lib/supabase.ts`

Um único cliente compartilhado criado com `createClient(supabaseUrl,
supabaseAnonKey)` (`src/lib/supabase.ts:6`), usando `NEXT_PUBLIC_SUPABASE_URL`
e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`src/lib/supabase.ts:3-4`). Por serem
`NEXT_PUBLIC_*`, são intencionalmente inlinadas no bundle do browser — é o
cliente de baixo privilégio correto, protegido por RLS do Supabase (não
presente neste repo).

É o único cliente Supabase exportado de `src/lib/`. Importado por:
- `src/app/hooks/useAuth.ts:5` (checagem de sessão / listener de auth-state)
- `src/app/page.tsx:5` (form de login, `supabase.auth.signInWithPassword`,
  `src/app/page.tsx:17-20`)
- por inferência, também usado pelos hooks de dados dos módulos admin
  (confirmado no doc 02).

### 1.2 Clientes admin/service-role — inline nas rotas de API

Não há cliente admin compartilhado em `src/lib/`; cada rota de API instancia
o seu próprio cliente privilegiado, de forma independente:
- `src/app/api/check-access/route.ts:6-9`
- `src/app/api/get-pending-tag/route.ts:4-7`

Ambos usam `SUPABASE_SERVICE_ROLE_KEY`, que **não** é `NEXT_PUBLIC_*` — não é
exposta ao client-side pelo inlining de build do Next. Confirmado via
`grep -rn "process.env" src/`: a service-role key não aparece fora desses
dois arquivos de rota. Isso está correto, não é uma falha — mencionado aqui
porque a checagem foi pedida explicitamente.

Duplicação (não é problema de segurança, é manutenção): a construção do
cliente admin (`createClient(url, serviceRoleKey)`) está copiada
verbatim nos dois arquivos de rota em vez de fatorada num
`src/lib/supabaseAdmin.ts` compartilhado.

### 1.3 `src/lib/utils.ts`

Utilitário de UI puro, sem relação com backend: `cn()` mescla classes
Tailwind via `clsx` + `tailwind-merge` (`src/lib/utils.ts:4-6`). Referenciado
por `components.json` como o alias `utils` (`components.json:16`) para
componentes shadcn/ui.

---

## 2. Fluxo de autenticação — `useAuthGuard` (`src/app/hooks/useAuth.ts`)

Hook client component (`'use client'`, linha 1). No mount (`useEffect`,
`useAuth.ts:10-29`):

1. **Checagem de sessão**: `supabase.auth.getSession()` (`useAuth.ts:12`); se
   não há sessão ativa, redireciona para `/` via `router.push('/')`
   (`useAuth.ts:13-14`). É um guard client-side apenas — não há middleware
   nem checagem server-side, então o HTML/JS da página protegida ainda é
   enviado ao browser antes do redirect disparar (flash possível de
   conteúdo protegido).
2. **Sign-out ao vivo**: assina `supabase.auth.onAuthStateChange`
   (`useAuth.ts:20-24`); se o evento for `SIGNED_OUT` ou a sessão ficar
   falsy, também redireciona para `/` (`useAuth.ts:21-22`).
3. Cleanup da subscription no unmount (`useAuth.ts:26-28`).

Não expõe estado/retorno — é um guard "fire-and-forget", pensado para ser
chamado uma vez por layout protegido.

**Ponto de aplicação**: chamado exatamente uma vez no código inteiro, no
topo do layout do grupo de rotas admin: `src/app/(admin)/layout.tsx:35`
(`useAuthGuard();`), dentro de `AdminLayout`, que envolve todas as páginas
sob o route group `(admin)` (`src/app/(admin)/layout.tsx:33-43`) — boa
centralização, um único ponto de guarda pra tudo.

**Login**: `src/app/page.tsx` é a tela de login real (rota `/`), apesar do
README genérico. Chama `supabase.auth.signInWithPassword({ email, password
})` (`src/app/page.tsx:17-20`) e, no sucesso, navega para `/dashboard`
(`src/app/page.tsx:26`). Erros viram uma mensagem genérica em português
`'Email ou senha inválidos'` (`src/app/page.tsx:23`), logada no console
(`src/app/page.tsx:24`) — o erro real do Supabase não é mostrado ao usuário
nem diferenciado (ex: rate-limit vs. senha errada).

Não foi encontrado nenhum call site explícito de "sign out" nos arquivos
lidos; presumivelmente disparado em outro lugar (ex: botão no admin
chamando `supabase.auth.signOut()`), que o listener de `useAuth.ts:20-24`
capturaria e redirecionaria.

---

## 3. Rotas de API (`src/app/api/`)

Só existem duas rotas no repo: `check-access` e `get-pending-tag`. Ambas são
Route Handlers server-only usando clientes admin privilegiados (§1.2) e
conversam com RPC/tabelas do Supabase cujo SQL **não está neste repo** — são
documentadas abaixo como contratos externos inferidos da forma da chamada.

### 3.1 `POST /api/check-access` — `src/app/api/check-access/route.ts`

- **Propósito**: dado um UID de tag RFID escaneado num leitor físico de
  entrada da academia, decide se o membro tem acesso permitido e loga a
  tentativa no servidor (o log presumivelmente acontece dentro do RPC).
- **Runtime**: Edge explícito (`export const runtime = 'edge'`,
  `route.ts:4`) — a única rota edge do conjunto revisado; `get-pending-tag`
  não declara isso e usa Node.js por padrão.
- **Autenticação**: checagem de Bearer token contra `API_SECRET_TOKEN`
  (`route.ts:11,15-18`):
  ```
  const API_SECRET = process.env.API_SECRET_TOKEN;
  if (API_SECRET && authHeader !== `Bearer ${API_SECRET}`) { return 401 }
  ```
  **Essa checagem só é aplicada se `API_SECRET_TOKEN` estiver definida no
  ambiente** (`route.ts:16`, o short-circuit `API_SECRET &&`). Se a env var
  não estiver setada, o `if` nunca dispara e **a rota aceita qualquer
  requisição sem autenticação nenhuma**. Ver doc 05, item de severidade Alta.
- **Request**: JSON `{ rfid_uid: string }` (`route.ts:20`). `rfid_uid`
  ausente → `400 { allowed: false, reason: 'UID não fornecido' }`
  (`route.ts:21-23`). Nenhuma validação além de truthiness antes de passar o
  valor pro RPC.
- **Response**: retorna exatamente o que o RPC devolve como JSON
  (`route.ts:34`) — a forma de `data` é definida pela função Postgres
  `check_access_and_log`, não tipada/validada nesta rota (passthrough sem
  tipo).
- **Erros**: erro de RPC → `500 { allowed: false, reason: 'Erro no banco'
  }`, logado no servidor (`route.ts:29-32`). Exceção não capturada (ex: body
  malformado) → `500 { allowed: false, reason: 'Erro interno' }`
  (`route.ts:36-39`).
- **Contrato externo — RPC `check_access_and_log`**: chamado como
  `supabaseAdmin.rpc('check_access_and_log', { p_rfid_uid: rfid_uid })`
  (`route.ts:25-27`). Parâmetro único documentado: `p_rfid_uid`. Corpo SQL,
  tipo de retorno e efeitos colaterais (presumivelmente: buscar membro por
  tag RFID, checar validade/expiração da assinatura, inserir linha de log de
  acesso, retornar `{ allowed, reason, ... }`) **não estão neste repositório**
  e devem ser tratados como contrato externo definido no projeto Supabase.

### 3.2 `GET /api/get-pending-tag` — `src/app/api/get-pending-tag/route.ts`

- **Propósito**: endpoint de polling, aparentemente para o fluxo de "cadastrar
  nova tag RFID" no admin — um tag é escaneado uma vez (escrito numa tabela
  `pending_tags` por outro processo, ex: firmware do leitor, não presente
  neste repo) e o painel faz polling neste endpoint pra pegar a última tag
  escaneada e consumi-la.
- **Runtime**: sem `export const runtime` → Node.js por padrão (diferente de
  `check-access`, que é edge). Escolha de runtime inconsistente entre as
  duas rotas.
- **Autenticação**: **nenhuma**. Não há checagem de header, nenhuma
  comparação de token, nada (`route.ts:9-25` — o handler inteiro). Qualquer
  chamador não-autenticado que alcance esse endpoint pode ler (e, como
  efeito colateral, apagar) a tag RFID pendente mais recente. Ver doc 05,
  severidade Alta.
- **Response**: `{ rfid_uid: string | null }`. Se nenhuma linha é encontrada
  ou há erro, retorna `{ rfid_uid: null }` (`route.ts:17`) — erros são
  engolidos silenciosamente e indistinguíveis de "nada pendente" na camada
  HTTP (ambos retornam `200`); nenhum status de erro distinto é jamais
  retornado.
- **Comportamento — leitura-então-delete sem transação**: seleciona a linha
  mais nova de `pending_tags` (`route.ts:10-15`:
  `.select('id, rfid_uid').order('created_at', {ascending:false}).limit(1).maybeSingle()`),
  depois deleta por `id` separadamente (`route.ts:19-22`). São duas chamadas
  de rede independentes, não envolvidas numa transação/RPC única — se duas
  requisições concorrentes atingirem esse endpoint quase ao mesmo tempo,
  ambas podem ler a mesma linha antes que qualquer delete complete
  (condição de corrida). Severidade baixa, dado que é presumivelmente
  ferramenta admin de baixa concorrência.
- **Contrato externo — tabela `pending_tags`**: colunas referenciadas: `id`,
  `rfid_uid`, `created_at` (`route.ts:11-14`). Schema, políticas RLS e quem
  escreve nessa tabela estão fora deste repo.

---

## 4. Configuração raiz

### 4.1 `package.json`

Next.js `^16.0.10`, React `^19.2.1`/`react-dom ^19.2.1`,
`@supabase/supabase-js ^2.86.0`, Tailwind `^3.4.1` + `tailwindcss-animate` +
`tailwind-merge`, Radix (`@radix-ui/react-slot`),
`class-variance-authority`, `lucide-react`, e **duas** bibliotecas de
gráficos: `chart.js`/`react-chartjs-2` **e** `recharts` (ver doc 03 — só
Chart.js é efetivamente usado nos componentes de dashboard; `recharts`
parece dependência não utilizada, não verificado em outros lugares).

Scripts padrão `dev`/`build`/`start`/`lint`. **Sem script de teste**, sem
`typecheck` separado do `next build`.

Descompasso de versões (não quebra o build, mas é risco latente): `eslint-
config-next` fixado em `^15.3.1` (`package.json:31`) rodando contra Next
`^16.0.10`; `@types/react`/`@types/react-dom` fixados em `^18`
(`package.json:28-29`) enquanto `react`/`react-dom` reais são `^19.2.1` — um
major atrás.

### 4.2 `tsconfig.json`

**Strict mode ligado**: `"strict": true` (`tsconfig.json:10`) — é por isso
que os non-null assertions (`!`) em env vars são necessários em
`src/lib/supabase.ts:3-4` e nas duas rotas de API. Path alias `@/*` →
`./src/*` (`tsconfig.json:24-28`).

### 4.3 `next.config.mjs`

Efetivamente vazio: `const nextConfig = {}` — sem headers, redirects,
rewrites, domínios de imagem, ou flags experimentais. Notavelmente **sem
config de `headers()` para CORS/segurança**, relevante já que as duas rotas
de API são pensadas para serem chamadas por hardware/serviços externos
(leitores RFID).

### 4.4 `components.json` (shadcn/ui)

Style `"new-york"`, RSC + TSX habilitados. Aliases batem com o esquema
`@/*`, confirmando que `src/lib` também é o alvo do alias `lib` do shadcn.

### 4.5 `.eslintrc.json`

Mínimo: `{ "extends": "next/core-web-vitals" }` — só o conjunto padrão de
regras web-vitals do Next, sem regras `@typescript-eslint` estritas
adicionais, sem regras de import-order ou foco em segurança.

### 4.6 `tailwind.config.ts`

Tema padrão gerado por shadcn/ui (tokens de cor via CSS variables), dark
mode via estratégia `class`. Content globs incluem `src/pages` mesmo sendo
um projeto App-Router-only (nenhum diretório `pages/` encontrado) —
resquício inofensivo do scaffolding.

### 4.7 Variáveis de ambiente (confirmadas via `grep -rn "process.env" src/`)

| Variável | Usada em | Exposta ao browser? | Obrigatória? |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase.ts:3`, ambas as rotas de API | Sim (por design) | Sim — non-null asserted |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase.ts:4` | Sim (por design) | Sim — non-null asserted |
| `SUPABASE_SERVICE_ROLE_KEY` | ambas as rotas de API | Não (server-only) | Sim — non-null asserted |
| `API_SECRET_TOKEN` | `check-access/route.ts:11,16` | Não | **Não** — opcional; checagem é pulada inteiramente se não definida (ver doc 05) |

Não existe `.env.example` nem qualquer `.env*` no root do repo — esta
tabela é a única fonte de verdade disponível hoje para um novo deployer.

---

## Histórico recente (git log)

`git log --oneline -20` mostra a camada de API muito nova/em churn ativo:
`bcd2ead add: new api route`, `80b7574 add: rfid checking route for
entrance security`, `d0f8b64`/`4dff15a fix: rfid`/`fix: rfid logic`,
culminando em `da2146b update: new monitoring tab for access logs` e
`359e066 change: overall fix` — consistente com o recurso de
controle-de-acesso/monitoramento sendo a parte mais recentemente
desenvolvida e menos hardenizada do código, alinhado com as lacunas de auth
sinalizadas no doc 05.
