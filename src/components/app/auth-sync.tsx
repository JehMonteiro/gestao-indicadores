import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/mocks/store";
import type { GlobalRole, Profile } from "@/mocks/types";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

const ROLE_ORDER: GlobalRole[] = [
  "superadmin",
  "admin_corporativo",
  "gestor_setor",
  "gestor_franquia",
  "colaborador",
  "franqueado",
  "auditor",
];

async function syncProfileFromSupabase(userId: string, email: string | undefined) {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  const list = (roles ?? []).map((r) => r.role as string);
  const role = (ROLE_ORDER.find((r) => list.includes(r)) ?? "colaborador") as GlobalRole;
  const merged: Profile = {
    id: userId,
    full_name: profile?.full_name || email?.split("@")[0] || "Usuário",
    email: profile?.email || email || "",
    avatar_url: profile?.avatar_url ?? undefined,
    global_role: role,
    user_type: role === "franqueado" || role === "gestor_franquia" ? "franqueado" : "interno",
    status: (profile?.status as "ativo" | "inativo") ?? "ativo",
    created_at: profile?.created_at ?? new Date().toISOString(),
  };
  useStore.getState().upsertProfile(merged);
  useStore.getState().setCurrentUser(userId);
}

export function AuthSync() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session?.user) {
        void syncProfileFromSupabase(data.session.user.id, data.session.user.email);
      } else {
        useStore.getState().setCurrentUser(null);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT") {
        useStore.getState().setCurrentUser(null);
        queryClient.clear();
        router.invalidate();
        return;
      }
      if (session?.user) {
        void syncProfileFromSupabase(session.user.id, session.user.email).then(() => {
          queryClient.invalidateQueries();
          router.invalidate();
        });
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router, queryClient]);

  return null;
}
