import { createFileRoute } from "@tanstack/react-router";
import { MetasPage } from "@/components/app/metas-page";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas — Gestão de Indicadores" },
      { name: "description", content: "Defina metas por período, indicador e empresa." },
      { property: "og:title", content: "Metas — Gestão de Indicadores" },
      { property: "og:description", content: "Defina metas por período, indicador e empresa." },
    ],
  }),
  component: () => <MetasPage escopo="empresa" />,
});
