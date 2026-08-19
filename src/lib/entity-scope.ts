import type { EntityScope, Indicator } from "@/mocks/types";

export const ENTITY_SCOPES: { value: EntityScope; label: string }[] = [
  { value: "empresa", label: "Empresa" },
  { value: "franquia", label: "Franquia" },
];

export function scopeLabel(scope?: EntityScope | null) {
  if (scope === "empresa") return "Empresa";
  if (scope === "franquia") return "Franquia";
  return "Sem escopo";
}

/** Indicadores do escopo informado. Nunca inclui os não classificados. */
export function filterByScope<T extends { entity_scope?: EntityScope | null }>(
  list: T[],
  scope: EntityScope,
): T[] {
  return list.filter((i) => i.entity_scope === scope);
}

export function unclassified<T extends { entity_scope?: EntityScope | null }>(list: T[]): T[] {
  return list.filter((i) => !i.entity_scope);
}

/** Sufixo do código do indicador (ex.: "_COR"), quando existir. */
export function codeSuffix(code: string): string | null {
  const idx = code.lastIndexOf("_");
  if (idx <= 0) return null;
  return code.slice(idx).toUpperCase();
}

/** Sufixos sem empresa correspondente cadastrada. */
export const UNMAPPED_SUFFIXES = ["_CED", "_CEO"];

export function hasUnmappedSuffix(indicator: Pick<Indicator, "code">) {
  const code = (indicator.code ?? "").toUpperCase();
  return UNMAPPED_SUFFIXES.some((s) => code.endsWith(s));
}
