import { createFileRoute } from "@tanstack/react-router";
import { MetasPage } from "@/components/app/metas-page";

export const Route = createFileRoute("/_authenticated/metas-franquia")({
  head: () => ({
    meta: [
      { title: "Metas Franquia — Gestão de Indicadores" },
      { name: "description", content: "Metas das unidades franqueadas por período e indicador." },
      { property: "og:title", content: "Metas Franquia — Gestão de Indicadores" },
      { property: "og:description", content: "Metas das unidades franqueadas por período e indicador." },
    ],
  }),
  component: () => <MetasPage escopo="franquia" />,
});
