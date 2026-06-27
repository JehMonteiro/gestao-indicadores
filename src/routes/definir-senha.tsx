import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/definir-senha")({
  ssr: false,
  head: () => ({ meta: [{ title: "Definir senha — Gestão de Indicadores" }] }),
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase places the invite/recovery token in the URL hash.
    // onAuthStateChange handles the implicit session automatically.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setSessionReady(true);
      } else if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível definir a senha. O link pode ter expirado.");
      return;
    }
    toast.success("Senha definida com sucesso!");
    navigate({ to: "/meu-painel", replace: true });
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
            Defina sua senha de acesso.
          </h1>
          <p className="opacity-80 max-w-md text-sm">
            Escolha uma senha segura para acessar a plataforma de indicadores e metas.
          </p>
        </div>
        <p className="text-xs opacity-60">© 2026</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Criar senha</CardTitle>
              <CardDescription>Escolha sua senha de acesso corporativo.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !sessionReady}>
                  {loading ? "Salvando..." : sessionReady ? "Definir senha e entrar" : "Carregando convite..."}
                </Button>
                {!sessionReady && (
                  <p className="text-xs text-muted-foreground text-center">
                    O link de convite parece inválido ou expirado. Peça um novo convite ou use "Esqueci minha senha" no login.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
