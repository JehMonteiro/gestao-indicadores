import type { Franchise } from "@/mocks/types";

export type EntityKind = "empresa" | "franquia";

/** Classificação real, baseada exclusivamente em `franchises.entity_type`. */
export function entityKind(e: Franchise): EntityKind | null {
  if (e.entity_type === "franquia") return "franquia";
  if (e.entity_type === "empresa" || e.entity_type === "grupo") return "empresa";
  return null;
}

export function isFranquia(e: Franchise) { return entityKind(e) === "franquia"; }
export function isEmpresa(e: Franchise) { return entityKind(e) === "empresa"; }
export function isGrupo(e: Franchise) { return e.entity_type === "grupo"; }
export function isUnclassified(e: Franchise) { return entityKind(e) === null; }

/** Tempo de operação legível a partir da data de início ("2 anos e 3 meses"). */
export function operatingTime(startDate?: string): string {
  if (!startDate) return "—";
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return "—";
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return "—";
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} ${y === 1 ? "ano" : "anos"}`);
  if (m > 0) parts.push(`${m} ${m === 1 ? "mês" : "meses"}`);
  return parts.length ? parts.join(" e ") : "menos de 1 mês";
}
