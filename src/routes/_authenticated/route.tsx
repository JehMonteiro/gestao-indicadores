import { createFileRoute, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { useMenuAccess } from "@/hooks/use-menu-access";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { userId: data.user.id };
  },
  component: () => (
    <AppShell>
      <MenuGuard />
    </AppShell>
  ),
});

function MenuGuard() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { loading, canPath, firstAllowedPath } = useMenuAccess();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 rounded bg-muted animate-pulse" />
        <div className="h-4 w-80 rounded bg-muted animate-pulse" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!canPath(pathname)) {
    const target = firstAllowedPath ?? "/perfil";
    return (
      <div>
        <PageHeader title="Acesso restrito" description="Esta área não faz parte do seu perfil de acesso." />
        <EmptyState
          title="Você não tem acesso a esta área"
          description="Fale com um administrador se você precisar acessar esta página."
          icon={<ShieldAlert className="size-5" />}
          action={<Button onClick={() => navigate({ to: target })}>Ir para uma área disponível</Button>}
        />
      </div>
    );
  }

  return <Outlet />;
}
