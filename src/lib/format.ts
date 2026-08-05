import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Direction, Indicator, IndicatorEntry, IndicatorTarget, SystemSettings, ValueType } from "@/mocks/types";

export function formatDate(iso?: string, pattern = "dd/MM/yyyy"): string {
  if (!iso) return "—";
  try { return format(parseISO(iso), pattern, { locale: ptBR }); } catch { return iso; }
}

export function formatMonth(iso?: string): string {
  if (!iso) return "—";
  try { return format(parseISO(iso), "MMM/yy", { locale: ptBR }); } catch { return iso; }
}

export function formatBRL(v?: number | null): string {
  if (v == null || Number.isNaN(v)) return "—";
  return Math.round(v).toLocaleString("pt-BR", {
    style: "currency", currency: "BRL", maximumFractionDigits: 0, minimumFractionDigits: 0,
  });
}

/** Todos os números do sistema são exibidos como inteiros, sem vírgula. */
export function formatNumber(v?: number | null, _digits = 0): string {
  if (v == null || Number.isNaN(v)) return "—";
  return Math.round(v).toLocaleString("pt-BR", { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

export function formatValue(v: number | undefined, type: ValueType, unit?: string): string {
  if (v == null || Number.isNaN(v)) return "—";
  switch (type) {
    case "moeda": return formatBRL(v);
    case "percentual": return `${formatNumber(v)}%`;
    case "decimal":
    case "inteiro":
    case "quantidade": return formatNumber(v);
    case "tempo": return `${formatNumber(v)} ${unit ?? "min"}`;
    case "nota": return `${formatNumber(v)} ${unit ?? ""}`.trim();
    case "boolean": return v ? "Sim" : "Não";
    default: return String(v);
  }
}


export type Classification = "atingido" | "atencao" | "critico" | "sem_info";

export function classify(percent: number | null, settings: SystemSettings): Classification {
  if (percent == null) return "sem_info";
  if (percent >= settings.achieved_threshold) return "atingido";
  if (percent >= settings.warning_threshold) return "atencao";
  return "critico";
}

/**
 * Returns achievement percentage (0..∞) or null when not computable.
 * Handles direction rules and divisions by zero safely.
 */
export function computeAchievement(
  entry: Pick<IndicatorEntry, "actual_value"> | null | undefined,
  target: Pick<IndicatorTarget, "target_value" | "minimum_value" | "maximum_value"> | null | undefined,
  direction: Direction,
): number | null {
  if (!entry || entry.actual_value == null || !target) return null;
  const r = (n: number | null) => (n == null ? null : Math.round(n));
  const actual = entry.actual_value;
  const t = target.target_value;
  switch (direction) {
    case "maior_melhor":
      if (!t) return actual > 0 ? 100 : null;
      return r((actual / t) * 100);
    case "menor_melhor":
      if (actual <= 0) return 100;
      return r((t / actual) * 100);
    case "meta_exata":
      if (t === 0) return actual === 0 ? 100 : 0;
      return r(Math.max(0, 100 - (Math.abs(actual - t) / Math.abs(t)) * 100));
    case "faixa_ideal": {
      const min = target.minimum_value ?? -Infinity;
      const max = target.maximum_value ?? Infinity;
      if (actual >= min && actual <= max) return 100;
      const dist = actual < min ? min - actual : actual - max;
      const ref = Math.abs(t || (max === Infinity ? min : max)) || 1;
      return r(Math.max(0, 100 - (dist / ref) * 100));
    }
  }
}

export function weightedIndex(
  items: { percent: number | null; weight: number }[],
): number | null {
  const valid = items.filter((i) => i.percent != null);
  if (!valid.length) return null;
  const totalW = valid.reduce((s, i) => s + i.weight, 0) || 1;
  const sum = valid.reduce((s, i) => s + (i.percent as number) * i.weight, 0);
  return Math.round(sum / totalW);
}

export function classificationStyles(c: Classification) {
  switch (c) {
    case "atingido": return { label: "Atingido", className: "bg-success/15 text-success border-success/30" };
    case "atencao": return { label: "Em atenção", className: "bg-warning/15 text-warning-foreground border-warning/40" };
    case "critico": return { label: "Crítico", className: "bg-destructive/15 text-destructive border-destructive/30" };
    case "sem_info": return { label: "Sem informação", className: "bg-muted text-muted-foreground border-border" };
  }
}

export function indicatorPeriodLabel(ind: Indicator): string {
  const map: Record<Indicator["frequency"], string> = {
    diaria: "Diária", semanal: "Semanal", quinzenal: "Quinzenal", mensal: "Mensal",
    trimestral: "Trimestral", semestral: "Semestral", anual: "Anual",
  };
  return map[ind.frequency];
}
