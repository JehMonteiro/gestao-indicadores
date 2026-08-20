import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 1000;

/** Query já montada (colunas, filtros, ordenação) — o .range() é aplicado aqui. */
type RangeableQuery = {
  range: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>;
};

type AnyClient = { from: (table: string) => any };

const isDev = (): boolean => {
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
};

/**
 * Busca TODOS os registros contornando o limite padrão de 1000 linhas do PostgREST,
 * paginando com .range() até a página vir incompleta.
 *
 * @param build  Recebe o cliente e devolve a query configurada, SEM .range().
 * @param table  Nome da tabela (apenas para log em desenvolvimento).
 * @param client Cliente alternativo (ex.: cliente administrativo no servidor).
 */
export async function fetchAll<T>(
  build: (sb: any) => unknown,
  table = "tabela",
  client: AnyClient = supabase as unknown as AnyClient,
): Promise<T[]> {
  const all: T[] = [];
  let page = 0;

  for (;;) {
    const from = page * PAGE_SIZE;
    const query = build(client) as RangeableQuery;
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    const rows = (data ?? []) as T[];
    for (const r of rows) all.push(r);

    if (rows.length < PAGE_SIZE) break;
    page++;
  }

  if (isDev()) {
    console.log(`[supabase] ${table} — ${all.length} registros carregados`);
  }

  return all;
}

/** Variante para código de servidor, com cliente explícito (ex.: supabaseAdmin). */
export function fetchAllWith<T>(
  client: AnyClient,
  build: (sb: any) => unknown,
  table = "tabela",
): Promise<T[]> {
  return fetchAll<T>(build, table, client);
}
