import { createFileRoute } from "@tanstack/react-router";
import { EntryDetail } from "@/components/app/entry-detail";

export const Route = createFileRoute("/_authenticated/lancamentos-franquia/$id")({
  head: () => ({ meta: [{ title: "Lançamento de franquia" }] }),
  component: () => <EntryDetail escopo="franquia" />,
});
