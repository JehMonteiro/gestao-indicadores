import { createFileRoute } from "@tanstack/react-router";
import { LancamentosPage } from "@/components/app/lancamentos-page";

export const Route = createFileRoute("/_authenticated/lancamentos-franquia")({
  head: () => ({
    meta: [
      { title: "Lançamentos Franquia — Gestão de Indicadores" },
      { name: "description", content: "Registros de resultados das unidades franqueadas." },
      { property: "og:title", content: "Lançamentos Franquia — Gestão de Indicadores" },
      { property: "og:description", content: "Registros de resultados das unidades franqueadas." },
    ],
  }),
  component: () => <LancamentosPage escopo="franquia" />,
});
