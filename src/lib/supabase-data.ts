// Bridge between the existing UI store types (src/mocks/types) and the
// real Supabase schema. Provides loaders (Supabase rows → store types)
// and write-through helpers used by the Zustand store actions.

import { supabase } from "@/integrations/supabase/client";
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
    city: row.city ?? "",
    state: row.state ?? "",
    region: row.state ?? "",
    status: row.status === "ativo" ? "ativa" : "inativa",
    start_date: row.opened_at ?? row.created_at,
    created_at: row.created_at,
  };
}

function mapIndicator(row: any): Indicator {
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
    audience: row.audience ?? "ambos",
    scope: row.scope,
    responsible_ids: row.responsible_user_id ? [row.responsible_user_id] : [],
    value_type: row.value_type,
    unit: row.unit ?? undefined,
    frequency: row.periodicity,
    direction: row.direction,
    data_source: row.data_source ?? undefined,
    input_method: row.input_method ?? "manual",
    default_target: row.default_target != null ? Number(row.default_target) : undefined,
    minimum_value: row.minimum_value != null ? Number(row.minimum_value) : undefined,
    maximum_value: row.maximum_value != null ? Number(row.maximum_value) : undefined,
    warning_threshold: row.warning_threshold != null ? Number(row.warning_threshold) : undefined,
    critical_threshold: row.critical_threshold != null ? Number(row.critical_threshold) : undefined,
    weight: 1,
    allows_attachment: row.allows_attachment,
    instructions: row.instructions ?? undefined,
    start_date: row.start_date ?? row.created_at,
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
    supabase.from("sectors").select("*").order("name"),
    supabase.from("franchises").select("*").order("name"),
    supabase.from("indicators").select("*").order("name"),
    supabase.from("targets").select("*"),
    supabase.from("indicator_entries").select("*").order("period_end", { ascending: false }),
    supabase.from("user_sectors").select("*"),
    supabase.from("user_franchises").select("*"),
    supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("app_settings").select("*").maybeSingle(),
    supabase.from("profiles").select("*"),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  const rolesByUser = new Map<string, GlobalRole[]>();
  (roles.data ?? []).forEach((r: any) => {
    const list = rolesByUser.get(r.user_id) ?? [];
    list.push(r.role);
    rolesByUser.set(r.user_id, list);
  });
  const mappedProfiles: Profile[] = (profiles.data ?? []).map((p: any) => {
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
    indicators: (indicators.data ?? []).map(mapIndicator),
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

function indicatorValueType(indicatorId: string): ValueType | undefined {
  return useStore.getState().indicators.find((i) => i.id === indicatorId)?.value_type;
}

function assertIntegerFields(
  type: ValueType | undefined,
  fields: Array<{ label: string; value: number | null | undefined }>,
) {
  const err = firstIntegerError(type, fields);
  if (err) throw new Error(err);
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
    return supabase.from("indicators").upsert({
      id: i.id,
      code: i.code,
      name: i.name,
      description: i.description ?? null,
      objective: i.objective ?? null,
      owner_sector_id: i.owner_sector_id || null,
      franchise_id: i.franchise_id ?? null,
      strategic_pillar: i.strategic_pillar ?? null,
      responsible_user_id: i.responsible_ids[0] || null,
      audience: i.audience,
      scope: i.scope as any,
      value_type: i.value_type as any,
      unit: i.unit ?? null,
      periodicity: i.frequency as any,
      direction: i.direction as any,
      input_method: i.input_method,
      default_target: i.default_target ?? null,
      minimum_value: i.minimum_value ?? null,
      maximum_value: i.maximum_value ?? null,
      warning_threshold: i.warning_threshold ?? null,
      critical_threshold: i.critical_threshold ?? null,
      allows_attachment: i.allows_attachment,
      start_date: i.start_date || null,
      instructions: i.instructions ?? null,
      data_source: i.data_source ?? null,
      status: i.status as any,
      created_by: i.created_by || null,
    });
  },
  async deleteIndicator(id: string) {
    return supabase.from("indicators").delete().eq("id", id);
  },
  async target(t: IndicatorTarget) {
    assertIntegerFields(indicatorValueType(t.indicator_id), [
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
      target_value: t.target_value,
      min_value: t.minimum_value ?? null,
      max_value: t.maximum_value ?? null,
      created_by: t.created_by || null,
    });
  },
  async deleteTarget(id: string) {
    return supabase.from("targets").delete().eq("id", id);
  },
  async entry(e: IndicatorEntry) {
    assertIntegerFields(indicatorValueType(e.indicator_id), [
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
      actual_value: e.actual_value ?? 0,
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
  import("sonner").then(({ toast }) => {
    toast.error("Não foi possível salvar", {
      description: "Tente novamente em instantes. Se persistir, contate o administrador.",
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
  p.then((res: any) => {
    if (res && typeof res === "object" && "error" in res && res.error) {
      reportError(res.error, label);
    }
  }).catch((err) => reportError(err, label));
}

