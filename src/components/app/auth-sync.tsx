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

// Tables whose changes should refresh dashboards/KPIs live.
const REALTIME_TABLES = ["indicator_entries", "targets", "indicators"] as const;

export function AuthSync() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = (userId: string) => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        loadAllFromSupabase(userId)
          .then((data) => { if (mounted) useStore.getState().hydrate(data); })
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.error("[auth-sync:realtime-refresh]", err);
          });
      }, 400);
    };

    const subscribeRealtime = (userId: string) => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
      const channel = supabase.channel(`kpi-sync-${userId}`);
      for (const table of REALTIME_TABLES) {
        (channel as unknown as {
          on: (
            type: string,
            filter: { event: string; schema: string; table: string },
            cb: () => void,
          ) => typeof channel;
        }).on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => scheduleRefresh(userId),
        );
      }
      channel.subscribe();
      realtimeChannel = channel;
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session?.user) {
        const uid = data.session.user.id;
        void hydrate(uid, data.session.user.email).then(() => {
          if (mounted) subscribeRealtime(uid);
        });
      } else {
        useStore.getState().clearAll();
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT") {
        useStore.getState().clearAll();
        queryClient.clear();
        if (realtimeChannel) {
          supabase.removeChannel(realtimeChannel);
          realtimeChannel = null;
        }
        router.invalidate();
        return;
      }
      if (session?.user) {
        const uid = session.user.id;
        void hydrate(uid, session.user.email).then(() => {
          if (!mounted) return;
          subscribeRealtime(uid);
          queryClient.invalidateQueries();
          router.invalidate();
        });
      }
    });
    return () => {
      mounted = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
      sub.subscription.unsubscribe();
    };
  }, [router, queryClient]);

  return null;
}
