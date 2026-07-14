import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import noctaIcon from "@/assets/nocta-icon.png.asset.json";
import noctaLogo from "@/assets/nocta-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Entrar — Gestão de Indicadores" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/meu-painel", replace: true });
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error("Não foi possível entrar. Verifique e-mail e senha."); return; }
    toast.success("Bem-vindo(a)!");
    navigate({ to: "/meu-painel", replace: true });
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Digite seu e-mail acima para recuperar a senha.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/definir-senha`,
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível enviar o e-mail de recuperação.");
      return;
    }
    toast.success("E-mail de recuperação enviado. Verifique sua caixa de entrada.");
  };



  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-auth-panel to-auth-panel-deep text-white p-12">
        <div className="flex items-center gap-3">
          <p className="font-semibold">Gestão de Indicadores</p>
          <p className="text-xs opacity-70">Plataforma corporativa</p>
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-6">
            <img src={noctaIcon.url} alt="Nocta Seguros e Benefícios" className="h-32 w-auto object-contain" />
            <img src={noctaLogo.url} alt="Nocta Franquia" className="h-32 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-semibold leading-tight">
            Indicadores, metas e resultados em um só lugar.
          </h1>
          <p className="opacity-80 max-w-md text-sm">
            Acompanhe a performance de cada setor e franquia, com aprovação de
            lançamentos, histórico auditável e dashboards consolidados.
          </p>
        </div>
        <p className="text-xs opacity-60">© 2026</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Acessar plataforma</CardTitle>
              <CardDescription>Entre com sua conta corporativa.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-l">E-mail</Label>
                  <Input id="email-l" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-l">Senha</Label>
                  <Input id="password-l" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-primary underline hover:text-primary/80"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Apenas administradores podem cadastrar novos usuários. Solicite acesso ao seu gestor.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

