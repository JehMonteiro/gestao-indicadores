import { createFileRoute } from "@tanstack/react-router";
import { LancamentosPage } from "@/components/app/lancamentos-page";

export const Route = createFileRoute("/_authenticated/lancamentos/")({
  head: () => ({
    meta: [
      { title: "Lançamentos — Gestão de Indicadores" },
      { name: "description", content: "Histórico e registro de resultados dos indicadores." },
      { property: "og:title", content: "Lançamentos — Gestão de Indicadores" },
      { property: "og:description", content: "Histórico e registro de resultados dos indicadores." },
    ],
  }),
  component: () => <LancamentosPage escopo="empresa" />,
});
