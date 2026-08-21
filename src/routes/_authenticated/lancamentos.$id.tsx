import { createFileRoute } from "@tanstack/react-router";
import { EntryDetail } from "@/components/app/entry-detail";

export const Route = createFileRoute("/_authenticated/lancamentos/$id")({
  head: () => ({ meta: [{ title: "Lançamento" }] }),
  component: () => <EntryDetail escopo="empresa" />,
});
