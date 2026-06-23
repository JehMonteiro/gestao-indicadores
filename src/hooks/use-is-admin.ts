import { useAuthProfile } from "@/hooks/use-auth";

/**
 * Returns true when the signed-in user can manage the platform
 * (create/edit indicators, manage users, etc.).
 */
export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const { data, isLoading } = useAuthProfile();
  const role = data?.role;
  const isAdmin = role === "superadmin" || role === "admin_corporativo";
  return { isAdmin, loading: isLoading };
}
