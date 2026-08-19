import { createFileRoute } from "@tanstack/react-router";
import { IndicadoresPage } from "@/components/app/indicadores-page";

export const Route = createFileRoute("/_authenticated/indicadores/")({
  head: () => ({
    meta: [
      { title: "Indicadores — Gestão de Indicadores" },
      { name: "description", content: "Catálogo de indicadores por setor, com metas, resultados e atingimento." },
      { property: "og:title", content: "Indicadores — Gestão de Indicadores" },
      { property: "og:description", content: "Catálogo de indicadores por setor, com metas, resultados e atingimento." },
    ],
  }),
  component: () => <IndicadoresPage escopo="empresa" />,
});
