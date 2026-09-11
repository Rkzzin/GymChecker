// Tipo de domínio compartilhado — canônico, deve bater com as colunas reais
// da tabela `plan` no Supabase. Antes esse shape estava duplicado em
// members/types.ts (sem `is_active`) e plans/types.ts (com `is_active`),
// já divergentes. Ver docs/05-divergences-and-risks.md (item MÉDIA —
// dívida de dados) e docs/04-architecture-review.md §4.
export interface Plan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  is_active: boolean;
}
