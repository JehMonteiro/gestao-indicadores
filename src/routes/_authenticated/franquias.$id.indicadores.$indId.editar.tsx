import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { useStore } from "@/mocks/store";
import { FranquiaIndicadorForm } from "@/components/app/franquia-indicador-form";
import { Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/franquias/$id/indicadores/$indId/editar")({
  head: () => ({ meta: [{ title: "Editar indicador da franquia" }] }),
  component: EditarIndicadorFranquia,
});

function EditarIndicadorFranquia() {
  const { id, indId } = Route.useParams();
  const indicators = useStore((s) => s.indicators);
  const existing = indicators.find((i) => i.id === indId);

  if (!existing) {
    return (
      <div>
        <PageHeader title="Editar indicador da franquia" />
        <EmptyState
          title={indicators.length === 0 ? "Carregando indicador…" : "Indicador não encontrado"}
          description={indicators.length === 0 ? "Aguarde a sincronização dos dados." : "Ele pode ter sido removido."}
          icon={<Target className="size-5" />}
          action={<Button asChild><Link to="/franquias/$id" params={{ id }}>Voltar para a franquia</Link></Button>}
        />
      </div>
    );
  }

  return <FranquiaIndicadorForm franchiseId={id} existing={existing} />;
}
