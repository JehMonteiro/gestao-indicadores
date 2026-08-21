import type { EntityKind } from "@/lib/entity-kind";
import { Link, useParams, notFound } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { classify, classificationStyles, computeAchievement, formatDate, formatValue } from "@/lib/format";
import { resolveTargetForEntry } from "@/lib/metrics";

export function EntryDetail({ escopo = "empresa" }: { escopo?: EntityKind }) {
  const { id } = useParams({
    from: escopo === "franquia" ? "/_authenticated/lancamentos-franquia/$id" : "/_authenticated/lancamentos/$id",
  });

  const entries = useStore((s) => s.entries);
  const indicators = useStore((s) => s.indicators);
  const targets = useStore((s) => s.targets);
  const settings = useStore((s) => s.settings);

  const entry = entries.find((e) => e.id === id);
  if (!entry) throw notFound();
  const ind = indicators.find((i) => i.id === entry.indicator_id);
  const target = ind ? resolveTargetForEntry(ind, entry, targets.filter((t) => t.indicator_id === entry.indicator_id)) : null;
  const pct = computeAchievement(entry, target, ind?.direction ?? "maior_melhor");
  const cs = classificationStyles(classify(pct, settings));

  const revisions = entries.filter((e) => e.indicator_id === entry.indicator_id && e.period_start === entry.period_start).sort((a, b) => a.revision_number - b.revision_number);

  const backTo = escopo === "franquia" ? "/lancamentos-franquia" : "/lancamentos";

  return (
    <div>
      <PageHeader title={ind?.name ?? "Lançamento"} description={`Período ${formatDate(entry.period_start)} — ${formatDate(entry.period_end)}`}
        actions={<Button variant="outline" asChild><Link to={backTo}>Voltar</Link></Button>}
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Dados</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
          <Item k="Valor realizado" v={formatValue(entry.actual_value, ind?.value_type ?? "inteiro")} />
          <Item k="Meta" v={target ? formatValue(target.target_value, ind?.value_type ?? "inteiro") : "Sem meta definida"} />
          <Item k="Atingimento" v={pct != null ? `${Math.round(pct)}%` : "—"} />
          <div><p className="text-xs uppercase text-muted-foreground">Status</p><Badge variant="outline" className={`capitalize mt-1 ${cs.className}`}>{entry.status}</Badge></div>
          <Item k="Comentário" v={entry.comment ?? "—"} full />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Revisões deste período</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {revisions.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <p className="text-sm font-medium">Revisão #{r.revision_number}</p>
                <p className="text-xs text-muted-foreground">{formatDate(r.updated_at)} — {formatValue(r.actual_value, ind?.value_type ?? "inteiro")}</p>
              </div>
              <Badge variant="outline" className="capitalize">{r.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Item({ k, v, full }: { k: string; v: string; full?: boolean }) {
  return <div className={full ? "sm:col-span-2" : ""}><p className="text-xs uppercase text-muted-foreground">{k}</p><p className="mt-1">{v}</p></div>;
}
