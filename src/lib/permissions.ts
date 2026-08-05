import { useCurrentUser, useStore } from "@/mocks/store";
import type { Indicator } from "@/mocks/types";

/**
 * Visibility rules for indicators based on the current user, mirroring the
 * RLS rules planned for Phase 2:
 *  - super/admin: see everything
 *  - sector members/managers: see indicators owned/shared with their sectors
 *  - franchise users: see franchise/corporate indicators
 *  - auditor: see anything in their assigned sectors/franchises (read-only)
 */
export function useVisibleIndicators(): Indicator[] {
  const user = useCurrentUser();
  const all = useStore((s) => s.indicators);
  const userSectors = useStore((s) => s.userSectors);
  const userFranchises = useStore((s) => s.userFranchises);

  if (!user) return [];
  if (user.global_role === "superadmin" || user.global_role === "admin_corporativo") return all;

  const mySectorIds = userSectors.filter((u) => u.user_id === user.id).map((u) => u.sector_id);
  const myFranchiseIds = userFranchises.filter((u) => u.user_id === user.id).map((u) => u.franchise_id);

  return all.filter((ind) => {
    // Responsável direto sempre enxerga o indicador
    if ((ind.responsible_ids ?? []).includes(user.id)) return true;
    // Indicadores corporativos são visíveis a todos
    if (ind.scope === "corporativo") return true;
    if (user.user_type === "franqueado") {
      // Restrict to indicators relevant to franchises
      return ind.scope === "franquia";
    }
    // Internal user: sector match (setor proprietário ou compartilhado)
    const sectorMatch = (!!ind.owner_sector_id && mySectorIds.includes(ind.owner_sector_id))
      || (ind.shared_sector_ids ?? []).some((s) => mySectorIds.includes(s));
    if (sectorMatch) return true;
    if (user.global_role === "gestor_franquia") {
      return myFranchiseIds.length > 0;
    }
    return false;
  });
}

/**
 * Indicadores em que o usuário logado é responsável direto pelo indicador
 * ou responsável/criador de alguma meta ligada a ele.
 * Superadministrador mantém acesso irrestrito.
 */
export function useOwnedIndicators(): Indicator[] {
  const user = useCurrentUser();
  const visible = useVisibleIndicators();
  const targets = useStore((s) => s.targets);

  if (!user) return [];
  if (user.global_role === "superadmin") return visible;

  return visible.filter((ind) => {
    if ((ind.responsible_ids ?? []).includes(user.id)) return true;
    return targets.some(
      (t) => t.indicator_id === ind.id && (t.user_id === user.id || t.created_by === user.id),
    );
  });
}

export function canManageIndicator(ind: Indicator, userId: string | undefined, role: string | undefined, mySectorRoles: { sector_id: string; sector_role: string }[]) {
  if (!userId) return false;
  if (role === "superadmin" || role === "admin_corporativo") return true;
  const managedSectors = mySectorRoles.filter((r) => r.sector_role === "gestor").map((r) => r.sector_id);
  return managedSectors.includes(ind.owner_sector_id);
}

