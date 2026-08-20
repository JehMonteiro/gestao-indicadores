import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Chamado, FiltrosChamados, LoteChamados } from "@/types/chamados";
import { SITUACOES_ABERTAS } from "@/types/chamados";

function mapRow(r: Record<string, unknown>): Chamado {
  const num = (v: unknown) => (v == null ? null : Number(v));
  return {
    id: String(r["id"]),
    situacao: String(r["situacao"] ?? ""),
    aberto_em: (r["aberto_em"] as string) ?? null,
    respondido_em: (r["respondido_em"] as string) ?? null,
    resolvido_em: (r["resolvido_em"] as string) ?? null,
    concluido_em: (r["concluido_em"] as string) ?? null,
    prazo_planejado: (r["prazo_planejado"] as string) ?? null,
    prazo_estipulado: (r["prazo_estipulado"] as string) ?? null,
    satisfacao_nota: num(r["satisfacao_nota"]),
    unidade: (r["unidade"] as string) ?? null,
    solicitante: (r["solicitante"] as string) ?? null,
    responsavel: (r["responsavel"] as string) ?? null,
    departamento_recebimento: (r["departamento_recebimento"] as string) ?? null,
    departamento_envio: (r["departamento_envio"] as string) ?? null,
    assunto: (r["assunto"] as string) ?? null,
    categoria: (r["categoria"] as string) ?? null,
    subcategoria: (r["subcategoria"] as string) ?? null,
    qtd_interacao: Number(r["qtd_interacao"] ?? 0),
    etiquetas: (r["etiquetas"] as string[]) ?? [],
    tma_horas: num(r["tma_horas"]),
    tmr_horas: num(r["tmr_horas"]),
    no_prazo: (r["no_prazo"] as boolean | null) ?? null,
    importado_em: String(r["importado_em"] ?? ""),
    importado_por: (r["importado_por"] as string) ?? null,
    lote_id: String(r["lote_id"] ?? ""),
  };
}

/** Busca todos os chamados paginando até esgotar os resultados. */
export async function fetchAllChamados(): Promise<Chamado[]> {
  // fetchAll — contorna limite 1000 do PostgREST
  const rows = await fetchAll<Record<string, unknown>>(
    (sb) => sb.from("chamados").select("*").order("aberto_em", { ascending: false }).order("id", { ascending: true }),
    "chamados",
  );
  return rows.map(mapRow);
}

/** Todos os chamados (sem filtros) — base para opções de filtro e estado vazio. */
export function useChamadosTodos() {
  return useQuery({
    queryKey: ["chamados", "todos"],
    queryFn: fetchAllChamados,
    staleTime: 1000 * 60 * 2,
  });
}

export function aplicarFiltros(chamados: Chamado[], f: FiltrosChamados): Chamado[] {
  return chamados.filter((c) => {
    if (f.de && (!c.aberto_em || c.aberto_em < f.de)) return false;
    if (f.ate && (!c.aberto_em || c.aberto_em > f.ate)) return false;
    if (f.situacao?.length && !f.situacao.includes(c.situacao)) return false;
    if (f.responsavel && c.responsavel !== f.responsavel) return false;
    if (f.departamento && c.departamento_recebimento !== f.departamento) return false;
    if (f.unidade && c.unidade !== f.unidade) return false;
    if (f.solicitante && c.solicitante !== f.solicitante) return false;
    if (f.etiqueta && !(c.etiquetas ?? []).includes(f.etiqueta)) return false;
    if (f.categoria && (c.categoria ?? "Sem categoria") !== f.categoria) return false;
    return true;
  });
}

export type KPIsChamados = ReturnType<typeof calcularKPIs>;

export function calcularKPIs(chamados: Chamado[]) {
  const total = chamados.length;
  const emAberto = chamados.filter((c) => SITUACOES_ABERTAS.includes(c.situacao)).length;
  const concluidos = chamados.filter((c) => ["Concluído", "Resolvido"].includes(c.situacao)).length;

  const media = (vals: number[]) => (vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null);

  const tmaMedio = media(chamados.map((c) => c.tma_horas).filter((v): v is number => v != null));
  const tmrMedio = media(chamados.map((c) => c.tmr_horas).filter((v): v is number => v != null));

  const comPrazo = chamados.filter((c) => c.no_prazo != null);
  const noPrazo = comPrazo.filter((c) => c.no_prazo === true).length;
  const percentualNoPrazo = comPrazo.length ? (noPrazo / comPrazo.length) * 100 : null;

  const notas = chamados.map((c) => c.satisfacao_nota).filter((v): v is number => v != null);
  const satisfacaoMedia = media(notas);

  const interacaoMedia = total
    ? chamados.reduce((s, c) => s + (c.qtd_interacao ?? 0), 0) / total
    : null;

  return {
    total,
    emAberto,
    concluidos,
    tmaMedio,
    tmrMedio,
    noPrazo,
    foraDoPrazo: comPrazo.length - noPrazo,
    percentualNoPrazo,
    percentualForaPrazo: percentualNoPrazo == null ? null : 100 - percentualNoPrazo,
    satisfacaoMedia,
    totalAvaliados: notas.length,
    percentualAvaliados: total ? (notas.length / total) * 100 : null,
    interacaoMedia,
  };
}

/** Agrupa os chamados por lote de importação. */
export function useLotesChamados(chamados: Chamado[]) {
  return useQuery({
    queryKey: ["chamados", "lotes", chamados.length],
    queryFn: async (): Promise<LoteChamados[]> => {
      const ids = Array.from(new Set(chamados.map((c) => c.importado_por).filter(Boolean))) as string[];
      let nomes = new Map<string, string>();
      if (ids.length) {
        const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
        nomes = new Map((data ?? []).map((p) => [p.id, p.full_name || p.email || p.id] as const));
      }
      const byLote = new Map<string, Chamado[]>();
      for (const c of chamados) {
        const arr = byLote.get(c.lote_id) ?? [];
        arr.push(c);
        byLote.set(c.lote_id, arr);
      }
      return Array.from(byLote.entries())
        .map(([lote_id, itens]) => {
          const datas = itens.map((i) => i.aberto_em).filter(Boolean).sort() as string[];
          const first = itens[0]!;
          return {
            lote_id,
            importado_em: itens.map((i) => i.importado_em).sort()[0] ?? first.importado_em,
            importado_por_nome: (first.importado_por && nomes.get(first.importado_por)) || "—",
            total_registros: itens.length,
            periodo_inicio: datas[0] ?? null,
            periodo_fim: datas[datas.length - 1] ?? null,
          };
        })
        .sort((a, b) => b.importado_em.localeCompare(a.importado_em));
    },
    enabled: chamados.length >= 0,
  });
}
