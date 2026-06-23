import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Download } from "lucide-react";
import { classify, classificationStyles, computeAchievement, formatDate, formatValue } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const indicators = useStore((s) => s.indicators);
  const targets = useStore((s) => s.targets);
  const entries = useStore((s) => s.entries);
  const settings = useStore((s) => s.settings);

  const [indId, setIndId] = useState<string>(indicators[0]?.id ?? "");
  const ind = indicators.find((i) => i.id === indId);

  const rows = entries.filter((e) => e.indicator_id === indId).sort((a, b) => a.period_end.localeCompare(b.period_end))
    .map((e) => {
      const t = targets.find((t) => t.id === e.target_id);
      const pct = computeAchievement(e, t, ind?.direction ?? "maior_melhor");
      return { e, t, pct };
    });

  const exportCSV = () => {
    if (!ind) return;
    const header = ["periodo_inicio", "periodo_fim", "valor", "meta", "atingimento", "status"];
    const lines = [header.join(",")];
    rows.forEach(({ e, t, pct }) => {
      lines.push([e.period_start, e.period_end, e.actual_value ?? "", t?.target_value ?? "", pct ?? "", e.status].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio-${ind.code}.csv`;
    a.click();
    toast.success("Relatório exportado");
  };

  return (
    <div>
      <PageHeader title="Relatórios" description="Relatório detalhado por indicador."
        actions={
          <>
            <Select value={indId} onValueChange={setIndId}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>{indicators.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV}><Download className="size-4" />Exportar CSV</Button>
            <Button variant="outline" disabled>PDF (em breve)</Button>
          </>
        }
      />
      {ind && (
        <Card>
          <CardHeader><CardTitle className="text-base">{ind.name}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Período</TableHead><TableHead>Valor</TableHead><TableHead>Meta</TableHead><TableHead>%</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map(({ e, t, pct }) => {
                  const cs = classificationStyles(classify(pct, settings));
                  return (
                    <TableRow key={e.id}>
                      <TableCell>{formatDate(e.period_start)} — {formatDate(e.period_end)}</TableCell>
                      <TableCell className="font-mono">{formatValue(e.actual_value, ind.value_type, ind.unit)}</TableCell>
                      <TableCell className="font-mono">{t ? formatValue(t.target_value, ind.value_type, ind.unit) : "—"}</TableCell>
                      <TableCell className="font-mono">{pct != null ? `${Math.round(pct)}%` : "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={cs.className}>{cs.label}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
