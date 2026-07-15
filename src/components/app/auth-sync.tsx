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

// All business tables that must trigger a store refresh when changed
// anywhere (this tab, another tab, another user, or a backend job).
const REALTIME_TABLES = [
  "indicator_entries",
  "targets",
  "indicators",
  "sectors",
  "franchises",
  "user_sectors",
  "user_franchises",
  "profiles",
  "user_roles",
  "notifications",
  "app_settings",
] as const;

export function AuthSync() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    let currentUserId: string | null = null;

    const scheduleRefresh = (userId: string) => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        loadAllFromSupabase(userId)
          .then((data) => {
            if (!mounted) return;
            useStore.getState().hydrate(data);
            // Wake up any React Query consumers (auth profile, etc.)
            queryClient.invalidateQueries();
          })
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
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          reconnectAttempts = 0;
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (!mounted) return;
          const delay = Math.min(30000, 1000 * 2 ** reconnectAttempts);
          reconnectAttempts += 1;
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            if (!mounted || !currentUserId) return;
            subscribeRealtime(currentUserId);
            // Also do a one-shot refresh so we don't miss changes that
            // happened while the channel was down.
            scheduleRefresh(currentUserId);
          }, delay);
        }
      });
      realtimeChannel = channel;
    };

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!currentUserId) return;
      // Force a fresh pull and make sure the channel is alive.
      scheduleRefresh(currentUserId);
    };
    document.addEventListener("visibilitychange", onVisibility);

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session?.user) {
        const uid = data.session.user.id;
        currentUserId = uid;
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
        currentUserId = null;
        if (realtimeChannel) {
          supabase.removeChannel(realtimeChannel);
          realtimeChannel = null;
        }
        router.invalidate();
        return;
      }
      if (session?.user) {
        const uid = session.user.id;
        currentUserId = uid;
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
      document.removeEventListener("visibilitychange", onVisibility);
      if (refreshTimer) clearTimeout(refreshTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
      sub.subscription.unsubscribe();
    };
  }, [router, queryClient]);

  return null;
}
