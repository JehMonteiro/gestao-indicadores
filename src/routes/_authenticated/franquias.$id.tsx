import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/franquias/$id")({
  head: () => ({ meta: [{ title: "Franquia" }] }),
  component: () => <Outlet />,
});
