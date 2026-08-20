import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-auth";
import type { Indicator, IndicatorEntry, IndicatorTarget, Sector } from "@/mocks/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

function toIndicator(row: any): Indicator {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description ?? undefined,
    objective: row.objective ?? undefined,
    owner_sector_id: row.owner_sector_id ?? "",
    shared_sector_ids: [],
    franchise_id: row.franchise_id ?? undefined,
    strategic_pillar: row.strategic_pillar ?? undefined,
    kpi_group: (row.kpi_group ?? "resultado") as Indicator["kpi_group"],
    scope: row.scope,
    responsible_ids: row.responsible_user_id ? [row.responsible_user_id] : [],
    value_type: row.value_type,
    frequency: row.periodicity,
    direction: row.direction,
    default_target: row.default_target != null ? Number(row.default_target) : undefined,
    minimum_value: row.minimum_value != null ? Number(row.minimum_value) : undefined,
    maximum_value: row.maximum_value != null ? Number(row.maximum_value) : undefined,
    warning_threshold: row.warning_threshold != null ? Number(row.warning_threshold) : undefined,
    critical_threshold: row.critical_threshold != null ? Number(row.critical_threshold) : undefined,
    weight: 1,
    start_date: row.start_date ?? row.created_at,
    end_date: row.end_date ?? undefined,
    status: row.status,
    created_by: row.created_by ?? "",
    created_at: row.created_at,
  };
}

function toTarget(row: any): IndicatorTarget {
  return {
    id: row.id,
    indicator_id: row.indicator_id,
    scope_type: row.franchise_id ? "franquia" : "corporativo",
    franchise_id: row.franchise_id ?? undefined,
    sector_id: row.sector_id ?? undefined,
    user_id: row.user_id ?? undefined,
    period_start: row.period_start,
    period_end: row.period_end,
    target_value: Number(row.target_value),
    minimum_value: row.min_value != null ? Number(row.min_value) : undefined,
    maximum_value: row.max_value != null ? Number(row.max_value) : undefined,
    weight: 1,
    created_by: row.created_by ?? "",
    created_at: row.created_at,
  };
}

function toEntry(row: any): IndicatorEntry {
  return {
    id: row.id,
    indicator_id: row.indicator_id,
    target_id: row.target_id ?? undefined,
    user_id: row.user_id,
    sector_id: row.sector_id ?? undefined,
    franchise_id: row.franchise_id ?? undefined,
    period_start: row.period_start,
    period_end: row.period_end,
    actual_value: row.actual_value != null ? Number(row.actual_value) : undefined,
    comment: row.comment ?? undefined,
    justification: row.justification ?? undefined,
    status: row.status,
    submitted_at: row.submitted_at ?? undefined,
    revision_number: row.revision_number ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export type MyDashboardData = {
  indicators: Indicator[];
  /** indicators + indicadores referenciados apenas pelos lançamentos do usuário */
  entryIndicators: Indicator[];
  targets: IndicatorTarget[];
  entries: IndicatorEntry[];
  sectors: Sector[];
};

/**
 * Carrega apenas os dados do usuário autenticado:
 * indicadores sob sua responsabilidade (responsável direto ou dono/criador de metas),
 * suas metas e seus lançamentos.
 */
export function useMyDashboardData() {
  const { user } = useSession();
  const userId = user?.id;

  return useQuery<MyDashboardData>({
    queryKey: ["my-dashboard", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const uid = userId as string;

      // fetchAll — contorna limite 1000 do PostgREST
      const [myTargetRows, ownIndicatorRows, entryRows] = await Promise.all([
        fetchAll<any>((sb) => sb.from("targets").select("*").or(`user_id.eq.${uid},created_by.eq.${uid}`).order("id", { ascending: true }), "targets"),
        fetchAll<any>((sb) => sb.from("indicators").select("*").eq("responsible_user_id", uid).order("id", { ascending: true }), "indicators"),
        fetchAll<any>((sb) => sb.from("indicator_entries").select("*").eq("user_id", uid).order("id", { ascending: true }), "indicator_entries"),
      ]);

      const indicatorIds = new Set<string>([
        ...(ownIndicatorRows ?? []).map((r: any) => r.id as string),
        ...(myTargetRows ?? []).map((r: any) => r.indicator_id as string),
      ]);

      const entryIndicatorIds = [...new Set((entryRows ?? []).map((r: any) => r.indicator_id as string))];
      const missingIds = [...new Set([
        ...[...indicatorIds].filter((id) => !(ownIndicatorRows ?? []).some((r: any) => r.id === id)),
        ...entryIndicatorIds.filter((id) => !indicatorIds.has(id)),
      ])];

      const [{ data: extraIndicatorRows }, { data: targetRows }, { data: sectorRows }] = await Promise.all([
        missingIds.length
          ? supabase.from("indicators").select("*").in("id", missingIds)
          : Promise.resolve({ data: [] as any[] }),
        indicatorIds.size
          ? supabase.from("targets").select("*").in("indicator_id", [...indicatorIds])
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("sectors").select("*"),
      ]);

      const extras = (extraIndicatorRows ?? []).map(toIndicator);
      const indicators = [
        ...(ownIndicatorRows ?? []).map(toIndicator),
        ...extras.filter((i) => indicatorIds.has(i.id)),
      ];
      const entryIndicators = [...indicators, ...extras.filter((i) => !indicatorIds.has(i.id))];
      const targets = (targetRows ?? []).map(toTarget);
      const entries = (entryRows ?? []).map(toEntry);
      const sectors: Sector[] = (sectorRows ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description ?? undefined,
        color: row.color,
        icon: "Circle",
        active: row.status === "ativo",
        display_order: 0,
        created_at: row.created_at,
      }));

      return { indicators, entryIndicators, targets, entries, sectors };
    },
  });
}
