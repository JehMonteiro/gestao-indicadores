import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { useStore, useCurrentUser } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadAllFromSupabase } from "@/lib/supabase-data";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const hydrate = useStore((s) => s.hydrate);
  const user = useCurrentUser();
  const [local, setLocal] = useState(settings);
  const [busy, setBusy] = useState<"seed" | "clear" | null>(null);

  if (user?.global_role !== "superadmin") {
    return (
      <div>
        <PageHeader title="Configurações" description="Apenas o superadministrador pode alterar configurações do sistema." />
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Você não tem permissão para acessar esta área.</CardContent></Card>
      </div>
    );
  }

  async function refresh() {
    if (!user) return;
    const data = await loadAllFromSupabase(user.id);
    hydrate(data);
  }

  async function seedDemo() {
    setBusy("seed");
    const { error } = await supabase.rpc("seed_demo_data" as any);
    setBusy(null);
    if (error) { toast.error("Não foi possível carregar os dados de demonstração."); return; }
    await refresh();
    toast.success("Dados de demonstração carregados");
  }

  async function clearDemo() {
    setBusy("clear");
    const { error } = await supabase.rpc("clear_demo_data" as any);
    setBusy(null);
    if (error) { toast.error("Não foi possível limpar os dados de demonstração."); return; }
    await refresh();
    toast.success("Dados de demonstração removidos");
  }

  return (
    <div>
      <PageHeader title="Configurações" description="Parâmetros gerais e classificação de desempenho." />
      <div className="grid lg:grid-cols-2 gap-4 max-w-4xl">
        <Card>
          <CardHeader><CardTitle className="text-base">Identidade</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Nome da plataforma</Label><Input value={local.platform_name} onChange={(e) => setLocal({ ...local, platform_name: e.target.value })} /></div>
            <Button onClick={() => { update(local); toast.success("Configurações salvas"); }}>Salvar</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Classificação de desempenho</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Atingido (% a partir de)</Label><Input type="number" value={local.achieved_threshold} onChange={(e) => setLocal({ ...local, achieved_threshold: Number(e.target.value) })} /></div>
            <div><Label>Em atenção (% a partir de)</Label><Input type="number" value={local.warning_threshold} onChange={(e) => setLocal({ ...local, warning_threshold: Number(e.target.value) })} /></div>
            <p className="text-xs text-muted-foreground">Crítico: abaixo do limite de atenção. Sem informação: indicador sem lançamento.</p>
            <Button onClick={() => { update(local); toast.success("Configurações salvas"); }}>Salvar</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Dados de demonstração</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Carrega setores, franquias, indicadores, metas e lançamentos de exemplo para experimentar o sistema.
              Tudo fica marcado como demo e pode ser removido a qualquer momento.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={seedDemo} disabled={busy !== null}>
                {busy === "seed" ? "Carregando..." : "Carregar dados de demonstração"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={busy !== null}>
                    {busy === "clear" ? "Removendo..." : "Limpar dados de demonstração"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover dados de demonstração?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Todos os registros marcados como demo serão apagados. Dados reais não serão afetados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={clearDemo}>Confirmar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
