import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("gi-store-v1");
    const id = raw ? JSON.parse(raw)?.state?.currentUserId : null;
    if (!id) throw redirect({ to: "/auth" });
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
