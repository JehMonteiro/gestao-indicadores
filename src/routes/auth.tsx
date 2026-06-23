import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/mocks/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("gi-store-v1");
      if (raw && JSON.parse(raw)?.state?.currentUserId) {
        throw redirect({ to: "/meu-painel" });
      }
    }
  },
  head: () => ({ meta: [{ title: "Entrar — Gestão de Indicadores" }] }),
  component: AuthPage,
});

const demoRoles: Record<string, string> = {
  superadmin: "Superadministrador",
  admin_corporativo: "Administrador corporativo",
  gestor_setor: "Gestor de setor",
  colaborador: "Colaborador interno",
  gestor_franquia: "Gestor de franquia",
  franqueado: "Franqueado",
  auditor: "Auditor / visualizador",
};

function AuthPage() {
  const profiles = useStore((s) => s.profiles);
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const enterAs = (id: string, name: string) => {
    setCurrentUser(id);
    toast.success(`Bem-vindo(a), ${name}`);
    navigate({ to: "/meu-painel" });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (!found) {
      toast.error("Usuário não encontrado nos dados de demonstração");
      return;
    }
    enterAs(found.id, found.full_name);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-sidebar text-sidebar-foreground p-12">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-md bg-sidebar-primary grid place-items-center">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="font-semibold">Gestão de Indicadores</p>
            <p className="text-xs opacity-70">Plataforma corporativa</p>
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            Indicadores, metas e resultados em um só lugar.
          </h1>
          <p className="opacity-80 max-w-md text-sm">
            Acompanhe a performance de cada setor e franquia, com aprovação de
            lançamentos, histórico auditável e dashboards consolidados.
          </p>
        </div>
        <p className="text-xs opacity-60">© {new Date().getFullYear()} — Versão de demonstração</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Entrar</CardTitle>
              <CardDescription>Acesse com seu e-mail corporativo.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" placeholder="voce@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Recuperação de senha e primeiro acesso disponíveis na versão completa.</p>
                </div>
                <Button type="submit" className="w-full">Entrar</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entrar como (demonstração)</CardTitle>
              <CardDescription>Experimente cada perfil para ver as permissões.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => enterAs(p.id, p.full_name)}
                  className="w-full flex items-center justify-between rounded-md border border-transparent hover:border-border hover:bg-muted/50 px-3 py-2 text-left transition"
                >
                  <div>
                    <p className="text-sm font-medium">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground">{demoRoles[p.global_role]} · {p.email}</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
// touch
