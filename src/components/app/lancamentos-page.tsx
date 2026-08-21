import type { EntityKind } from "@/lib/entity-kind";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { useStore } from "@/mocks/store";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatValue } from "@/lib/format";
import { ClipboardEdit, Plus } from "lucide-react";

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground border-border",
  registrado: "bg-success/15 text-success border-success/30",
  atrasado: "bg-warning/15 text-warning-foreground border-warning/30",
};

export function LancamentosPage({ escopo = "empresa" }: { escopo?: EntityKind }) {
  const isFranquia = escopo === "franquia";
  const rotaNovo = isFranquia ? "/lancamentos-franquia/novo" : "/lancamentos/novo";
  const rotaDetalhe = isFranquia ? "/lancamentos-franquia/$id" : "/lancamentos/$id";

  const indicators = useStore((s) => s.indicators);
  const franchises = useStore((s) => s.franchises);
  const entries = useStore((s) => s.entries);
  const [status, setStatus] = useState("all");
  const scopedIndicatorIds = new Set(indicators.filter((i) => i.entity_scope === escopo).map((i) => i.id));
  const filtered = entries
    .filter((e) => scopedIndicatorIds.has(e.indicator_id))
    .filter((e) => status === "all" || e.status === status)
    .sort((a, b) => b.period_end.localeCompare(a.period_end));


  return (
    <div>
      <PageHeader title={escopo === "franquia" ? "Lançamentos Franquia" : "Lançamentos"} description="Histórico e novos lançamentos de resultados."
        actions={<Button asChild><Link to={rotaNovo}><Plus className="size-4" />Novo lançamento</Link></Button>}
      />

      <Card className="mb-4"><CardContent className="p-3 flex gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="registrado">Registrado</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
          </SelectContent>
        </Select>
      </CardContent></Card>

      {isFranquia && scopedIndicatorIds.size === 0 ? (
        <EmptyState title="Nenhum indicador de franquia cadastrado" description="Para registrar lançamentos de franquia, primeiro cadastre indicadores com escopo de franquia." icon={<ClipboardEdit className="size-5" />}
          action={<Button asChild><Link to="/indicadores-franquia">Ir para Indicadores Franquia</Link></Button>} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nenhum lançamento" description="Comece registrando o resultado de um indicador." icon={<ClipboardEdit className="size-5" />}
          action={<Button asChild><Link to={rotaNovo}>Novo lançamento</Link></Button>} />
      ) : (

        <Card><Table>
          <TableHeader><TableRow>
            <TableHead>Indicador</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Período</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Lançado em</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((e) => {
              const ind = indicators.find((i) => i.id === e.indicator_id);
              const franchise = franchises.find((f) => f.id === e.franchise_id);
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{ind?.name}</TableCell>
                  <TableCell>{franchise?.name ?? "—"}</TableCell>
                  <TableCell>{formatDate(e.period_start)} — {formatDate(e.period_end)}</TableCell>
                  <TableCell className="font-mono">{formatValue(e.actual_value, ind?.value_type ?? "inteiro")}</TableCell>
                  <TableCell>{formatDate(e.updated_at)}</TableCell>
                  <TableCell><Badge variant="outline" className={`capitalize ${statusColors[e.status]}`}>{e.status}</Badge></TableCell>
                  <TableCell><Link to={rotaDetalhe} params={{ id: e.id }} className="text-primary hover:underline text-sm">Ver</Link></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table></Card>
      )}
    </div>
  );
}
