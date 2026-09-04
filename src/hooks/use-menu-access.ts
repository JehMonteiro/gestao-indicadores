import { useMemo } from "react";
import { useAuthProfile, useSession } from "@/hooks/use-auth";
import { DEFAULT_ROLE_MENU, MENU_ENTRIES, resolveMenuKey, type MenuKey } from "@/lib/menu-registry";
import type { GlobalRole } from "@/mocks/types";

export function useMenuAccess(): {
  loading: boolean;
  allowedKeys: Set<MenuKey>;
  can: (key: MenuKey) => boolean;
  canPath: (pathname: string) => boolean;
  firstAllowedPath: string | null;
} {
  const { user, loading: sessionLoading } = useSession();
  const { data, isLoading, isError } = useAuthProfile();
  // While the session is being restored the profile query is disabled (isLoading === false),
  // so we must treat that window as loading to avoid a false "access denied" flash.
  const loading = sessionLoading || (!!user && (isLoading || (!data && !isError)));
  const rolesUnknown = !data;
  const roles: GlobalRole[] = data?.roles?.length ? data.roles : data?.role ? [data.role] : [];
  const rolesKey = roles.join(",");

  const allowedKeys = useMemo(() => {
    const set = new Set<MenuKey>();
    for (const role of rolesKey ? (rolesKey.split(",") as GlobalRole[]) : []) {
      for (const key of DEFAULT_ROLE_MENU[role] ?? []) set.add(key);
    }
    return set;
  }, [rolesKey]);

  const can = (key: MenuKey) => allowedKeys.has(key);

  const canPath = (pathname: string) => {
    // If roles could not be resolved (query error), do not hard-block the app.
    if (rolesUnknown) return true;
    const key = resolveMenuKey(pathname);
    if (!key) return true;
    return allowedKeys.has(key);
  };

  const firstAllowedPath = MENU_ENTRIES.find((e) => allowedKeys.has(e.key))?.to ?? null;

  return { loading, allowedKeys, can, canPath, firstAllowedPath };
}
