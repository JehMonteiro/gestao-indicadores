import { createFileRoute } from "@tanstack/react-router";
import { EntryForm } from "@/components/app/entry-form";

export const Route = createFileRoute("/_authenticated/lancamentos/novo")({
  head: () => ({ meta: [{ title: "Novo lançamento" }] }),
  component: () => <EntryForm escopo="empresa" />,
});
