import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RawCounts = {
  entries: number;
  entriesByStatus: Record<string, number>;
  targets: number;
  indicators: number;
  indicatorsNoScope: number;
  indicatorsEmpresa: number;
  indicatorsFranquia: number;
};

export type HiddenIndicator = {
  id: string;
  name: string;
  code: string;
  entryCount: number;
  total: number;
  lastEntry: string | null;
};

export type OrphanEntry = {
  id: string;
  indicator_id: string;
  period_start: string;
  period_end: string;
  actual_value: number;
};

export type AuditRow = {
  id: string;
  created_at: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: string | null;
};

export type DataAudit = {
  counts: RawCounts;
  hidden: HiddenIndicator[];
  hiddenEntryTotal: number;
  orphans: OrphanEntry[];
  logs: AuditRow[];
};

/** Leitura completa para a tela /auditoria-dados (somente Superadmin, sem escrita). */
export const getDataAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DataAudit> => {
    const { data: roles, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleErr) throw new Error("Forbidden");
    if (!(roles ?? []).some((r) => r.role === "superadmin")) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { fetchAllWith } = await import("@/lib/supabase-fetch-all");

    // fetchAll — contorna limite 1000 do PostgREST
    const [entries, targetRows, indicators, profiles, logsRes] = await Promise.all([
      fetchAllWith<any>(
        supabaseAdmin,
        (sb) =>
          sb
            .from("indicator_entries")
            .select("id, indicator_id, period_start, period_end, actual_value, status")
            .order("id", { ascending: true }),
        "indicator_entries",
      ),
      fetchAllWith<any>(
        supabaseAdmin,
        (sb) => sb.from("targets").select("id").order("id", { ascending: true }),
        "targets",
      ),
      fetchAllWith<any>(
        supabaseAdmin,
        (sb) =>
          sb
            .from("indicators")
            .select("id, name, code, entity_scope")
            .order("id", { ascending: true }),
        "indicators",
      ),
      fetchAllWith<any>(
        supabaseAdmin,
        (sb) => sb.from("profiles").select("id, full_name, email").order("id", { ascending: true }),
        "profiles",
      ),
      supabaseAdmin
        .from("audit_logs")
        .select("id, created_at, user_id, action, entity_type, entity_id, payload")
        .in("action", ["delete", "update"])
        .in("entity_type", ["indicator", "entry", "target"])
        .order("created_at", { ascending: false })
        // Limite intencional: a tela mostra apenas os últimos 200 registros de auditoria
        .limit(200),
    ]);

    const entriesByStatus: Record<string, number> = {};
    for (const e of entries) {
      const s = String(e.status ?? "sem status");
      entriesByStatus[s] = (entriesByStatus[s] ?? 0) + 1;
    }

    const counts: RawCounts = {
      entries: entries.length,
      entriesByStatus,
      targets: targetRows.length,
      indicators: indicators.length,
      indicatorsNoScope: indicators.filter((i) => i.entity_scope == null).length,
      indicatorsEmpresa: indicators.filter((i) => i.entity_scope === "empresa").length,
      indicatorsFranquia: indicators.filter((i) => i.entity_scope === "franquia").length,
    };

    const byIndicator = new Map<string, { count: number; total: number; last: string | null }>();
    for (const e of entries) {
      const cur = byIndicator.get(e.indicator_id) ?? { count: 0, total: 0, last: null };
      cur.count += 1;
      cur.total += Number(e.actual_value ?? 0);
      if (!cur.last || String(e.period_end) > cur.last) cur.last = String(e.period_end);
      byIndicator.set(e.indicator_id, cur);
    }

    const hidden: HiddenIndicator[] = indicators
      .filter((i) => i.entity_scope == null)
      .map((i) => {
        const agg = byIndicator.get(i.id) ?? { count: 0, total: 0, last: null };
        return {
          id: i.id,
          name: i.name,
          code: i.code,
          entryCount: agg.count,
          total: agg.total,
          lastEntry: agg.last,
        };
      })
      .sort((a, b) => b.entryCount - a.entryCount);

    const hiddenEntryTotal = hidden.reduce((s, h) => s + h.entryCount, 0);

    const indicatorIds = new Set(indicators.map((i) => i.id));
    const orphans: OrphanEntry[] = entries
      .filter((e) => !indicatorIds.has(e.indicator_id))
      .map((e) => ({
        id: e.id,
        indicator_id: e.indicator_id,
        period_start: String(e.period_start),
        period_end: String(e.period_end),
        actual_value: Number(e.actual_value ?? 0),
      }));

    const nameById = new Map(profiles.map((p) => [p.id, p.full_name || p.email || p.id] as const));
    const logs: AuditRow[] = (logsRes.data ?? []).map((l) => ({
      id: l.id,
      created_at: l.created_at,
      user_name: (l.user_id && nameById.get(l.user_id)) || l.user_id || "—",
      action: l.action,
      entity_type: l.entity_type,
      entity_id: l.entity_id ?? null,
      payload: l.payload == null ? null : JSON.stringify(l.payload, null, 2),
    }));

    return { counts, hidden, hiddenEntryTotal, orphans, logs };
  });
