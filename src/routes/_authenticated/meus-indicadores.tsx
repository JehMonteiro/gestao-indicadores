import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { useStore } from "@/mocks/store";
import { useVisibleIndicators } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { classify, classificationStyles, computeAchievement, formatValue } from "@/lib/format";
import { registeredEntriesForIndicator, resolveTargetForEntry, resolveTargetForIndicator } from "@/lib/metrics";

export const Route = createFileRoute("/_authenticated/meus-indicadores")({
  head: () => ({ meta: [{ title: "Meus indicadores" }] }),
  component: MyIndicators,
});

function MyIndicators() {
  const indicators = useVisibleIndicators();
  const targets = useStore((s) => s.targets);
  const entries = useStore((s) => s.entries);
  const sectors = useStore((s) => s.sectors);
  const franchises = useStore((s) => s.franchises);
  const settings = useStore((s) => s.settings);

  return (
    <div>
      <PageHeader title="Meus indicadores" description="Indicadores aos quais você tem acesso, com o desempenho mais recente." />
      <Card><Table>
        <TableHeader><TableRow>
          <TableHead>Indicador</TableHead><TableHead>Setor</TableHead><TableHead>Empresa</TableHead><TableHead>Último valor</TableHead><TableHead>Meta</TableHead><TableHead>%</TableHead><TableHead>Classificação</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {indicators.map((i) => {
            const sector = sectors.find((s) => s.id === i.owner_sector_id);
            const franchise = i.franchise_id ? franchises.find((fr) => fr.id === i.franchise_id) : null;
            const e = registeredEntriesForIndicator(i, entries).slice(-1)[0];
            const t = e ? resolveTargetForEntry(i, e, targets) : resolveTargetForIndicator(i, targets);
            const pct = computeAchievement(e, t, i.direction);
            const cs = classificationStyles(classify(pct, settings));
            return (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.name}</TableCell>
                <TableCell>{sector && <Badge variant="outline" style={{ borderColor: sector.color, color: sector.color }}>{sector.name}</Badge>}</TableCell>
                <TableCell className="text-sm">{franchise ? franchise.name : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="font-mono">{e ? formatValue(e.actual_value, i.value_type, i.unit) : "—"}</TableCell>
                <TableCell className="font-mono">{t ? formatValue(t.target_value, i.value_type, i.unit) : "—"}</TableCell>
                <TableCell className="font-mono">{pct != null ? `${Math.round(pct)}%` : "—"}</TableCell>
                <TableCell><Badge variant="outline" className={cs.className}>{cs.label}</Badge></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table></Card>
    </div>
  );
}

