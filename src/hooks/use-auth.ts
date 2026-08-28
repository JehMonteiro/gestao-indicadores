import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { GlobalRole } from "@/mocks/types";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export function useAuthProfile() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["auth-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const order: GlobalRole[] = [
        "superadmin",
        "admin_corporativo",
        "gestor_setor",
        "gestor_franquia",
        "analista",
        "colaborador",
        "franqueado",
        "auditor",
      ];
      const list = (roles ?? []).map((r) => r.role as GlobalRole);
      const role = order.find((r) => list.includes(r)) ?? "colaborador";
      return { profile, role, roles: list, user: user as User };
    },
  });
}
