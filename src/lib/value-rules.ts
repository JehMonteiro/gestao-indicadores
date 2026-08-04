import type { ValueType } from "@/mocks/types";

/**
 * Regra central: quais tipos de valor exigem números inteiros nos
 * valores cadastrados (meta padrão, mínimo, máximo, meta e realizado).
 * Percentual, decimal e tempo continuam aceitando casas decimais.
 */
const INTEGER_VALUE_TYPES: ReadonlySet<ValueType> = new Set<ValueType>([
  "inteiro",
  "quantidade",
  "moeda",
  "nota",
]);

export function requiresInteger(type?: ValueType | null): boolean {
  if (!type) return false;
  return INTEGER_VALUE_TYPES.has(type);
}

/** Passo do input numérico conforme o tipo de valor. */
export function numericStep(type?: ValueType | null): string {
  return requiresInteger(type) ? "1" : "0.01";
}

/**
 * Retorna mensagem de erro quando o valor não respeita a regra do tipo.
 * `null` quando o valor é válido (ou vazio).
 */
export function validateNumericValue(
  value: number | string | null | undefined,
  type: ValueType | null | undefined,
  fieldLabel: string,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (Number.isNaN(n)) return `${fieldLabel}: informe um valor numérico.`;
  if (requiresInteger(type) && !Number.isInteger(n)) {
    return `${fieldLabel} deve ser um número inteiro, sem casas decimais.`;
  }
  return null;
}

/** Bloqueia a digitação de vírgula/ponto decimal em campos inteiros. */
export function blockDecimalKeys(type?: ValueType | null) {
  return (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!requiresInteger(type)) return;
    if (e.key === "." || e.key === "," || e.key === "e" || e.key === "E") {
      e.preventDefault();
    }
  };
}

/** Valida uma lista de campos, retornando a primeira mensagem de erro. */
export function firstIntegerError(
  type: ValueType | null | undefined,
  fields: Array<{ label: string; value: number | string | null | undefined }>,
): string | null {
  for (const f of fields) {
    const err = validateNumericValue(f.value, type, f.label);
    if (err) return err;
  }
  return null;
}
