// Generate a real UUID so that Supabase upserts on uuid PK columns succeed.
// Falls back to a v4-shaped string for very old browsers (should not happen
// in our supported set, but keeps the function total).
export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback (RFC4122-ish v4) — only used if crypto.randomUUID is missing.
  const rnd = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${rnd(8)}-${rnd(4)}-4${rnd(3)}-${((Math.random() * 4) | 8).toString(16)}${rnd(3)}-${rnd(12)}`;
}
