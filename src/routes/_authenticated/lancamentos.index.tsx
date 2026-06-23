import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { useStore } from "@/mocks/store";
import { useVisibleIndicators } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatValue } from "@/lib/format";
import { ClipboardEdit, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lancamentos/")({
  head: () => ({ meta: [{ title: "Lançamentos" }] }),
  component: EntriesList,
});

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground border-border",
  enviado: "bg-info/15 text-info-foreground border-info/30",
  aprovado: "bg-success/15 text-success border-success/30",
  rejeitado: "bg-destructive/15 text-destructive border-destructive/30",
  atrasado: "bg-warning/15 text-warning-foreground border-warning/30",
};

function EntriesList() {
  const indicators = useVisibleIndicators();
  const indIds = indicators.map((i) => i.id);
  const entries = useStore((s) => s.entries).filter((e) => indIds.includes(e.indicator_id));
  const [status, setStatus] = useState("all");
  const filtered = entries.filter((e) => status === "all" || e.status === status)
    .sort((a, b) => b.period_end.localeCompare(a.period_end));

  return (
    <div>
      <PageHeader title="Lançamentos" description="Histórico e novos lançamentos de resultados."
        actions={<Button asChild><Link to="/lancamentos/novo"><Plus className="size-4" />Novo lançamento</Link></Button>}
      />

      <Card className="mb-4"><CardContent className="p-3 flex gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="rejeitado">Rejeitado</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
          </SelectContent>
        </Select>
      </CardContent></Card>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum lançamento" description="Comece registrando o resultado de um indicador." icon={<ClipboardEdit className="size-5" />}
          action={<Button asChild><Link to="/lancamentos/novo">Novo lançamento</Link></Button>} />
      ) : (
        <Card><Table>
          <TableHeader><TableRow>
            <TableHead>Indicador</TableHead>
            <TableHead>Período</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Lançado em</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((e) => {
              const ind = indicators.find((i) => i.id === e.indicator_id);
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{ind?.name}</TableCell>
                  <TableCell>{formatDate(e.period_start)} — {formatDate(e.period_end)}</TableCell>
                  <TableCell className="font-mono">{formatValue(e.actual_value, ind?.value_type ?? "inteiro", ind?.unit)}</TableCell>
                  <TableCell>{formatDate(e.updated_at)}</TableCell>
                  <TableCell><Badge variant="outline" className={`capitalize ${statusColors[e.status]}`}>{e.status}</Badge></TableCell>
                  <TableCell><Link to="/lancamentos/$id" params={{ id: e.id }} className="text-primary hover:underline text-sm">Ver</Link></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table></Card>
      )}
    </div>
  );
}
