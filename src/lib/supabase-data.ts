// Bridge between the existing UI store types (src/mocks/types) and the
// real Supabase schema. Provides loaders (Supabase rows → store types)
// and write-through helpers used by the Zustand store actions.

import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/supabase-fetch-all";
import { firstIntegerError } from "@/lib/value-rules";
import type {
  AuditLog,
  Franchise,
  Indicator,
  IndicatorEntry,
  IndicatorTarget,
  Notification,
  Profile,
  Sector,
  SystemSettings,
  UserFranchise,
  UserSector,
  GlobalRole,
  ValueType,
} from "@/mocks/types";

// ---------- Mappers (DB row → mock type) ----------

function mapProfile(row: any, role: GlobalRole): Profile {
  return {
    id: row.id,
    full_name: row.full_name ?? row.email?.split("@")[0] ?? "Usuário",
    email: row.email ?? "",
    avatar_url: row.avatar_url ?? undefined,
    global_role: role,
    user_type: role === "franqueado" || role === "gestor_franquia" ? "franqueado" : "interno",
    status: (row.status as "ativo" | "inativo") ?? "ativo",
    created_at: row.created_at,
  };
}

function mapSector(row: any): Sector {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    company_id: row.company_id ?? null,
    description: row.description ?? undefined,
    color: row.color ?? "#2563eb",
    icon: "Folder",
    active: row.status === "ativo",
    display_order: 0,
    created_at: row.created_at,
  };
}

function mapFranchise(row: any): Franchise {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    entity_type: row.entity_type ?? null,
    parent_id: row.parent_id ?? null,
    city: row.city ?? "",
    state: row.state ?? "",
    region: row.state ?? "",
    status: row.status === "ativo" ? "ativa" : "inativa",
    start_date: row.opened_at ?? row.created_at,
    created_at: row.created_at,
  };
}

function mapIndicator(row: any, sharedSectorIds: string[] = []): Indicator {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description ?? undefined,
    objective: row.objective ?? undefined,
    owner_sector_id: row.owner_sector_id ?? "",
    shared_sector_ids: sharedSectorIds,
    franchise_id: row.franchise_id ?? undefined,
    strategic_pillar: row.strategic_pillar ?? undefined,
    kpi_group: (row.kpi_group ?? "resultado") as Indicator["kpi_group"],
    entity_scope: (row.entity_scope ?? null) as Indicator["entity_scope"],
    entity_id: row.entity_id ?? null,
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

function mapTarget(row: any): IndicatorTarget {
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

function mapEntry(row: any): IndicatorEntry {
  return {
    id: row.id,
    indicator_id: row.indicator_id,
    target_id: row.target_id ?? undefined,
    user_id: row.user_id,
    sector_id: row.sector_id ?? undefined,
    franchise_id: row.franchise_id ?? undefined,
    period_start: row.period_start,
    period_end: row.period_end,
    actual_value: Number(row.actual_value),
    comment: row.comment ?? undefined,
    justification: row.justification ?? undefined,
    status: row.status,
    submitted_at: row.submitted_at ?? undefined,
    revision_number: row.revision_number ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapUserSector(row: any): UserSector {
  return {
    id: row.id,
    user_id: row.user_id,
    sector_id: row.sector_id,
    sector_role: row.role,
    active: true,
    joined_at: row.created_at,
  };
}

function mapUserFranchise(row: any): UserFranchise {
  return {
    id: row.id,
    user_id: row.user_id,
    franchise_id: row.franchise_id,
    franchise_role: row.role,
    active: true,
    joined_at: row.created_at,
  };
}

function mapNotification(row: any): Notification {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    message: row.body ?? "",
    type: "info",
    link: row.link ?? undefined,
    read_at: row.read_at ?? undefined,
    created_at: row.created_at,
  };
}

function mapAudit(row: any): AuditLog {
  return {
    id: row.id,
    user_id: row.user_id ?? "",
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id ?? "",
    new_data: row.payload,
    created_at: row.created_at,
  };
}

const ROLE_ORDER: GlobalRole[] = [
  "superadmin",
  "admin_corporativo",
  "gestor_setor",
  "gestor_franquia",
  "colaborador",
  "franqueado",
  "auditor",
];

export async function loadProfileAndRole(userId: string, email?: string) {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  const list = (roles ?? []).map((r) => r.role as GlobalRole);
  const role = ROLE_ORDER.find((r) => list.includes(r)) ?? "colaborador";
  const merged = mapProfile(
    profile ?? { id: userId, email, status: "ativo", created_at: new Date().toISOString() },
    role,
  );
  return { profile: merged, role };
}

export async function loadAllFromSupabase(userId: string) {
  const [
    sectors,
    franchises,
    indicators,
    sharedSectors,
    targets,
    entries,
    userSectors,
    userFranchises,
    notifications,
    auditLogs,
    settings,
    profiles,
    roles,
  ] = await Promise.all([
    // fetchAll — contorna limite 1000 do PostgREST
    fetchAll<any>((sb) => sb.from("sectors").select("*").order("name"), "sectors"),
    fetchAll<any>((sb) => sb.from("franchises").select("*").order("name"), "franchises"),
    fetchAll<any>((sb) => sb.from("indicators").select("*").order("name"), "indicators"),
    fetchAll<any>((sb) => sb.from("indicator_shared_sectors").select("indicator_id, sector_id"), "indicator_shared_sectors"),
    fetchAll<any>((sb) => sb.from("targets").select("*"), "targets"),
    fetchAll<any>((sb) => sb.from("indicator_entries").select("*").order("period_end", { ascending: false }).order("id", { ascending: true }), "indicator_entries"),
    fetchAll<any>((sb) => sb.from("user_sectors").select("*"), "user_sectors"),
    fetchAll<any>((sb) => sb.from("user_franchises").select("*"), "user_franchises"),
    fetchAll<any>((sb) => sb.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).order("id", { ascending: true }), "notifications"),
    fetchAll<any>((sb) => sb.from("audit_logs").select("*").order("created_at", { ascending: false }).order("id", { ascending: true }), "audit_logs"),
    supabase.from("app_settings").select("*").maybeSingle(),
    fetchAll<any>((sb) => sb.from("profiles").select("*"), "profiles"),
    fetchAll<any>((sb) => sb.from("user_roles").select("user_id, role").order("user_id", { ascending: true }), "user_roles"),
  ]);

  const sharedByIndicator = new Map<string, string[]>();
  (sharedSectors as any[]).forEach((r: any) => {
    const list = sharedByIndicator.get(r.indicator_id) ?? [];
    list.push(r.sector_id);
    sharedByIndicator.set(r.indicator_id, list);
  });

  const rolesByUser = new Map<string, GlobalRole[]>();
  roles.forEach((r: any) => {
    const list = rolesByUser.get(r.user_id) ?? [];
    list.push(r.role);
    rolesByUser.set(r.user_id, list);
  });
  const mappedProfiles: Profile[] = profiles.map((p: any) => {
    const list = rolesByUser.get(p.id) ?? [];
    const role = ROLE_ORDER.find((r) => list.includes(r)) ?? "colaborador";
    return mapProfile(p, role);
  });

  const sys: SystemSettings = {
    platform_name: "Gestão de Indicadores",
    achieved_threshold: settings.data?.threshold_success ?? 100,
    warning_threshold: settings.data?.threshold_warning ?? 80,
  };

  return {
    profiles: mappedProfiles,
    sectors: (sectors.data ?? []).map(mapSector),
    franchises: (franchises.data ?? []).map(mapFranchise),
    indicators: (indicators.data ?? []).map((row: any) => mapIndicator(row, sharedByIndicator.get(row.id) ?? [])),
    targets: (targets.data ?? []).map(mapTarget),
    entries: (entries.data ?? []).map(mapEntry),
    userSectors: (userSectors.data ?? []).map(mapUserSector),
    userFranchises: (userFranchises.data ?? []).map(mapUserFranchise),
    notifications: (notifications.data ?? []).map(mapNotification),
    auditLogs: (auditLogs.data ?? []).map(mapAudit),
    settings: sys,
    categories: [],
  };
}

// ---------- Validação de valores inteiros (camada de aplicação) ----------

async function indicatorValueType(indicatorId: string): Promise<ValueType | undefined> {
  const { useStore } = await import("@/mocks/store");
  return useStore.getState().indicators.find((i) => i.id === indicatorId)?.value_type;
}

function assertIntegerFields(
  type: ValueType | undefined,
  fields: Array<{ label: string; value: number | null | undefined }>,
) {
  const err = firstIntegerError(type, fields);
  if (err) throw new Error(err);
}

/** Garante inteiro (ou null) antes de persistir — nenhum decimal chega ao banco. */
function intOrNull(v: number | null | undefined): number | null {
  if (v === null || v === undefined || Number.isNaN(v)) return null;
  return Math.round(v);
}


// ---------- Write-through helpers (mock type → DB) ----------

export const dbWrite = {
  async sector(s: Sector) {
    return supabase.from("sectors").upsert({
      id: s.id,
      code: s.code,
      name: s.name,
      description: s.description ?? null,
      color: s.color,
      company_id: s.company_id ?? null,
      status: s.active ? "ativo" : "inativo",
    });
  },
  async deleteSector(id: string) {
    return supabase.from("sectors").delete().eq("id", id);
  },
  async franchise(f: Franchise) {
    return supabase.from("franchises").upsert({
      id: f.id,
      code: f.code,
      name: f.name,
      entity_type: (f.entity_type ?? null) as any,
      parent_id: f.parent_id ?? null,
      city: f.city || null,
      state: f.state || null,
      opened_at: f.start_date || null,
      status: f.status === "ativa" ? "ativo" : "inativo",
    });
  },
  async deleteFranchise(id: string) {
    return supabase.from("franchises").delete().eq("id", id);
  },
  async indicator(i: Indicator) {
    assertIntegerFields(i.value_type, [
      { label: "Meta padrão", value: i.default_target },
      { label: "Valor mínimo", value: i.minimum_value },
      { label: "Valor máximo", value: i.maximum_value },
      { label: "Peso", value: i.weight },
    ]);
    const res = await supabase.from("indicators").upsert({
      id: i.id,
      code: i.code,
      name: i.name,
      description: i.description ?? null,
      objective: i.objective ?? null,
      owner_sector_id: i.owner_sector_id || null,
      franchise_id: i.franchise_id ?? null,
      strategic_pillar: i.strategic_pillar ?? null,
      kpi_group: (i.kpi_group ?? "resultado") as any,
      entity_scope: (i.entity_scope ?? null) as any,
      entity_id: i.entity_id ?? null,
      responsible_user_id: i.responsible_ids[0] || null,
      scope: i.scope as any,
      value_type: i.value_type as any,
      periodicity: i.frequency as any,
      direction: i.direction as any,
      default_target: intOrNull(i.default_target),
      minimum_value: intOrNull(i.minimum_value),
      maximum_value: intOrNull(i.maximum_value),
      warning_threshold: intOrNull(i.warning_threshold),
      critical_threshold: intOrNull(i.critical_threshold),
      start_date: i.start_date || null,
      end_date: i.end_date || null,
      status: i.status as any,
      created_by: i.created_by || null,
    });
    if (res.error) return res;

    // Sincroniza os setores compartilhados do indicador
    const shared = (i.shared_sector_ids ?? []).filter(Boolean);
    if (shared.length === 0) {
      await supabase.from("indicator_shared_sectors" as any).delete().eq("indicator_id", i.id);
    } else {
      await supabase.from("indicator_shared_sectors" as any)
        .delete()
        .eq("indicator_id", i.id)
        .not("sector_id", "in", `(${shared.join(",")})`);
      await supabase.from("indicator_shared_sectors" as any).upsert(
        shared.map((sid) => ({ indicator_id: i.id, sector_id: sid })) as any,
        { onConflict: "indicator_id,sector_id" } as any,
      );
    }
    return res;
  },
  async deleteIndicator(id: string) {
    return supabase.from("indicators").delete().eq("id", id);
  },
  async target(t: IndicatorTarget) {
    assertIntegerFields(await indicatorValueType(t.indicator_id), [
      { label: "Valor da meta", value: t.target_value },
      { label: "Valor mínimo", value: t.minimum_value },
      { label: "Valor máximo", value: t.maximum_value },
    ]);
    return supabase.from("targets").upsert({
      id: t.id,
      indicator_id: t.indicator_id,
      franchise_id: t.franchise_id ?? null,
      sector_id: t.sector_id ?? null,
      user_id: t.user_id ?? null,
      period_start: t.period_start,
      period_end: t.period_end,
      target_value: Math.round(t.target_value ?? 0),
      min_value: intOrNull(t.minimum_value),
      max_value: intOrNull(t.maximum_value),
      created_by: t.created_by || null,
    });
  },
  async deleteTarget(id: string) {
    return supabase.from("targets").delete().eq("id", id);
  },
  async entry(e: IndicatorEntry) {
    assertIntegerFields(await indicatorValueType(e.indicator_id), [
      { label: "O valor realizado", value: e.actual_value },
    ]);
    const { data, error } = await supabase.from("indicator_entries").upsert({
      id: e.id,
      indicator_id: e.indicator_id,
      target_id: e.target_id ?? null,
      user_id: e.user_id,
      sector_id: e.sector_id ?? null,
      franchise_id: e.franchise_id ?? null,
      period_start: e.period_start,
      period_end: e.period_end,
      actual_value: Math.round(e.actual_value ?? 0),
      comment: e.comment ?? null,
      justification: e.justification ?? null,
      status: e.status as any,
      submitted_at: e.submitted_at ?? null,
      revision_number: e.revision_number,
      updated_at: e.updated_at,
    }).select("*").maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Lançamento não foi salvo");
    return mapEntry(data);
  },
  async updateEntryStatus(id: string, patch: Partial<IndicatorEntry>) {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.submitted_at !== undefined) payload.submitted_at = patch.submitted_at;
    const { data, error } = await supabase
      .from("indicator_entries")
      .update(payload as any)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Lançamento não foi atualizado");
    return mapEntry(data);
  },
  async userSector(us: UserSector) {
    return supabase.from("user_sectors").upsert({
      id: us.id,
      user_id: us.user_id,
      sector_id: us.sector_id,
      role: us.sector_role as any,
    });
  },
  async removeUserSector(id: string) {
    return supabase.from("user_sectors").delete().eq("id", id);
  },
  async userFranchise(uf: UserFranchise) {
    return supabase.from("user_franchises").upsert({
      id: uf.id,
      user_id: uf.user_id,
      franchise_id: uf.franchise_id,
      role: uf.franchise_role as any,
    });
  },
  async removeUserFranchise(id: string) {
    return supabase.from("user_franchises").delete().eq("id", id);
  },
  async markNotificationRead(id: string) {
    return supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  },
  async settings(s: SystemSettings) {
    return supabase.from("app_settings").upsert({
      id: 1,
      threshold_success: s.achieved_threshold,
      threshold_warning: s.warning_threshold,
      threshold_danger: Math.max(0, s.warning_threshold - 20),
    });
  },
  async audit(a: { user_id: string; action: string; entity_type: string; entity_id: string; new_data?: unknown }) {
    return supabase.rpc("log_audit", {
      _action: a.action,
      _entity_type: a.entity_type,
      _entity_id: a.entity_id || (null as any),
      _payload: (a.new_data as any) ?? null,
    });
  },
};

function reportError(err: unknown, label: string) {
  // Keep raw error in server/devtools console only — do not surface DB internals to users.
  // eslint-disable-next-line no-console
  console.error(`[supabase-data:${label}]`, err);
  const raw = err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String((err as { message?: unknown }).message ?? "") : "";
  const isValidation = /número inteiro|casas decimais/i.test(raw);
  import("sonner").then(({ toast }) => {
    toast.error(isValidation ? "Valor inválido" : "Não foi possível salvar", {
      description: isValidation ? raw : "Tente novamente em instantes. Se persistir, contate o administrador.",
    });
  }).catch(() => {});
  // Roll back optimistic local state by re-hydrating from the DB so the UI
  // never shows a "phantom" row that was actually rejected server-side.
  void rehydrateFromCloud();
}

async function rehydrateFromCloud() {
  try {
    const { useStore } = await import("@/mocks/store");
    const uid = useStore.getState().currentUserId;
    if (!uid) return;
    const data = await loadAllFromSupabase(uid);
    useStore.getState().hydrate(data);
  } catch {
    // best-effort; silence — user already saw the error toast
  }
}

export function fireAndForget(label: string, p: Promise<unknown>) {
  return p.then((res: any) => {
    if (res && typeof res === "object" && "error" in res && res.error) {
      reportError(res.error, label);
    }
  }).catch((err) => reportError(err, label));
}

