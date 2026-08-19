import type { Franchise } from "@/mocks/types";

export type EntityKind = "empresa" | "franquia";

/**
 * TEMPORÁRIO — heurística até a criação do campo `entities.entity_type`.
 * Quando o campo existir, substituir o corpo desta função por:
 *   return e.entity_type;
 * Nenhum outro arquivo deve conter lógica de classificação.
 */
export function entityKind(e: Franchise): EntityKind {
  const nome = (e.name ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const codigo = (e.code ?? "").trim();

  // Empresas conhecidas do Grupo Nocta
  const EMPRESAS = ["nocta seguros e beneficios", "nocta franquia", "fabio gomes"];
  if (EMPRESAS.some((x) => nome === x || nome.includes(x))) return "empresa";

  // Franquias: nome inicia com "franquia" ou código puramente numérico
  if (nome.startsWith("franquia")) return "franquia";
  if (/^\d+$/.test(codigo)) return "franquia";

  return "empresa";
}

export function isFranquia(e: Franchise) { return entityKind(e) === "franquia"; }
export function isEmpresa(e: Franchise) { return entityKind(e) === "empresa"; }

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
