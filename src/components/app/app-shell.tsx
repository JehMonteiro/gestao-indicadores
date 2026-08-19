import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, User2, ListChecks, ClipboardEdit, ClipboardCheck, Building2,
  Store, Target, Crosshair, Flag, FlagTriangleRight, Network, FileBarChart, Users, History, Settings,
  Activity, Menu, LogOut, Bell, ChevronsUpDown, ShieldCheck,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { canSeeRoute, useCurrentUser, useStore } from "@/mocks/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Marca o item como par "Franquia" do item anterior (divisória sutil acima). */
  pairTop?: boolean;
};

const NAV: { group: string; items: NavItem[] }[] = [
  { group: "Acompanhamento", items: [
    { to: "/visao-geral", label: "Visão geral", icon: Activity },
    { to: "/meu-painel", label: "Meu painel", icon: LayoutDashboard },
    { to: "/meus-indicadores", label: "Meus indicadores", icon: ListChecks },
    { to: "/desempenho-franquias", label: "Franquias", icon: Store },
  ]},
  { group: "Operação", items: [
    { to: "/lancamentos", label: "Lançamentos", icon: ClipboardEdit },
    { to: "/lancamentos-franquia", label: "Lançamentos Franquia", icon: ClipboardCheck },
  ]},
  { group: "Estrutura", items: [
    { to: "/indicadores", label: "Indicadores", icon: Target },
    { to: "/indicadores-franquia", label: "Indicadores Franquia", icon: Crosshair },
    { to: "/metas", label: "Metas", icon: Flag },
    { to: "/metas-franquia", label: "Metas Franquia", icon: FlagTriangleRight },
    { to: "/setores", label: "Setores", icon: Building2 },
    { to: "/franquias", label: "Empresas / Franquias", icon: Network },
    { to: "/usuarios", label: "Usuários", icon: Users },
  ]},
  { group: "Sistema", items: [
    { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
    { to: "/auditoria", label: "Auditoria", icon: History },
    { to: "/configuracoes", label: "Configurações", icon: Settings },
  ]},
];


function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useCurrentUser();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const role = user?.global_role;
  return (
    <aside className="h-full flex flex-col bg-gradient-to-br from-auth-panel to-auth-panel-deep text-white w-64 border-r border-white/20">
      <div className="px-5 py-4 flex items-center gap-2 border-b border-white/20">
        <div className="size-8 rounded-md bg-white/20 grid place-items-center">
          <ShieldCheck className="size-4" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Indicadores</p>
          <p className="text-[10px] uppercase tracking-wider opacity-60">Plataforma corporativa</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV.map((g) => {
          const items = g.items.filter((i) => canSeeRoute(role, i.to));
          if (!items.length) return null;
          return (
            <div key={g.group}>
              <p className="px-3 mb-1 text-[10px] uppercase tracking-wider opacity-50 font-medium">{g.group}</p>
              <ul className="space-y-0.5">
                {items.map((it, idx) => {
                  const active = pathname === it.to || pathname.startsWith(it.to + "/");
                  return (
                    <li key={it.to} className={cn(it.pairTop && idx > 0 && "border-t border-white/10 pt-0.5 mt-0.5")}>

                      <Link
                        to={it.to}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition",
                          active
                            ? "bg-white/20 text-white font-medium"
                            : "hover:bg-white/15",
                        )}
                      >
                        <it.icon className="size-4 shrink-0" />
                        <span className="truncate">{it.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/20 text-[11px] opacity-60">
        v1.0 · Demonstração
      </div>
    </aside>
  );
}

function ContextSwitcher() {
  const user = useCurrentUser();
  const sectors = useStore((s) => s.sectors);
  const userSectors = useStore((s) => s.userSectors);
  const activeSectorId = useStore((s) => s.activeSectorId);
  const setActiveSector = useStore((s) => s.setActiveSector);
  const setActiveFranchise = useStore((s) => s.setActiveFranchise);

  if (!user) return null;
  const isAdmin = user.global_role === "superadmin" || user.global_role === "admin_corporativo";
  const mySectors = isAdmin ? sectors : sectors.filter((s) => userSectors.some((us) => us.user_id === user.id && us.sector_id === s.id));

  if (mySectors.length <= 1) return null;

  const activeSector = sectors.find((s) => s.id === activeSectorId);

  const label = activeSector?.name ?? "Todos os contextos";


  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 max-w-[260px]">
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="size-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="p-2">
          <button
            onClick={() => { setActiveSector(null); setActiveFranchise(null); }}
            className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted"
          >
            Todos os contextos
          </button>
        </div>
        {mySectors.length > 0 && (
          <div className="border-t p-2">
            <p className="px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Setores</p>
            {mySectors.map((s) => (
              <button key={s.id} onClick={() => { setActiveSector(s.id); setActiveFranchise(null); }}
                className={cn("w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted",
                  activeSectorId === s.id && "bg-muted font-medium")}>
                {s.name}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function NotificationsBell() {
  const user = useCurrentUser();
  const notifications = useStore((s) => s.notifications).filter((n) => n.user_id === user?.id);
  const markRead = useStore((s) => s.markNotificationRead);
  const unread = notifications.filter((n) => !n.read_at).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-4 text-[10px] grid place-items-center rounded-full bg-destructive text-destructive-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <p className="text-sm font-medium">Notificações</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma notificação.</p>
          ) : notifications.map((n) => (
            <button key={n.id} onClick={() => markRead(n.id)}
              className={cn("w-full text-left p-3 border-b hover:bg-muted", !n.read_at && "bg-muted/40")}>
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-xs text-muted-foreground">{n.message}</p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function UserMenu() {
  const user = useCurrentUser();
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const navigate = useNavigate();
  if (!user) return null;

  const signOut = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
    setCurrentUser(null);
    toast.success("Sessão encerrada");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted">
          <Avatar className="size-8"><AvatarFallback className="text-xs">{initials(user.full_name)}</AvatarFallback></Avatar>
          <div className="hidden sm:block text-left leading-tight">
            <p className="text-sm font-medium">{user.full_name}</p>
            <p className="text-[10px] text-muted-foreground">{user.email}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">{user.global_role.replaceAll("_", " ")}</Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/perfil" })}>
          <User2 className="size-4 mr-2" /> Meu perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="size-4 mr-2" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="h-screen w-full flex bg-background">
      <div className="hidden lg:block h-full">
        <Sidebar />
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-gradient-to-br from-auth-panel to-auth-panel-deep text-white">
          <Sidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="h-14 border-b bg-card flex items-center px-3 lg:px-6 gap-2 sticky top-0 z-20">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <ContextSwitcher />
            <div className="flex-1" />
            <NotificationsBell />
            <UserMenu />
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 max-w-[1400px] mx-auto w-full">{children}</div>
          </main>
        </div>
      </Sheet>
    </div>
  );
}
