import type { Indicator, IndicatorEntry, IndicatorTarget } from "@/mocks/types";

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
  const samePeriod = sameIndicator.filter((t) => matchesEntryPeriod(entry, t));

  return (
    latestTarget(samePeriod.filter((t) => matchesEntryCompany(entry, t))) ??
    latestTarget(samePeriod) ??
    latestTarget(sameIndicator.filter((t) => matchesEntryCompany(entry, t))) ??
    latestTarget(sameIndicator)
  );
}

export function latestTargetForIndicator(indicator: Indicator, targets: IndicatorTarget[]) {
  const sameIndicator = targets.filter((t) => t.indicator_id === indicator.id);
  if (indicator.franchise_id) {
    return latestTarget(sameIndicator.filter((t) => t.franchise_id === indicator.franchise_id)) ?? latestTarget(sameIndicator);
  }
  return latestTarget(sameIndicator.filter((t) => !t.franchise_id)) ?? latestTarget(sameIndicator);
}

export function approvedEntriesForIndicator(indicator: Indicator, entries: IndicatorEntry[]) {
  return entriesByPeriodAsc(
    entries.filter(
      (e) =>
        e.indicator_id === indicator.id &&
        e.status === "aprovado" &&
        (!indicator.franchise_id || e.franchise_id === indicator.franchise_id),
    ),
  );
}