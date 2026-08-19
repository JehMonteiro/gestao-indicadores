import { rotuloMes } from "@/lib/chamados-utils";
import type { Chamado } from "@/types/chamados";

export const SITUACOES_FINALIZADAS = ["Concluído", "Resolvido"];
export const SITUACOES_EM_ABERTO = [
  "Novo",
  "Em Andamento",
  "Aguardando Responsável",
  "Aguardando Solicitante",
];

export interface ItemDupla {
  nome: string;
  nomeCompleto: string;
  total: number;
  destaque: number;
}

const finalizado = (c: Chamado) => SITUACOES_FINALIZADAS.includes(c.situacao);

export function media(vals: number[]): number {
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
}

export function mediana(vals: number[]): number {
  if (!vals.length) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const meio = Math.floor(s.length / 2);
  return s.length % 2 ? s[meio]! : (s[meio - 1]! + s[meio]!) / 2;
}

export function truncarRotulo(texto: string, max: number): string {
  return texto.length > max ? `${texto.slice(0, max)}…` : texto;
}

/** Evolução mensal empilhada por grupo de situação. */
export function evolucaoMensal(chamados: Chamado[]) {
  const porMes = new Map<
    string,
    { mes: string; ordem: string; finalizados: number; andamento: number; aguardando: number }
  >();
  for (const c of chamados) {
    if (!c.aberto_em) continue;
    const ordem = c.aberto_em.slice(0, 7);
    const item =
      porMes.get(ordem) ?? { mes: rotuloMes(c.aberto_em), ordem, finalizados: 0, andamento: 0, aguardando: 0 };
    if (finalizado(c)) item.finalizados += 1;
    else if (c.situacao === "Em Andamento") item.andamento += 1;
    else item.aguardando += 1;
    porMes.set(ordem, item);
  }
  return Array.from(porMes.values()).sort((a, b) => a.ordem.localeCompare(b.ordem));
}

export function porSituacao(chamados: Chamado[]) {
  const m = new Map<string, number>();
  for (const c of chamados) m.set(c.situacao, (m.get(c.situacao) ?? 0) + 1);
  return Array.from(m.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/** Um chamado conta em cada etiqueta que possui (soma pode exceder o total). */
export function porEtiqueta(chamados: Chamado[]) {
  const m = new Map<string, number>();
  for (const c of chamados) {
    const tags = c.etiquetas?.length ? c.etiquetas : ["Sem etiqueta"];
    for (const t of tags) m.set(t, (m.get(t) ?? 0) + 1);
  }
  return Array.from(m.entries())
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);
}

interface OpcoesDupla {
  chave: (c: Chamado) => string | null;
  destaque: (c: Chamado) => boolean;
  maxRotulo: number;
  normalizar?: boolean;
  ignorarVazios?: boolean;
  rotuloVazio?: string;
}

/** Top 10 por volume, com uma métrica de destaque (no prazo, concluídos...). */
export function topDupla(chamados: Chamado[], opts: OpcoesDupla): ItemDupla[] {
  const m = new Map<string, { nomeCompleto: string; total: number; destaque: number }>();
  for (const c of chamados) {
    const bruto = opts.chave(c);
    if (!bruto || !bruto.trim()) {
      if (opts.ignorarVazios) continue;
    }
    const nomeCompleto = (bruto ?? "").trim() || (opts.rotuloVazio ?? "Não informado");
    const k = opts.normalizar ? nomeCompleto.toUpperCase() : nomeCompleto;
    const it = m.get(k) ?? { nomeCompleto: opts.normalizar ? k : nomeCompleto, total: 0, destaque: 0 };
    it.total += 1;
    if (opts.destaque(c)) it.destaque += 1;
    m.set(k, it);
  }
  return Array.from(m.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((r) => ({
      nome: truncarRotulo(r.nomeCompleto, opts.maxRotulo),
      nomeCompleto: r.nomeCompleto,
      total: r.total,
      destaque: r.destaque,
    }));
}

export function topResponsaveis(chamados: Chamado[]) {
  return topDupla(chamados, {
    chave: (c) => c.responsavel,
    destaque: (c) => c.no_prazo === true,
    maxRotulo: 22,
    rotuloVazio: "Sem responsável",
  });
}

export function topSolicitantes(chamados: Chamado[]) {
  return topDupla(chamados, {
    chave: (c) => c.solicitante,
    destaque: finalizado,
    maxRotulo: 22,
    rotuloVazio: "Sem solicitante",
  });
}

export function topUnidades(chamados: Chamado[]) {
  return topDupla(chamados, {
    chave: (c) => c.unidade,
    destaque: finalizado,
    maxRotulo: 25,
    ignorarVazios: true,
  });
}

/** Departamentos com três séries: total, no prazo e em aberto. */
export function topDepartamentos(chamados: Chamado[]) {
  const m = new Map<string, { nomeCompleto: string; total: number; noPrazo: number; emAberto: number }>();
  for (const c of chamados) {
    const nome = (c.departamento_recebimento ?? "").trim() || "Não informado";
    const k = nome.toUpperCase();
    const it = m.get(k) ?? { nomeCompleto: k, total: 0, noPrazo: 0, emAberto: 0 };
    it.total += 1;
    if (c.no_prazo === true) it.noPrazo += 1;
    if (SITUACOES_EM_ABERTO.includes(c.situacao)) it.emAberto += 1;
    m.set(k, it);
  }
  return {
    distintos: m.size,
    itens: Array.from(m.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map((d) => ({ ...d, nome: truncarRotulo(d.nomeCompleto, 28) })),
  };
}

export type DimensaoInteracoes = "responsavel" | "departamento" | "categoria";

export function mediaInteracoes(chamados: Chamado[], dim: DimensaoInteracoes) {
  const chave = (c: Chamado) => {
    if (dim === "responsavel") return (c.responsavel ?? "").trim() || "Sem responsável";
    if (dim === "departamento") return ((c.departamento_recebimento ?? "").trim() || "Não informado").toUpperCase();
    return (c.categoria ?? "").trim() || "Sem categoria";
  };
  const m = new Map<string, { nomeCompleto: string; soma: number; qtd: number }>();
  for (const c of chamados) {
    const k = chave(c);
    const it = m.get(k) ?? { nomeCompleto: k, soma: 0, qtd: 0 };
    it.soma += c.qtd_interacao ?? 0;
    it.qtd += 1;
    m.set(k, it);
  }
  const itens = Array.from(m.values())
    .map((r) => ({
      nome: truncarRotulo(r.nomeCompleto, 22),
      nomeCompleto: r.nomeCompleto,
      mediaInteracoes: Number((r.soma / r.qtd).toFixed(1)),
      totalChamados: r.qtd,
      interacoesTotais: r.soma,
    }))
    .sort((a, b) => b.mediaInteracoes - a.mediaInteracoes)
    .slice(0, 10);
  const geral = Number(media(chamados.map((c) => c.qtd_interacao ?? 0)).toFixed(1));
  return { itens, geral };
}

export function porCategoria(chamados: Chamado[]) {
  const m = new Map<string, number>();
  for (const c of chamados) {
    const k = (c.categoria ?? "").trim() || "Sem categoria";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  const total = chamados.length || 1;
  return {
    distintas: m.size,
    itens: Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nomeCompleto, qtd]) => ({
        nome: truncarRotulo(nomeCompleto, 20),
        nomeCompleto,
        total: qtd,
        percentual: Math.round((qtd / total) * 100),
      })),
  };
}

export function distribuicaoSatisfacao(chamados: Chamado[]) {
  const notas = chamados.map((c) => c.satisfacao_nota).filter((v): v is number => v != null);
  return {
    itens: [1, 2, 3, 4, 5].map((n) => ({
      nota: String(n),
      total: notas.filter((v) => Math.round(v) === n).length,
    })),
    avaliados: notas.length,
    media: Number(media(notas).toFixed(1)),
  };
}

export function tmaPorResponsavel(chamados: Chamado[]) {
  const m = new Map<string, { nomeCompleto: string; soma: number; qtd: number }>();
  for (const c of chamados) {
    if (c.tma_horas == null) continue;
    const k = (c.responsavel ?? "").trim() || "Sem responsável";
    const it = m.get(k) ?? { nomeCompleto: k, soma: 0, qtd: 0 };
    it.soma += c.tma_horas;
    it.qtd += 1;
    m.set(k, it);
  }
  const itens = Array.from(m.values())
    .map((r) => ({
      nome: truncarRotulo(r.nomeCompleto, 20),
      nomeCompleto: r.nomeCompleto,
      tma: Number((r.soma / r.qtd).toFixed(1)),
      chamados: r.qtd,
    }))
    .sort((a, b) => b.tma - a.tma)
    .slice(0, 10);
  const geral = Number(media(chamados.map((c) => c.tma_horas).filter((v): v is number => v != null)).toFixed(1));
  return { itens, geral };
}

const FAIXAS: { rotulo: string; min: number; max: number }[] = [
  { rotulo: "1–3", min: 1, max: 3 },
  { rotulo: "4–6", min: 4, max: 6 },
  { rotulo: "7–10", min: 7, max: 10 },
  { rotulo: "11–15", min: 11, max: 15 },
  { rotulo: "16–20", min: 16, max: 20 },
  { rotulo: "21–30", min: 21, max: 30 },
  { rotulo: "31+", min: 31, max: Number.POSITIVE_INFINITY },
];

export function histogramaInteracoes(chamados: Chamado[]) {
  const vals = chamados.map((c) => c.qtd_interacao ?? 0);
  const total = vals.length || 1;
  const itens = FAIXAS.map((f) => {
    const dentro = vals.filter((v) => v >= f.min && v <= f.max);
    return {
      faixa: f.rotulo,
      total: dentro.length,
      percentual: Math.round((dentro.length / total) * 100),
      mediaFaixa: Number(media(dentro).toFixed(1)),
    };
  });
  return { itens, mediana: mediana(vals), maximo: vals.length ? Math.max(...vals) : 0 };
}
