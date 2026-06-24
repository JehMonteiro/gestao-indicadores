import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { classify, classificationStyles, computeAchievement, formatMonth, formatValue, weightedIndex } from "@/lib/format";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/visao-geral")({
  head: () => ({ meta: [{ title: "Visão geral — Gestão de Indicadores" }] }),
  component: Overview,
});

function Overview() {
  const indicators = useStore((s) => s.indicators);
  const targets = useStore((s) => s.targets);
  const entries = useStore((s) => s.entries);
  const sectors = useStore((s) => s.sectors);
  const franchises = useStore((s) => s.franchises);
  const settings = useStore((s) => s.settings);

  const [period, setPeriod] = useState<"6m" | "3m" | "12m">("6m");

  const metricsByIndicator = useMemo(() => {
    return indicators.map((ind) => {
      const indEntries = entries.filter((e) => e.indicator_id === ind.id && e.status === "aprovado");
      const indTargets = targets.filter((t) => t.indicator_id === ind.id);
      const monthly = indEntries.map((e) => {
        const t = indTargets.find((t) => t.id === e.target_id) ?? indTargets[0];
        return {
          period: e.period_end,
          actual: e.actual_value ?? 0,
          target: t?.target_value ?? 0,
          pct: computeAchievement(e, t, ind.direction),
        };
      });
      const last = monthly[monthly.length - 1];
      return { ind, monthly, last };
    });
  }, [indicators, entries, targets]);

  const totals = useMemo(() => {
    const counts = { atingido: 0, atencao: 0, critico: 0, sem_info: 0 };
    for (const m of metricsByIndicator) counts[classify(m.last?.pct ?? null, settings)] += 1;
    const idx = weightedIndex(metricsByIndicator.map((m) => ({ percent: m.last?.pct ?? null, weight: m.ind.weight })));
    return { ...counts, idx };
  }, [metricsByIndicator, settings]);

  const evolutionData = useMemo(() => {
    const map = new Map<string, { period: string; valor: number; count: number }>();
    for (const m of metricsByIndicator) {
      for (const pt of m.monthly) {
        if (pt.pct == null) continue;
        const key = pt.period;
        const prev = map.get(key) ?? { period: formatMonth(key), valor: 0, count: 0 };
        prev.valor += pt.pct;
        prev.count += 1;
        map.set(key, prev);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ period: v.period, valor: Math.round(v.valor / Math.max(v.count, 1)) }))
      .slice(period === "3m" ? -3 : period === "12m" ? -12 : -6);
  }, [metricsByIndicator, period]);

  const franchiseRanking = useMemo(() => {
    return franchises.map((f) => {
      const items = metricsByIndicator
        .map((m) => {
          const t = targets.find((t) => t.indicator_id === m.ind.id && t.franchise_id === f.id);
          const e = entries.filter((e) => e.indicator_id === m.ind.id && e.franchise_id === f.id && e.status === "aprovado").slice(-1)[0];
          const pct = computeAchievement(e, t, m.ind.direction);
          return { percent: pct, weight: m.ind.weight };
        });
      return { name: f.name, valor: Math.round(weightedIndex(items) ?? 0) };
    }).sort((a, b) => b.valor - a.valor);
  }, [franchises, metricsByIndicator, targets, entries]);

  const sectorData = sectors.map((s) => {
    const items = metricsByIndicator.filter((m) => m.ind.owner_sector_id === s.id)
      .map((m) => ({ percent: m.last?.pct ?? null, weight: m.ind.weight }));
    return { setor: s.name, valor: Math.round(weightedIndex(items) ?? 0), fill: s.color };
  });

  const pieData = [
    { name: "Atingido", value: totals.atingido, fill: "oklch(0.65 0.16 150)" },
    { name: "Atenção", value: totals.atencao, fill: "oklch(0.78 0.16 75)" },
    { name: "Crítico", value: totals.critico, fill: "oklch(0.58 0.22 27)" },
    { name: "Sem info", value: totals.sem_info, fill: "oklch(0.7 0 0)" },
  ];

  const annualSummary = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return indicators
      .filter((i) => i.status === "ativo")
      .map((ind) => {
        const approved = entries.filter((e) => e.indicator_id === ind.id && e.status === "aprovado");
        let accThis = 0, accLast = 0, accPrev = 0;
        const monthsThisYear = new Set<string>();
        for (const e of approved) {
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
        const targetFallback = ind.default_target != null ? ind.default_target * 12 : 0;
        const targetThis = targetYear > 0 ? targetYear : targetFallback;
        const pctRealized = targetThis > 0 ? (accThis / targetThis) * 100 : null;
        const variation = accLast > 0 ? ((accThis - accLast) / accLast) * 100 : null;
        return { ind, accPrev, accThis, avgMonth, pctRealized, variation, currentYear };
      });
  }, [indicators, entries, targets]);



  return (
    <div>
      <PageHeader
        title="Visão geral"
        description="Resultado consolidado da empresa, setores e franquias."
        actions={
          <Select value={period} onValueChange={(v) => setPeriod(v as never)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">Últimos 3 meses</SelectItem>
              <SelectItem value="6m">Últimos 6 meses</SelectItem>
              <SelectItem value="12m">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Indicadores ativos</p><p className="text-2xl font-semibold font-mono mt-1">{indicators.filter(i => i.status === "ativo").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Índice geral</p><p className="text-2xl font-semibold font-mono mt-1">{totals.idx ? `${Math.round(totals.idx)}%` : "—"}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Atingidos</p><p className="text-2xl font-semibold font-mono mt-1 text-success">{totals.atingido}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Em atenção</p><p className="text-2xl font-semibold font-mono mt-1 text-warning">{totals.atencao}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Críticos</p><p className="text-2xl font-semibold font-mono mt-1 text-destructive">{totals.critico}</p></CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Evolução do índice</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="period" fontSize={12} />
                  <YAxis fontSize={12} unit="%" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                  <Line type="monotone" dataKey="valor" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Status dos indicadores</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={85}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="setores" className="mt-4">
        <TabsList>
          <TabsTrigger value="setores">Por setor</TabsTrigger>
          <TabsTrigger value="franquias">Ranking franquias</TabsTrigger>
        </TabsList>
        <TabsContent value="setores">
          <Card>
            <CardContent className="p-4">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="setor" fontSize={12} />
                    <YAxis fontSize={12} unit="%" />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                      {sectorData.map((s, i) => <Cell key={i} fill={s.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="franquias">
          <Card>
            <CardContent className="p-4 space-y-2">
              {franchiseRanking.map((f, i) => {
                const c = classify(f.valor, settings);
                const cs = classificationStyles(c);
                return (
                  <div key={f.name} className="flex items-center gap-3 p-3 rounded-md border">
                    <div className="size-8 grid place-items-center bg-muted rounded-md font-mono text-sm">{i + 1}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{f.name}</p>
                    </div>
                    <p className="font-mono">{f.valor}%</p>
                    <Badge variant="outline" className={cs.className}>{cs.label}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">
            Resumo anual por indicador
          </CardTitle>
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
                  <TableHead className="text-right">Acum. {new Date().getFullYear()}</TableHead>
                  <TableHead className="text-right">Média mês</TableHead>
                  <TableHead className="text-right">% realizada</TableHead>
                  <TableHead className="text-right">Variação % (vs. {new Date().getFullYear() - 1})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {annualSummary.map(({ ind, accPrev, accThis, avgMonth, pctRealized, variation }) => {
                  const cls = classify(pctRealized, settings);
                  const cs = classificationStyles(cls);
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
                      <TableCell className="text-right font-mono">{formatValue(accPrev, ind.value_type, ind.unit)}</TableCell>
                      <TableCell className="text-right font-mono">{formatValue(accThis, ind.value_type, ind.unit)}</TableCell>
                      <TableCell className="text-right font-mono">{avgMonth == null ? "—" : formatValue(avgMonth, ind.value_type, ind.unit)}</TableCell>
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
                          {variation == null ? "—" : `${variation > 0 ? "+" : ""}${variation.toFixed(1)}%`}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {annualSummary.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum indicador ativo.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
