import { useMemo } from "react";
import { useAuthProfile } from "@/hooks/use-auth";
import { DEFAULT_ROLE_MENU, MENU_ENTRIES, resolveMenuKey, type MenuKey } from "@/lib/menu-registry";
import type { GlobalRole } from "@/mocks/types";

export function useMenuAccess(): {
  loading: boolean;
  allowedKeys: Set<MenuKey>;
  can: (key: MenuKey) => boolean;
  canPath: (pathname: string) => boolean;
  firstAllowedPath: string | null;
} {
  const { data, isLoading } = useAuthProfile();
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
    const key = resolveMenuKey(pathname);
    if (!key) return true;
    return allowedKeys.has(key);
  };

  const firstAllowedPath = MENU_ENTRIES.find((e) => allowedKeys.has(e.key))?.to ?? null;

  return { loading: isLoading, allowedKeys, can, canPath, firstAllowedPath };
}
