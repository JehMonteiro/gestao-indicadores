import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/setores/$id")({
  head: () => ({ meta: [{ title: "Setor" }] }),
  component: SectorDetail,
});

function SectorDetail() {
  const { id } = Route.useParams();
  const sectors = useStore((s) => s.sectors);
  const userSectors = useStore((s) => s.userSectors);
  const indicators = useStore((s) => s.indicators);
  const profiles = useStore((s) => s.profiles);
  const sector = sectors.find((s) => s.id === id);
  if (!sector) throw notFound();
  const members = userSectors.filter((us) => us.sector_id === id);
  const sectorIndicators = indicators.filter((i) => i.owner_sector_id === id);
  return (
    <div>
      <PageHeader title={sector.name} description={sector.description}
        actions={<Button variant="outline" asChild><Link to="/setores">Voltar</Link></Button>}
      />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Membros</CardTitle></CardHeader>
          <CardContent><Table>
            <TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Papel</TableHead></TableRow></TableHeader>
            <TableBody>
              {members.map((m) => {
                const p = profiles.find((p) => p.id === m.user_id);
                return <TableRow key={m.id}><TableCell>{p?.full_name}</TableCell><TableCell><Badge variant="outline" className="capitalize">{m.sector_role}</Badge></TableCell></TableRow>;
              })}
            </TableBody>
          </Table></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Indicadores do setor</CardTitle></CardHeader>
          <CardContent><Table>
            <TableHeader><TableRow><TableHead>Indicador</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {sectorIndicators.map((i) => (
                <TableRow key={i.id}>
                  <TableCell><Link to="/indicadores/$id" params={{ id: i.id }} className="hover:underline">{i.name}</Link></TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{i.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></CardContent>
        </Card>
      </div>
    </div>
  );
}
