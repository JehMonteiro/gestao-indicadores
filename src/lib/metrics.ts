import type { Indicator, IndicatorEntry, IndicatorTarget, ValueType, Direction } from "@/mocks/types";

/**
 * Effective target used by `computeAchievement`. Compatible with the
 * `Pick<IndicatorTarget, ...>` shape it already accepts, so it drops in
 * anywhere a real `IndicatorTarget` was passed before.
 */
export type EffectiveTarget = {
  target_value: number;
  minimum_value?: number;
  maximum_value?: number;
};

const SUM_LIKE_VALUE_TYPES: ReadonlySet<ValueType> = new Set<ValueType>([
  "inteiro",
  "decimal",
  "moeda",
  "quantidade",
  "tempo",
]);

const AVERAGE_LIKE_DIRECTIONS: ReadonlySet<Direction> = new Set<Direction>([
  "meta_exata",
  "faixa_ideal",
]);

function daysBetween(startISO?: string, endISO?: string): number | null {
  if (!startISO || !endISO) return null;
  const start = Date.parse(startISO);
  const end = Date.parse(endISO);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / 86_400_000) + 1;
}

function shouldProrate(indicator: Indicator): boolean {
  if (AVERAGE_LIKE_DIRECTIONS.has(indicator.direction)) return false;
  return SUM_LIKE_VALUE_TYPES.has(indicator.value_type);
}

function prorate(
  target: IndicatorTarget,
  entry: Pick<IndicatorEntry, "period_start" | "period_end">,
  indicator: Indicator,
): EffectiveTarget {
  const targetDays = daysBetween(target.period_start, target.period_end);
  const entryDays = daysBetween(entry.period_start, entry.period_end);
  const base: EffectiveTarget = {
    target_value: target.target_value,
    minimum_value: target.minimum_value,
    maximum_value: target.maximum_value,
  };
  if (!shouldProrate(indicator)) return base;
  if (!targetDays || !entryDays) return base;
  if (targetDays <= entryDays) return base;
  const factor = entryDays / targetDays;
  return {
    target_value: target.target_value * factor,
    minimum_value: target.minimum_value != null ? target.minimum_value * factor : undefined,
    maximum_value: target.maximum_value != null ? target.maximum_value * factor : undefined,
  };
}



function valueForSort(...values: Array<string | undefined>): string {
  return values.find(Boolean) ?? "";
}

function compareEntryAsc(a: IndicatorEntry, b: IndicatorEntry) {
  return valueForSort(a.period_end, a.period_start, a.updated_at, a.created_at).localeCompare(
    valueForSort(b.period_end, b.period_start, b.updated_at, b.created_at),
  );
}

function compareTargetAsc(a: IndicatorTarget, b: IndicatorTarget) {
  return valueForSort(a.period_end, a.period_start, a.created_at).localeCompare(
    valueForSort(b.period_end, b.period_start, b.created_at),
  );
}

export function entriesByPeriodAsc(entries: IndicatorEntry[]) {
  return [...entries].sort(compareEntryAsc);
}

export function latestEntry(entries: IndicatorEntry[]) {
  return entriesByPeriodAsc(entries)[entries.length - 1];
}

export function latestTarget(targets: IndicatorTarget[]) {
  return [...targets].sort(compareTargetAsc)[targets.length - 1];
}

type EntryScope = Pick<
  IndicatorEntry,
  "indicator_id" | "franchise_id" | "sector_id" | "user_id" | "period_start" | "period_end"
> & { target_id?: string };

/**
 * Company compatibility: a target for another company is never usable.
 * A corporate target (no franchise) is usable by any entry as fallback.
 */
function companyCompatible(entry: EntryScope, target: IndicatorTarget) {
  if (!target.franchise_id) return true;
  return target.franchise_id === entry.franchise_id;
}

function sectorCompatible(entry: EntryScope, target: IndicatorTarget) {
  if (!target.sector_id) return true;
  return !entry.sector_id || target.sector_id === entry.sector_id;
}

function userCompatible(entry: EntryScope, target: IndicatorTarget) {
  if (!target.user_id) return true;
  return !entry.user_id || target.user_id === entry.user_id;
}

/** Target period must CONTAIN the entry period (monthly entry inside a yearly goal). */
function periodContains(entry: EntryScope, target: IndicatorTarget) {
  if (!target.period_start || !target.period_end) return false;
  return target.period_start <= entry.period_start && target.period_end >= entry.period_end;
}

function specificity(entry: EntryScope, target: IndicatorTarget) {
  let score = 0;
  if (target.franchise_id && target.franchise_id === entry.franchise_id) score += 8;
  if (target.user_id && target.user_id === entry.user_id) score += 4;
  if (target.sector_id && target.sector_id === entry.sector_id) score += 2;
  if (target.period_start === entry.period_start && target.period_end === entry.period_end) score += 1;
  return score;
}

function periodLength(target: IndicatorTarget) {
  return daysBetween(target.period_start, target.period_end) ?? Number.MAX_SAFE_INTEGER;
}

/**
 * Single source of truth for "which target row applies to this entry".
 * Used both when saving a lançamento (to persist `target_id`) and when
 * computing achievement anywhere in the app.
 */
export function resolveTargetRowForEntry(
  entry: EntryScope,
  targets: IndicatorTarget[],
): IndicatorTarget | undefined {
  const explicit = entry.target_id ? targets.find((t) => t.id === entry.target_id) : undefined;
  if (explicit) return explicit;

  const candidates = targets.filter(
    (t) =>
      t.indicator_id === entry.indicator_id &&
      companyCompatible(entry, t) &&
      sectorCompatible(entry, t) &&
      userCompatible(entry, t) &&
      periodContains(entry, t),
  );
  if (!candidates.length) return undefined;

  return [...candidates].sort((a, b) => {
    const bySpec = specificity(entry, b) - specificity(entry, a);
    if (bySpec !== 0) return bySpec;
    // narrower period wins (closer to the entry period)
    const byLen = periodLength(a) - periodLength(b);
    if (byLen !== 0) return byLen;
    return compareTargetAsc(b, a);
  })[0];
}

export function findTargetForEntry(entry: IndicatorEntry, targets: IndicatorTarget[]) {
  return resolveTargetRowForEntry(entry, targets);
}

export function latestTargetForIndicator(indicator: Indicator, targets: IndicatorTarget[]) {
  const sameIndicator = targets.filter((t) => t.indicator_id === indicator.id);
  if (!sameIndicator.length) return undefined;
  if (indicator.franchise_id) {
    return (
      latestTarget(sameIndicator.filter((t) => t.franchise_id === indicator.franchise_id)) ??
      latestTarget(sameIndicator.filter((t) => !t.franchise_id))
    );
  }
  if (indicator.scope === "franquia") {
    const companies = new Set(sameIndicator.map((t) => t.franchise_id ?? "").filter(Boolean));
    // Only safe when every target belongs to the same company (or none does).
    if (companies.size > 1) return undefined;
    return latestTarget(sameIndicator);
  }
  return latestTarget(sameIndicator.filter((t) => !t.franchise_id)) ?? latestTarget(sameIndicator);
}

function entryRevisionKey(e: IndicatorEntry) {
  return [e.indicator_id, e.franchise_id ?? "", e.sector_id ?? "", e.period_start, e.period_end].join("|");
}

function isNewerRevision(candidate: IndicatorEntry, current: IndicatorEntry) {
  const a = candidate.revision_number ?? 1;
  const b = current.revision_number ?? 1;
  if (a !== b) return a > b;
  return (
    valueForSort(candidate.updated_at, candidate.created_at).localeCompare(
      valueForSort(current.updated_at, current.created_at),
    ) > 0
  );
}

/**
 * Keeps only the latest revision per (indicator, company, sector, period), so
 * re-launching the same period replaces the previous value instead of being
 * counted twice.
 */
export function latestEntriesByPeriod(entries: IndicatorEntry[]): IndicatorEntry[] {
  const map = new Map<string, IndicatorEntry>();
  for (const e of entries) {
    const key = entryRevisionKey(e);
    const current = map.get(key);
    if (!current || isNewerRevision(e, current)) map.set(key, e);
  }
  return entriesByPeriodAsc(Array.from(map.values()));
}

export function registeredEntriesForIndicator(indicator: Indicator, entries: IndicatorEntry[]) {
  return latestEntriesByPeriod(
    entries.filter(
      (e) =>
        e.indicator_id === indicator.id &&
        e.status === "registrado" &&
        (!indicator.franchise_id || e.franchise_id === indicator.franchise_id),
    ),
  );
}


function defaultTargetFallback(indicator: Indicator): EffectiveTarget | null {
  if (indicator.default_target == null || indicator.default_target <= 0) return null;
  return {
    target_value: indicator.default_target,
    minimum_value: indicator.minimum_value,
    maximum_value: indicator.maximum_value,
  };
}

/**
 * Effective target for an approved entry, resolving in order:
 *  1. explicit target row (via `target_id`, then period+company, then company),
 *     prorated when the target period is longer than the entry period.
 *  2. `indicator.default_target` when no target row applies.
 * Returns `null` when neither is available.
 */
export function resolveTargetForEntry(
  indicator: Indicator,
  entry: IndicatorEntry,
  targets: IndicatorTarget[],
): EffectiveTarget | null {
  const explicit = findTargetForEntry(entry, targets);
  if (explicit) return prorate(explicit, entry, indicator);
  return defaultTargetFallback(indicator);
}

/**
 * Effective target for an indicator without an associated entry (used when
 * displaying a row that has no approved lançamento yet). Falls back to
 * `default_target` when no meaningful target row exists.
 */
export function resolveTargetForIndicator(
  indicator: Indicator,
  targets: IndicatorTarget[],
): EffectiveTarget | null {
  const latest = latestTargetForIndicator(indicator, targets);
  if (latest) {
    return {
      target_value: latest.target_value,
      minimum_value: latest.minimum_value,
      maximum_value: latest.maximum_value,
    };
  }
  return defaultTargetFallback(indicator);
}
