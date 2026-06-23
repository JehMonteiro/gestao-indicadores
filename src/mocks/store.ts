import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AuditLog,
  Franchise,
  GlobalRole,
  Indicator,
  IndicatorCategory,
  IndicatorEntry,
  IndicatorTarget,
  Notification,
  Profile,
  Sector,
  SystemSettings,
  UserFranchise,
  UserSector,
} from "./types";
import {
  seedAuditLogs,
  seedCategories,
  seedEntries,
  seedFranchises,
  seedIndicators,
  seedNotifications,
  seedProfiles,
  seedSectors,
  seedSettings,
  seedTargets,
  seedUserFranchises,
  seedUserSectors,
} from "./seed";

type State = {
  currentUserId: string | null;
  activeSectorId: string | null;
  activeFranchiseId: string | null;

  profiles: Profile[];
  sectors: Sector[];
  userSectors: UserSector[];
  franchises: Franchise[];
  userFranchises: UserFranchise[];
  categories: IndicatorCategory[];
  indicators: Indicator[];
  targets: IndicatorTarget[];
  entries: IndicatorEntry[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
};

type Actions = {
  setCurrentUser: (id: string | null) => void;
  setActiveSector: (id: string | null) => void;
  setActiveFranchise: (id: string | null) => void;

  upsertSector: (s: Sector) => void;
  deleteSector: (id: string) => void;
  upsertFranchise: (f: Franchise) => void;
  deleteFranchise: (id: string) => void;
  upsertIndicator: (i: Indicator) => void;
  deleteIndicator: (id: string) => void;
  upsertTarget: (t: IndicatorTarget) => void;
  upsertEntry: (e: IndicatorEntry) => void;
  setEntryStatus: (id: string, status: IndicatorEntry["status"], extra?: Partial<IndicatorEntry>) => void;

  upsertUserSector: (us: UserSector) => void;
  removeUserSector: (id: string) => void;
  upsertUserFranchise: (uf: UserFranchise) => void;
  removeUserFranchise: (id: string) => void;
  upsertProfile: (p: Profile) => void;

  markNotificationRead: (id: string) => void;
  updateSettings: (s: Partial<SystemSettings>) => void;

  logAudit: (a: Omit<AuditLog, "id" | "created_at">) => void;
  resetDemoData: () => void;
};

const initial: State = {
  currentUserId: null,
  activeSectorId: null,
  activeFranchiseId: null,
  profiles: seedProfiles,
  sectors: seedSectors,
  userSectors: seedUserSectors,
  franchises: seedFranchises,
  userFranchises: seedUserFranchises,
  categories: seedCategories,
  indicators: seedIndicators,
  targets: seedTargets,
  entries: seedEntries,
  notifications: seedNotifications,
  auditLogs: seedAuditLogs,
  settings: seedSettings,
};

const uid = () => `id-${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initial,
      setCurrentUser: (id) => set({ currentUserId: id, activeSectorId: null, activeFranchiseId: null }),
      setActiveSector: (id) => set({ activeSectorId: id }),
      setActiveFranchise: (id) => set({ activeFranchiseId: id }),

      upsertSector: (s) => set((st) => ({ sectors: upsert(st.sectors, s) })),
      deleteSector: (id) => set((st) => ({ sectors: st.sectors.filter((x) => x.id !== id) })),
      upsertFranchise: (f) => set((st) => ({ franchises: upsert(st.franchises, f) })),
      deleteFranchise: (id) => set((st) => ({ franchises: st.franchises.filter((x) => x.id !== id) })),
      upsertIndicator: (i) => set((st) => ({ indicators: upsert(st.indicators, i) })),
      deleteIndicator: (id) => set((st) => ({ indicators: st.indicators.filter((x) => x.id !== id) })),
      upsertTarget: (t) => set((st) => ({ targets: upsert(st.targets, t) })),
      upsertEntry: (e) => set((st) => ({ entries: upsert(st.entries, e) })),
      setEntryStatus: (id, status, extra) =>
        set((st) => ({
          entries: st.entries.map((e) =>
            e.id === id ? { ...e, status, updated_at: now(), ...extra } : e,
          ),
        })),

      upsertUserSector: (us) => set((st) => ({ userSectors: upsert(st.userSectors, us) })),
      removeUserSector: (id) => set((st) => ({ userSectors: st.userSectors.filter((x) => x.id !== id) })),
      upsertUserFranchise: (uf) => set((st) => ({ userFranchises: upsert(st.userFranchises, uf) })),
      removeUserFranchise: (id) => set((st) => ({ userFranchises: st.userFranchises.filter((x) => x.id !== id) })),
      upsertProfile: (p) => set((st) => ({ profiles: upsert(st.profiles, p) })),

      markNotificationRead: (id) =>
        set((st) => ({
          notifications: st.notifications.map((n) => (n.id === id ? { ...n, read_at: now() } : n)),
        })),
      updateSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),

      logAudit: (a) =>
        set((st) => ({
          auditLogs: [{ id: uid(), created_at: now(), ...a }, ...st.auditLogs].slice(0, 500),
        })),
      resetDemoData: () => set({ ...initial, currentUserId: get().currentUserId }),
    }),
    { name: "gi-store-v1" },
  ),
);

function upsert<T extends { id: string }>(arr: T[], item: T): T[] {
  const idx = arr.findIndex((x) => x.id === item.id);
  if (idx === -1) return [item, ...arr];
  const next = arr.slice();
  next[idx] = item;
  return next;
}

// Helpers
export const useCurrentUser = (): Profile | null => {
  const id = useStore((s) => s.currentUserId);
  const profiles = useStore((s) => s.profiles);
  return id ? profiles.find((p) => p.id === id) ?? null : null;
};

export function canSeeRoute(role: GlobalRole | undefined, route: string): boolean {
  if (!role) return false;
  const roleMatrix: Record<string, GlobalRole[]> = {
    "/visao-geral": ["superadmin", "admin_corporativo", "auditor"],
    "/meu-painel": ["superadmin", "admin_corporativo", "gestor_setor", "colaborador", "gestor_franquia", "franqueado", "auditor"],
    "/meus-indicadores": ["superadmin", "admin_corporativo", "gestor_setor", "colaborador", "gestor_franquia", "franqueado", "auditor"],
    "/lancamentos": ["superadmin", "admin_corporativo", "gestor_setor", "colaborador", "gestor_franquia", "franqueado"],
    "/aprovacoes": ["superadmin", "admin_corporativo", "gestor_setor", "gestor_franquia"],
    "/setores": ["superadmin", "admin_corporativo", "gestor_setor", "auditor"],
    "/franquias": ["superadmin", "admin_corporativo", "gestor_franquia", "auditor"],
    "/indicadores": ["superadmin", "admin_corporativo", "gestor_setor", "auditor"],
    "/metas": ["superadmin", "admin_corporativo", "gestor_setor", "gestor_franquia"],
    "/relatorios": ["superadmin", "admin_corporativo", "gestor_setor", "gestor_franquia", "auditor"],
    "/usuarios": ["superadmin", "admin_corporativo"],
    "/auditoria": ["superadmin", "admin_corporativo", "auditor"],
    "/configuracoes": ["superadmin"],
    "/perfil": ["superadmin", "admin_corporativo", "gestor_setor", "colaborador", "gestor_franquia", "franqueado", "auditor"],
  };
  const allowed = roleMatrix[route];
  return !allowed || allowed.includes(role);
}
