import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { weightedIndex, KPI_GROUPS, kpiGroupStyles } from "@/lib/format";
import { readGroupBalance } from "@/lib/kpi-group";
import type { IndicatorMetric } from "@/components/app/dashboard-blocks";
import type { KpiGroup } from "@/mocks/types";

const GROUP_COLOR: Record<KpiGroup, string> = {
  movimento: "var(--kpi-movimento)",
  resultado: "var(--kpi-resultado)",
  qualidade: "var(--kpi-qualidade)",
};

export function KpiGroupBalanceCard({ metrics }: { metrics: IndicatorMetric[] }) {
  const groups = useMemo(
    () =>
      KPI_GROUPS.map((g) => {
        const items = metrics
          .filter((m) => (m.ind.kpi_group ?? "resultado") === g.value)
          .map((m) => ({ percent: m.last?.pct ?? null, weight: m.ind.weight }));
        return {
          value: g.value,
          label: g.label,
          description: g.description,
          count: items.length,
          index: weightedIndex(items),
        };
      }),
    [metrics],
  );

  const analysis = readGroupBalance(
    groups[0]?.index ?? null,
    groups[1]?.index ?? null,
    groups[2]?.index ?? null,
  );

  const chartData = groups.map((g) => ({ name: g.label, valor: g.index ?? 0, fill: GROUP_COLOR[g.value] }));
  const hasData = groups.some((g) => g.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Equilíbrio entre grupos estratégicos</CardTitle>
        <CardDescription>Movimento gera Resultado; Qualidade sustenta os dois.</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground">Nenhum indicador classificado até o momento.</p>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              {groups.map((g) => {
                const st = kpiGroupStyles(g.value);
                return (
                  <div key={g.value} className="rounded-lg border p-3">
                    <Badge variant="outline" className={st.className}>{st.label}</Badge>
                    <p className="text-2xl font-semibold font-mono mt-2">
                      {g.index != null ? `${Math.round(g.index)}%` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {g.count} indicador{g.count === 1 ? "" : "es"}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} unit="%" tickFormatter={(v: number) => String(Math.round(v))} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    formatter={(v: unknown) => (typeof v === "number" ? `${Math.round(v)}%` : (v as never))}
                  />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-muted-foreground mt-3">{analysis}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
