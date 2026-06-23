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

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const reset = useStore((s) => s.resetDemoData);
  const user = useCurrentUser();
  const [local, setLocal] = useState(settings);

  if (user?.global_role !== "superadmin") {
    return (
      <div>
        <PageHeader title="Configurações" description="Apenas o superadministrador pode alterar configurações do sistema." />
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Você não tem permissão para acessar esta área.</CardContent></Card>
      </div>
    );
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

        <Card className="lg:col-span-2 border-destructive/40">
          <CardHeader><CardTitle className="text-base text-destructive">Dados de demonstração</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Reseta todos os setores, franquias, indicadores, metas, lançamentos e logs para o estado inicial de demonstração. Útil antes da integração com o backend real.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="destructive">Resetar dados de demonstração</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar reset?</AlertDialogTitle>
                  <AlertDialogDescription>Todos os dados serão substituídos pelos dados iniciais de exemplo. Esta ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { reset(); toast.success("Dados resetados"); }}>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
