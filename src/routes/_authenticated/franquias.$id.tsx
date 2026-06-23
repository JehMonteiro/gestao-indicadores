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
  const f = useStore((s) => s.franchises).find((x) => x.id === id);
  const profiles = useStore((s) => s.profiles);
  const userFranchises = useStore((s) => s.userFranchises);
  if (!f) throw notFound();
  const members = userFranchises.filter((uf) => uf.franchise_id === id);
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
    </div>
  );
}
