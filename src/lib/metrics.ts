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

function matchesEntryCompany(entry: IndicatorEntry, target: IndicatorTarget) {
  return entry.franchise_id ? target.franchise_id === entry.franchise_id : !target.franchise_id;
}

function matchesEntryPeriod(entry: IndicatorEntry, target: IndicatorTarget) {
  return target.period_start === entry.period_start && target.period_end === entry.period_end;
}

export function findTargetForEntry(entry: IndicatorEntry, targets: IndicatorTarget[]) {
  const exact = entry.target_id ? targets.find((t) => t.id === entry.target_id) : undefined;
  if (exact) return exact;

  const sameIndicator = targets.filter((t) => t.indicator_id === entry.indicator_id);
  const sameCompany = sameIndicator.filter((t) => matchesEntryCompany(entry, t));

  if (entry.franchise_id) {
    // Never fall back to another franchise's target.
    const samePeriodSameCompany = sameCompany.filter((t) => matchesEntryPeriod(entry, t));
    return latestTarget(samePeriodSameCompany) ?? latestTarget(sameCompany);
  }

  const samePeriod = sameIndicator.filter((t) => matchesEntryPeriod(entry, t));
  return (
    latestTarget(samePeriod.filter((t) => matchesEntryCompany(entry, t))) ??
    latestTarget(samePeriod) ??
    latestTarget(sameCompany) ??
    latestTarget(sameIndicator)
  );
}

export function latestTargetForIndicator(indicator: Indicator, targets: IndicatorTarget[]) {
  const sameIndicator = targets.filter((t) => t.indicator_id === indicator.id);
  if (indicator.franchise_id) {
    return latestTarget(sameIndicator.filter((t) => t.franchise_id === indicator.franchise_id));
  }
  if (indicator.scope === "franquia") {
    // Multi-franchise indicator without a specific franchise fixed on it:
    // there is no single canonical target — avoid returning one from an
    // arbitrary franchise.
    return undefined;
  }
  return latestTarget(sameIndicator.filter((t) => !t.franchise_id)) ?? latestTarget(sameIndicator);
}


export function registeredEntriesForIndicator(indicator: Indicator, entries: IndicatorEntry[]) {
  return entriesByPeriodAsc(
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
