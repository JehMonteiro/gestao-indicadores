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
import { dbWrite, fireAndForget } from "@/lib/supabase-data";
import { newId } from "@/lib/ids";

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

  hydrate: (data: Partial<State>) => void;
  clearAll: () => void;

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
};

const defaultSettings: SystemSettings = {
  platform_name: "Gestão de Indicadores",
  achieved_threshold: 100,
  warning_threshold: 80,
};

const initial: State = {
  currentUserId: null,
  activeSectorId: null,
  activeFranchiseId: null,
  profiles: [],
  sectors: [],
  userSectors: [],
  franchises: [],
  userFranchises: [],
  categories: [],
  indicators: [],
  targets: [],
  entries: [],
  notifications: [],
  auditLogs: [],
  settings: defaultSettings,
};

const uid = () => newId();
const now = () => new Date().toISOString();

export const useStore = create<State & Actions>()(
  persist(
    (set) => ({
      ...initial,
      setCurrentUser: (id) => set({ currentUserId: id, activeSectorId: null, activeFranchiseId: null }),
      setActiveSector: (id) => set({ activeSectorId: id }),
      setActiveFranchise: (id) => set({ activeFranchiseId: id }),

      hydrate: (data) => set((st) => ({ ...st, ...data })),
      clearAll: () => set({ ...initial, currentUserId: null }),

      upsertSector: (s) => {
        set((st) => ({ sectors: upsert(st.sectors, s) }));
        fireAndForget("sector", dbWrite.sector(s));
      },
      deleteSector: (id) => {
        set((st) => ({ sectors: st.sectors.filter((x) => x.id !== id) }));
        fireAndForget("deleteSector", dbWrite.deleteSector(id));
      },
      upsertFranchise: (f) => {
        set((st) => ({ franchises: upsert(st.franchises, f) }));
        fireAndForget("franchise", dbWrite.franchise(f));
      },
      deleteFranchise: (id) => {
        set((st) => ({ franchises: st.franchises.filter((x) => x.id !== id) }));
        fireAndForget("deleteFranchise", dbWrite.deleteFranchise(id));
      },
      upsertIndicator: (i) => {
        set((st) => ({ indicators: upsert(st.indicators, i) }));
        fireAndForget("indicator", dbWrite.indicator(i));
      },
      deleteIndicator: (id) => {
        set((st) => ({ indicators: st.indicators.filter((x) => x.id !== id) }));
        fireAndForget("deleteIndicator", dbWrite.deleteIndicator(id));
      },
      upsertTarget: (t) => {
        set((st) => ({ targets: upsert(st.targets, t) }));
        fireAndForget("target", dbWrite.target(t));
      },
      upsertEntry: (e) => {
        set((st) => ({ entries: upsert(st.entries, e) }));
        fireAndForget("entry", dbWrite.entry(e));
      },
      setEntryStatus: (id, status, extra) => {
        let updated: IndicatorEntry | undefined;
        set((st) => ({
          entries: st.entries.map((e) => {
            if (e.id !== id) return e;
            updated = { ...e, status, updated_at: now(), ...extra };
            return updated;
          }),
        }));
        if (updated) fireAndForget("entryStatus", dbWrite.entry(updated));
      },

      upsertUserSector: (us) => {
        set((st) => ({ userSectors: upsert(st.userSectors, us) }));
        fireAndForget("userSector", dbWrite.userSector(us));
      },
      removeUserSector: (id) => {
        set((st) => ({ userSectors: st.userSectors.filter((x) => x.id !== id) }));
        fireAndForget("removeUserSector", dbWrite.removeUserSector(id));
      },
      upsertUserFranchise: (uf) => {
        set((st) => ({ userFranchises: upsert(st.userFranchises, uf) }));
        fireAndForget("userFranchise", dbWrite.userFranchise(uf));
      },
      removeUserFranchise: (id) => {
        set((st) => ({ userFranchises: st.userFranchises.filter((x) => x.id !== id) }));
        fireAndForget("removeUserFranchise", dbWrite.removeUserFranchise(id));
      },
      upsertProfile: (p) => set((st) => ({ profiles: upsert(st.profiles, p) })),

      markNotificationRead: (id) => {
        set((st) => ({
          notifications: st.notifications.map((n) => (n.id === id ? { ...n, read_at: now() } : n)),
        }));
        fireAndForget("notificationRead", dbWrite.markNotificationRead(id));
      },
      updateSettings: (s) => {
        let next: SystemSettings | undefined;
        set((st) => {
          next = { ...st.settings, ...s };
          return { settings: next };
        });
        if (next) fireAndForget("settings", dbWrite.settings(next));
      },

      logAudit: (a) => {
        const row: AuditLog = { id: uid(), created_at: now(), ...a };
        set((st) => ({ auditLogs: [row, ...st.auditLogs].slice(0, 500) }));
        fireAndForget("audit", dbWrite.audit(a));
      },
    }),
    {
      name: "gi-store-v2",
      // Persist only lightweight identity/UI context. Sensitive business data
      // (entries, audit logs, profiles, roles) is reloaded fresh from Supabase
      // on each session to avoid leaving it readable in localStorage.
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        activeSectorId: state.activeSectorId,
        activeFranchiseId: state.activeFranchiseId,
      }),
    },
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
    "/lancamentos": ["superadmin", "admin_corporativo", "gestor_setor", "colaborador", "gestor_franquia", "franqueado", "auditor"],
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
