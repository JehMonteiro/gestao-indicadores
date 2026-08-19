import { useMemo, useState } from "react";
import { Inbox, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { ChamadosFiltros } from "@/components/chamados/chamados-filtros";
import { ChamadosGraficos } from "@/components/chamados/chamados-graficos";
import { ChamadosHistoricoLotes } from "@/components/chamados/chamados-historico-lotes";
import { ChamadosImportDialog } from "@/components/chamados/chamados-import-dialog";
import { ChamadosKPICards } from "@/components/chamados/chamados-kpi-cards";
import { ChamadosTabela } from "@/components/chamados/chamados-tabela";
import { aplicarFiltros, calcularKPIs, useChamadosTodos, useLotesChamados } from "@/hooks/use-chamados";
import { useCurrentUser } from "@/mocks/store";
import type { FiltrosChamados } from "@/types/chamados";

export function ChamadosPage() {
  const [filtros, setFiltros] = useState<FiltrosChamados>({});
  const [importOpen, setImportOpen] = useState(false);
  const user = useCurrentUser();
  const podeExcluir = user?.global_role === "superadmin" || user?.global_role === "admin_corporativo";

  const { data: todos = [], isLoading } = useChamadosTodos();
  const filtrados = useMemo(() => aplicarFiltros(todos, filtros), [todos, filtros]);
  const kpis = useMemo(() => calcularKPIs(filtrados), [filtrados]);
  const { data: lotes = [] } = useLotesChamados(todos);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chamados"
        description={`Importação e análise de performance do help desk${todos.length ? ` · ${todos.length} registros importados` : ""}`}
        actions={
          <Button onClick={() => setImportOpen(true)} aria-label="Importar arquivo Excel de chamados">
            <Upload className="size-4 mr-2" /> Importar Excel
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : todos.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-6 text-muted-foreground" />}
          title="Nenhum chamado importado"
          description="Faça o upload do arquivo .xlsx gerado pelo seu sistema de help desk para visualizar os indicadores de performance."
          action={
            <Button onClick={() => setImportOpen(true)}>
              <Upload className="size-4 mr-2" /> Importar primeiro arquivo
            </Button>
          }
        />
      ) : (
        <>
          <ChamadosFiltros todos={todos} filtros={filtros} onChange={setFiltros} totalFiltrado={filtrados.length} />
          <ChamadosKPICards kpis={kpis} />
          <ChamadosGraficos chamados={filtrados} />
          <ChamadosHistoricoLotes lotes={lotes} podeExcluir={podeExcluir} />
          <ChamadosTabela chamados={filtrados} />
        </>
      )}

      <ChamadosImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
