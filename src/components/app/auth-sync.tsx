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

// Tables whose row-count is used as a consistency signature to detect
// missed realtime events (RLS-affected users included).
const CONSISTENCY_TABLES = [
  "indicators",
  "targets",
  "indicator_entries",
  "sectors",
  "franchises",
] as const;

type StoreKey = "indicators" | "targets" | "entries" | "sectors" | "franchises";
const STORE_KEY_BY_TABLE: Record<(typeof CONSISTENCY_TABLES)[number], StoreKey> = {
  indicators: "indicators",
  targets: "targets",
  indicator_entries: "entries",
  sectors: "sectors",
  franchises: "franchises",
};

export function AuthSync() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let consistencyInterval: ReturnType<typeof setInterval> | null = null;
    let reconnectAttempts = 0;
    let currentUserId: string | null = null;

    const applyData = (data: Awaited<ReturnType<typeof loadAllFromSupabase>>) => {
      if (!mounted) return;
      useStore.getState().hydrate(data);
      queryClient.invalidateQueries();
    };

    // Compares DB row counts (respecting RLS) against the local store and
    // forces a full reload when they diverge. Cheap: HEAD requests only.
    const verifyConsistency = async (userId: string) => {
      try {
        const results = await Promise.all(
          CONSISTENCY_TABLES.map((table) =>
            supabase.from(table).select("*", { count: "exact", head: true }),
          ),
        );
        if (!mounted) return;
        const state = useStore.getState();
        let diverged = false;
        for (let i = 0; i < CONSISTENCY_TABLES.length; i += 1) {
          const table = CONSISTENCY_TABLES[i];
          const dbCount = results[i].count;
          if (dbCount == null) continue;
          const localCount = (state[STORE_KEY_BY_TABLE[table]] as unknown[]).length;
          if (dbCount !== localCount) {
            // eslint-disable-next-line no-console
            console.warn(
              `[auth-sync:consistency] mismatch on ${table}: db=${dbCount} local=${localCount}`,
            );
            diverged = true;
            break;
          }
        }
        if (diverged) {
          const data = await loadAllFromSupabase(userId);
          applyData(data);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[auth-sync:consistency]", err);
      }
    };

    const scheduleRefresh = (userId: string) => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        loadAllFromSupabase(userId)
          .then((data) => {
            applyData(data);
            // Verify shortly after the refresh so we catch payloads the
            // realtime channel might have dropped (rare, but happens on
            // reconnects).
            void verifyConsistency(userId);
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
