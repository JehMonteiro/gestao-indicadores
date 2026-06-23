import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/mocks/store";
import { loadAllFromSupabase, loadProfileAndRole } from "@/lib/supabase-data";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

async function hydrate(userId: string, email?: string) {
  const { profile } = await loadProfileAndRole(userId, email);
  useStore.getState().upsertProfile(profile);
  useStore.getState().setCurrentUser(userId);
  try {
    const data = await loadAllFromSupabase(userId);
    useStore.getState().hydrate(data);
    // make sure my own profile is in the merged list
    useStore.getState().upsertProfile(profile);
    useStore.getState().setCurrentUser(userId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[auth-sync:hydrate]", err);
  }
}

export function AuthSync() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session?.user) {
        void hydrate(data.session.user.id, data.session.user.email);
      } else {
        useStore.getState().clearAll();
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT") {
        useStore.getState().clearAll();
        queryClient.clear();
        router.invalidate();
        return;
      }
      if (session?.user) {
        void hydrate(session.user.id, session.user.email).then(() => {
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
