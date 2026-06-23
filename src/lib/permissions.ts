import { useCurrentUser, useStore } from "@/mocks/store";
import type { Indicator } from "@/mocks/types";

/**
 * Visibility rules for indicators based on the current user, mirroring the
 * RLS rules planned for Phase 2:
 *  - super/admin: see everything
 *  - sector members/managers: see indicators owned/shared with their sectors
 *  - franchise users: see indicators with audience including franchise AND
 *    where they have an entry/target for their franchise
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
    if (user.user_type === "franqueado") {
      if (ind.audience === "interno") return false;
      // Restrict to indicators relevant to franchises
      return ind.scope === "franquia" || ind.scope === "corporativo";
    }
    // Internal user: sector match
    const sectorMatch = ind.owner_sector_id && mySectorIds.includes(ind.owner_sector_id)
      || ind.shared_sector_ids.some((s) => mySectorIds.includes(s));
    if (sectorMatch) return true;
    if (user.global_role === "gestor_franquia") {
      return myFranchiseIds.length > 0 && (ind.audience === "franqueado" || ind.audience === "ambos");
    }
    return false;
  });
}

export function canManageIndicator(ind: Indicator, userId: string | undefined, role: string | undefined, mySectorRoles: { sector_id: string; sector_role: string }[]) {
  if (!userId) return false;
  if (role === "superadmin" || role === "admin_corporativo") return true;
  const managedSectors = mySectorRoles.filter((r) => r.sector_role === "gestor").map((r) => r.sector_id);
  return managedSectors.includes(ind.owner_sector_id);
}
