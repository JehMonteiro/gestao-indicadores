import { createFileRoute } from "@tanstack/react-router";
import { IndicadoresPage } from "@/components/app/indicadores-page";

export const Route = createFileRoute("/_authenticated/indicadores-franquia")({
  head: () => ({
    meta: [
      { title: "Indicadores Franquia — Gestão de Indicadores" },
      { name: "description", content: "Indicadores da rede franqueada da Nocta Franquia." },
      { property: "og:title", content: "Indicadores Franquia — Gestão de Indicadores" },
      { property: "og:description", content: "Indicadores da rede franqueada da Nocta Franquia." },
    ],
  }),
  component: () => <IndicadoresPage escopo="franquia" />,
});
