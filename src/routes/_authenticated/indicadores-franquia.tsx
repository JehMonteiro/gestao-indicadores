import { createFileRoute } from "@tanstack/react-router";
import { IndicadoresPage } from "@/components/app/indicadores-page";

export const Route = createFileRoute("/_authenticated/indicadores-franquia")({
  head: () => ({
    meta: [
      { title: "Indicadores Franquia — Gestão de Indicadores" },
      { name: "description", content: "Catálogo de indicadores das unidades franqueadas." },
      { property: "og:title", content: "Indicadores Franquia — Gestão de Indicadores" },
      { property: "og:description", content: "Catálogo de indicadores das unidades franqueadas." },
    ],
  }),
  component: () => <IndicadoresPage escopo="franquia" />,
});
