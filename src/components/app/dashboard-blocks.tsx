import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { classify, classificationStyles, computeAchievement, formatMonth, formatValue, weightedIndex } from "@/lib/format";
import { latestEntriesByPeriod, registeredEntriesForIndicator, resolveTargetForEntry, resolveTargetForIndicator } from "@/lib/metrics";
import type { AppSettings, Franchise, Indicator, IndicatorEntry, IndicatorTarget } from "@/mocks/types";

export type IndicatorMetric = {
  ind: Indicator;
  monthly: { period: string; actual: number; target: number; hasTarget: boolean; pct: number | null }[];
  last?: { period: string; actual: number; target: number; hasTarget: boolean; pct: number | null };
};

export function buildIndicatorMetrics(
  indicators: Indicator[],
  entries: IndicatorEntry[],
  targets: IndicatorTarget[],
): IndicatorMetric[] {
  return indicators.map((ind) => {
    const indEntries = registeredEntriesForIndicator(ind, entries);
    const indTargets = targets.filter((t) => t.indicator_id === ind.id);
    const monthly = indEntries.map((e) => {
      const t = resolveTargetForEntry(ind, e, indTargets);
      return {
        period: e.period_end,
        actual: e.actual_value ?? 0,
        target: t?.target_value ?? 0,
        hasTarget: !!t,
        pct: computeAchievement(e, t, ind.direction),
      };
    });
    return { ind, monthly, last: monthly[monthly.length - 1] };
  });
}

export function IndexEvolutionCard({ metrics, period }: { metrics: IndicatorMetric[]; period: "3m" | "6m" | "12m" }) {
  const data = useMemo(() => {
    const map = new Map<string, { period: string; valor: number; count: number }>();
    for (const m of metrics) {
      for (const pt of m.monthly) {
        if (pt.pct == null) continue;
        const prev = map.get(pt.period) ?? { period: formatMonth(pt.period), valor: 0, count: 0 };
        prev.valor += pt.pct;
        prev.count += 1;
        map.set(pt.period, prev);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ period: v.period, valor: Math.round(v.valor / Math.max(v.count, 1)) }))
      .slice(period === "3m" ? -3 : period === "12m" ? -12 : -6);
  }, [metrics, period]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Evolução do índice</CardTitle></CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="period" fontSize={12} />
              <YAxis fontSize={12} unit="%" tickFormatter={(v: number) => String(Math.round(v))} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} formatter={(v: unknown) => (typeof v === "number" ? Math.round(v) : (v as never))} />
              <Line type="monotone" dataKey="valor" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function useFranchiseRanking(
  franchises: Franchise[],
  metrics: IndicatorMetric[],
  targets: IndicatorTarget[],
  entries: IndicatorEntry[],
) {
  return useMemo(() => {
    return franchises
      .map((f) => {
        const items = metrics.map((m) => {
          const franchiseTargets = targets.filter(
            (t) => t.indicator_id === m.ind.id && (!t.franchise_id || t.franchise_id === f.id),
          );
          const e = latestEntriesByPeriod(
            entries.filter((x) => x.indicator_id === m.ind.id && x.franchise_id === f.id && x.status === "registrado"),
          ).slice(-1)[0];
          const t = e
            ? resolveTargetForEntry(m.ind, e, franchiseTargets)
            : resolveTargetForIndicator(m.ind, franchiseTargets);
          return { percent: computeAchievement(e, t, m.ind.direction), weight: m.ind.weight };
        });
        return { name: f.name, valor: Math.round(weightedIndex(items) ?? 0) };
      })
      .sort((a, b) => b.valor - a.valor);
  }, [franchises, metrics, targets, entries]);
}

export function FranchiseRankingList({
  ranking,
  settings,
}: {
  ranking: { name: string; valor: number }[];
  settings: AppSettings;
}) {
  return (
    <div className="space-y-2">
      {ranking.map((f, i) => {
        const cs = classificationStyles(classify(f.valor, settings));
        return (
          <div key={f.name} className="flex items-center gap-3 p-3 rounded-md border">
            <div className="size-8 grid place-items-center bg-muted rounded-md font-mono text-sm">{i + 1}</div>
            <div className="flex-1"><p className="text-sm font-medium">{f.name}</p></div>
            <p className="font-mono">{f.valor}%</p>
            <Badge variant="outline" className={cs.className}>{cs.label}</Badge>
          </div>
        );
      })}
      {ranking.length === 0 && (
        <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma empresa disponível.</p>
      )}
    </div>
  );
}

const PERIODS_PER_YEAR: Record<string, number> = {
  diaria: 365, semanal: 52, quinzenal: 24, mensal: 12, trimestral: 4, semestral: 2, anual: 1,
};

export function AnnualSummaryCard({
  indicators,
  entries,
  targets,
  settings,
}: {
  indicators: Indicator[];
  entries: IndicatorEntry[];
  targets: IndicatorTarget[];
  settings: AppSettings;
}) {
  const currentYear = new Date().getFullYear();
  const rows = useMemo(() => {
    return indicators
      .filter((i) => i.status === "ativo")
      .map((ind) => {
        const registered = latestEntriesByPeriod(
          entries.filter((e) => e.indicator_id === ind.id && e.status === "registrado"),
        );
        let accThis = 0, accLast = 0, accPrev = 0;
        const monthsThisYear = new Set<string>();
        for (const e of registered) {
          const y = Number((e.period_end ?? "").slice(0, 4));
          const v = e.actual_value ?? 0;
          if (!y) continue;
          if (y === currentYear) {
            accThis += v;
            monthsThisYear.add((e.period_end ?? "").slice(0, 7));
          } else if (y === currentYear - 1) {
            accLast += v;
            accPrev += v;
          } else if (y < currentYear) {
            accPrev += v;
          }
        }
        const months = monthsThisYear.size;
        const avgMonth = months > 0 ? accThis / months : null;
        const indTargets = targets.filter((t) => t.indicator_id === ind.id);
        const targetYear = indTargets
          .filter((t) => Number((t.period_end ?? "").slice(0, 4)) === currentYear)
          .reduce((s, t) => s + (t.target_value ?? 0), 0);
        const targetFallback = ind.default_target != null ? ind.default_target * (PERIODS_PER_YEAR[ind.frequency] ?? 12) : 0;
        const targetThis = targetYear > 0 ? targetYear : targetFallback;
        const pctRealized = targetThis > 0 ? (accThis / targetThis) * 100 : null;
        const variation = accLast > 0 ? ((accThis - accLast) / accLast) * 100 : null;
        return { ind, accPrev, accThis, avgMonth, pctRealized, variation };
      });
  }, [indicators, entries, targets, currentYear]);

  if (rows.length === 0) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">Resumo anual por indicador</CardTitle>
        <p className="text-xs text-muted-foreground">
          Acumulado de anos anteriores, ano corrente, média mensal, % realizada da meta anual e variação vs. ano anterior.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Indicador</TableHead>
                <TableHead className="text-right">Acum. anos anteriores</TableHead>
                <TableHead className="text-right">Acum. {currentYear}</TableHead>
                <TableHead className="text-right">Média mês</TableHead>
                <TableHead className="text-right">% realizada</TableHead>
                <TableHead className="text-right">Variação % (vs. {currentYear - 1})</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ ind, accPrev, accThis, avgMonth, pctRealized, variation }) => {
                const cs = classificationStyles(classify(pctRealized, settings));
                const varColor =
                  variation == null ? "text-muted-foreground"
                  : variation > 0 ? "text-success"
                  : variation < 0 ? "text-destructive"
                  : "text-muted-foreground";
                const VarIcon = variation == null ? Minus : variation > 0 ? ArrowUpRight : variation < 0 ? ArrowDownRight : Minus;
                return (
                  <TableRow key={ind.id}>
                    <TableCell>
                      <div className="font-medium">{ind.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{ind.code}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatValue(accPrev, ind.value_type)}</TableCell>
                    <TableCell className="text-right font-mono">{formatValue(accThis, ind.value_type)}</TableCell>
                    <TableCell className="text-right font-mono">{avgMonth == null ? "—" : formatValue(avgMonth, ind.value_type)}</TableCell>
                    <TableCell className="text-right">
                      {pctRealized == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Badge variant="outline" className={cs.className}>{Math.round(pctRealized)}%</Badge>
                      )}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${varColor}`}>
                      <span className="inline-flex items-center gap-1 justify-end">
                        <VarIcon className="size-3.5" />
                        {variation == null ? "—" : `${variation > 0 ? "+" : ""}${Math.round(variation)}%`}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
