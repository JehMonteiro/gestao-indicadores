import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { useStore } from "@/mocks/store";
import { useVisibleIndicators } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { classify, classificationStyles, computeAchievement, formatValue, indicatorPeriodLabel } from "@/lib/format";
import { Plus, Search, Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/indicadores/")({
  head: () => ({ meta: [{ title: "Indicadores — Gestão de Indicadores" }] }),
  component: IndicatorsList,
});

function IndicatorsList() {
  const indicators = useVisibleIndicators();
  const sectors = useStore((s) => s.sectors);
  const targets = useStore((s) => s.targets);
  const entries = useStore((s) => s.entries);
  const settings = useStore((s) => s.settings);

  const [q, setQ] = useState("");
  const [sectorId, setSectorId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const filtered = indicators.filter((i) =>
    (q === "" || i.name.toLowerCase().includes(q.toLowerCase()) || i.code.toLowerCase().includes(q.toLowerCase())) &&
    (sectorId === "all" || i.owner_sector_id === sectorId) &&
    (status === "all" || i.status === status)
  );

  return (
    <div>
      <PageHeader title="Indicadores" description="Catálogo de indicadores por setor."
        actions={<Button asChild><Link to="/indicadores/novo"><Plus className="size-4" />Novo indicador</Link></Button>}
      />

      <Card className="mb-4">
        <CardContent className="p-3 grid sm:grid-cols-[1fr_auto_auto] gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou código..." className="pl-8" />
          </div>
          <Select value={sectorId} onValueChange={setSectorId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Setor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="pausado">Pausado</SelectItem>
              <SelectItem value="arquivado">Arquivado</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum indicador encontrado" description="Ajuste os filtros ou crie um novo indicador." icon={<Target className="size-5" />} />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Indicador</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Periodicidade</TableHead>
                <TableHead>Último resultado</TableHead>
                <TableHead>Atingimento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((i) => {
                const sector = sectors.find((s) => s.id === i.owner_sector_id);
                const t = targets.filter((t) => t.indicator_id === i.id).slice(-1)[0];
                const e = entries.filter((e) => e.indicator_id === i.id && e.status === "aprovado").slice(-1)[0];
                const pct = computeAchievement(e, t, i.direction);
                const c = classify(pct, settings);
                const cs = classificationStyles(c);
                return (
                  <TableRow key={i.id} className="cursor-pointer">
                    <TableCell className="font-mono text-xs">{i.code}</TableCell>
                    <TableCell>
                      <Link to="/indicadores/$id" params={{ id: i.id }} className="hover:underline font-medium">{i.name}</Link>
                    </TableCell>
                    <TableCell>{sector && <Badge variant="outline" style={{ borderColor: sector.color, color: sector.color }}>{sector.name}</Badge>}</TableCell>
                    <TableCell className="text-sm">{indicatorPeriodLabel(i)}</TableCell>
                    <TableCell className="font-mono text-sm">{e ? formatValue(e.actual_value, i.value_type, i.unit) : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={cs.className}>{pct != null ? `${Math.round(pct)}% · ${cs.label}` : cs.label}</Badge></TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{i.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
