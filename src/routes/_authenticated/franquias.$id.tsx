import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/franquias/$id")({
  head: () => ({ meta: [{ title: "Franquia" }] }),
  component: FranchiseDetail,
});

function FranchiseDetail() {
  const { id } = Route.useParams();
  const franchises = useStore((s) => s.franchises);
  const f = franchises.find((x) => x.id === id);
  const profiles = useStore((s) => s.profiles);
  const userFranchises = useStore((s) => s.userFranchises);
  const indicators = useStore((s) => s.indicators);
  // A loja hidrata de forma assíncrona: não declarar 404 antes dos dados chegarem.
  if (!f) {
    if (franchises.length === 0) {
      return (
        <div>
          <PageHeader title="Carregando franquia…" description="Buscando os dados da unidade." />
        </div>
      );
    }
    throw notFound();
  }
  const members = userFranchises.filter((uf) => uf.franchise_id === id);
  const unitIndicators = indicators.filter((i) => i.entity_scope === "franquia" && i.entity_id === id);
  return (
    <div>
      <PageHeader title={f.name} description={`${f.city}/${f.state} · ${f.region}`}
        actions={<Button variant="outline" asChild><Link to="/franquias">Voltar</Link></Button>}
      />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados cadastrais</CardTitle></CardHeader>
          <CardContent className="text-sm grid grid-cols-2 gap-3">
            <div><p className="text-xs uppercase text-muted-foreground">Código</p>{f.code}</div>
            <div><p className="text-xs uppercase text-muted-foreground">Status</p><Badge variant="secondary" className="capitalize">{f.status}</Badge></div>
            <div><p className="text-xs uppercase text-muted-foreground">CNPJ</p>{f.document ?? "—"}</div>
            <div><p className="text-xs uppercase text-muted-foreground">Início</p>{formatDate(f.start_date)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Vínculos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {members.map((m) => {
              const p = profiles.find((p) => p.id === m.user_id);
              return <div key={m.id} className="flex items-center justify-between border rounded-md p-2"><span>{p?.full_name}</span><Badge variant="outline" className="capitalize">{m.franchise_role}</Badge></div>;
            })}
            {members.length === 0 && <p className="text-sm text-muted-foreground">Nenhum vínculo.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Indicadores da unidade</CardTitle>
          <Button size="sm" asChild>
            <Link to="/indicadores/novo" search={{ escopo: "franquia" as const, unidade: id, empresa: f.name }}>Novo indicador</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {unitIndicators.map((i) => (
            <Link
              key={i.id}
              to="/indicadores/$id"
              params={{ id: i.id }}
              className="flex items-center justify-between gap-3 border rounded-md p-2 text-sm hover:bg-muted/50"
            >
              <span className="min-w-0">
                <span className="block truncate">{i.name}</span>
                <span className="block text-xs text-muted-foreground">{i.code}</span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="capitalize">{i.kpi_group ?? "resultado"}</Badge>
                <Badge variant="secondary" className="capitalize">{i.status}</Badge>
              </span>
            </Link>
          ))}
          {unitIndicators.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum indicador cadastrado para esta unidade.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
