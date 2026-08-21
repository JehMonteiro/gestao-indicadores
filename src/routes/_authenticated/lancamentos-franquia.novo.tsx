import { createFileRoute } from "@tanstack/react-router";
import { EntryForm } from "@/components/app/entry-form";

export const Route = createFileRoute("/_authenticated/lancamentos-franquia/novo")({
  head: () => ({ meta: [{ title: "Novo lançamento de franquia" }] }),
  component: () => <EntryForm escopo="franquia" />,
});
