/** Gera um código de indicador a partir do nome, sem sufixo de empresa/franquia. */
export function makeIndicatorCode(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 24) || `IND_${Date.now().toString(36).toUpperCase()}`
  );
}

/** Garante unicidade do código dentro da lista informada. */
export function makeUniqueIndicatorCode(name: string, existing: string[]): string {
  const base = makeIndicatorCode(name);
  const taken = new Set(existing.map((c) => (c ?? "").toUpperCase()));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}
