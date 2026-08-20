import { createFileRoute } from "@tanstack/react-router";
import { FranquiaIndicadorForm } from "@/components/app/franquia-indicador-form";

export const Route = createFileRoute("/_authenticated/franquias/$id/indicadores/novo")({
  head: () => ({ meta: [{ title: "Novo indicador da franquia" }] }),
  component: NovoIndicadorFranquia,
});

function NovoIndicadorFranquia() {
  const { id } = Route.useParams();
  return <FranquiaIndicadorForm franchiseId={id} />;
}
