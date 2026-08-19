import type { KpiGroup } from "@/mocks/types";

const MOVIMENTO_TERMS = [
  "prospec", "reuni", "proposta", "cotac", "atendimento",
  "lead", "agendamento", "contato", "visita",
];

const QUALIDADE_TERMS = [
  "sla", "tempo", "retrabalho", "satisfac", "nps", "cancelamento",
  "conversao", "retencao", "inadimplencia", "pendencia", "chamado",
];

export function normalizeText(v: string): string {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Heurística de nome/código — espelha o backfill aplicado no banco. */
export function inferKpiGroup(name?: string | null, code?: string | null): KpiGroup | null {
  const hay = normalizeText(`${name ?? ""} ${code ?? ""}`);
  if (!hay.trim()) return null;
  if (MOVIMENTO_TERMS.some((t) => hay.includes(t))) return "movimento";
  if (QUALIDADE_TERMS.some((t) => hay.includes(t))) return "qualidade";
  return "resultado";
}

/** Converte um valor livre (import/planilha) em KpiGroup, ignorando caixa e acentuação. */
export function parseKpiGroup(v: unknown): KpiGroup | null {
  if (v == null) return null;
  const n = normalizeText(String(v));
  if (n === "movimento") return "movimento";
  if (n === "resultado") return "resultado";
  if (n === "qualidade") return "qualidade";
  return null;
}

export function readGroupBalance(
  movimento: number | null,
  resultado: number | null,
  qualidade: number | null,
): string {
  const m = movimento ?? 0;
  const r = resultado ?? 0;
  const q = qualidade ?? 0;
  if (m >= 100 && r < 80) {
    return "Alto volume de atividade com baixa conversão em resultado. Avaliar qualidade da abordagem comercial.";
  }
  if (m < 80 && r >= 100) {
    return "Resultado sustentado com pouco movimento. Verificar se a base de oportunidades é suficiente para os próximos ciclos.";
  }
  if (q < 80 && r >= 100) {
    return "Resultado alcançado com queda na qualidade. Risco de cancelamento e retrabalho à frente.";
  }
  if (m >= 100 && r >= 100 && q >= 100) {
    return "Operação equilibrada nas três dimensões.";
  }
  if (m < 80 && r < 80 && q < 80) {
    return "Os três grupos estão abaixo do esperado. Priorizar plano de ação.";
  }
  return "Desempenho dentro do esperado, com espaço para evolução.";
}
