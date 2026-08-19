import type { Frequency } from "@/mocks/types";

const DAY = 86_400_000;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}

/** Período vigente (início/fim) de um indicador conforme a frequência, na data de referência. */
export function currentPeriod(frequency: Frequency, ref: Date = new Date()): { start: string; end: string } {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const d = ref.getUTCDate();
  switch (frequency) {
    case "diaria":
      return { start: iso(utc(y, m, d)), end: iso(utc(y, m, d)) };
    case "semanal": {
      const day = utc(y, m, d);
      const dow = day.getUTCDay(); // 0 dom
      const start = new Date(day.getTime() - ((dow + 6) % 7) * DAY);
      const end = new Date(start.getTime() + 6 * DAY);
      return { start: iso(start), end: iso(end) };
    }
    case "quinzenal": {
      if (d <= 15) return { start: iso(utc(y, m, 1)), end: iso(utc(y, m, 15)) };
      return { start: iso(utc(y, m, 16)), end: iso(utc(y, m + 1, 0)) };
    }
    case "mensal":
      return { start: iso(utc(y, m, 1)), end: iso(utc(y, m + 1, 0)) };
    case "trimestral": {
      const q = Math.floor(m / 3) * 3;
      return { start: iso(utc(y, q, 1)), end: iso(utc(y, q + 3, 0)) };
    }
    case "semestral": {
      const s = m < 6 ? 0 : 6;
      return { start: iso(utc(y, s, 1)), end: iso(utc(y, s + 6, 0)) };
    }
    case "anual":
      return { start: iso(utc(y, 0, 1)), end: iso(utc(y, 11, 31)) };
  }
}

/** Quantos lançamentos são esperados no mês corrente para a frequência informada. */
export function expectedEntriesInMonth(frequency: Frequency, ref: Date = new Date()): number {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const daysInMonth = utc(y, m + 1, 0).getUTCDate();
  switch (frequency) {
    case "diaria": return daysInMonth;
    case "semanal": return 4;
    case "quinzenal": return 2;
    case "mensal": return 1;
    case "trimestral": return m % 3 === 0 ? 1 : 0;
    case "semestral": return m % 6 === 0 ? 1 : 0;
    case "anual": return m === 0 ? 1 : 0;
  }
}

export function daysUntil(isoDate: string, ref: Date = new Date()): number {
  const end = Date.parse(`${isoDate}T00:00:00Z`);
  const today = Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate());
  return Math.round((end - today) / DAY);
}

/** Lista os N últimos meses (mais antigo primeiro) como {start,end,label}. */
export function lastMonths(count: number, ref: Date = new Date()): { start: string; end: string; label: string }[] {
  const out: { start: string; end: string; label: string }[] = [];
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const fmt = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });
  for (let i = count - 1; i >= 0; i--) {
    const start = utc(y, m - i, 1);
    const end = utc(y, m - i + 1, 0);
    const label = fmt.format(start).replace(".", "");
    out.push({ start: iso(start), end: iso(end), label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return out;
}
