import { createFileRoute } from "@tanstack/react-router";
import { ChamadosPage } from "@/components/chamados/chamados-page";

export const Route = createFileRoute("/_authenticated/chamados")({
  head: () => ({
    meta: [
      { title: "Chamados | Gestão de Indicadores" },
      { name: "description", content: "Importe planilhas do help desk e acompanhe TMA, TMR, satisfação e cumprimento de prazos dos chamados." },
      { property: "og:title", content: "Chamados — performance do help desk" },
      { property: "og:description", content: "Importação de chamados em .xlsx com painel de KPIs, gráficos e tabela detalhada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChamadosPage,
});
