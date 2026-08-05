import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { useStore } from "@/mocks/store";
import { useOwnedIndicators, useVisibleIndicators } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { classify, weightedIndex } from "@/lib/format";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AnnualSummaryCard,
  FranchiseRankingList,
  IndexEvolutionCard,
  buildIndicatorMetrics,
  useFranchiseRanking,
} from "@/components/app/dashboard-blocks";

export const Route = createFileRoute("/_authenticated/visao-geral")({
  head: () => ({ meta: [{ title: "Visão geral — Gestão de Indicadores" }] }),
  component: Overview,
});

function Overview() {
  const indicators = useVisibleIndicators();
  const ownedIndicators = useOwnedIndicators();
  const allTargets = useStore((s) => s.targets);
  const allEntries = useStore((s) => s.entries);
  const allSectors = useStore((s) => s.sectors);
  const allFranchises = useStore((s) => s.franchises);
  const settings = useStore((s) => s.settings);

  const [period, setPeriod] = useState<"6m" | "3m" | "12m">("6m");

  const visibleIds = useMemo(() => new Set(indicators.map((i) => i.id)), [indicators]);
  const targets = useMemo(() => allTargets.filter((t) => visibleIds.has(t.indicator_id)), [allTargets, visibleIds]);
  const entries = useMemo(() => allEntries.filter((e) => visibleIds.has(e.indicator_id)), [allEntries, visibleIds]);
  const sectors = useMemo(() => {
    const ids = new Set(indicators.flatMap((i) => [i.owner_sector_id, ...(i.shared_sector_ids ?? [])]));
    return allSectors.filter((s) => ids.has(s.id));
  }, [allSectors, indicators]);
  const franchises = useMemo(() => {
    const ids = new Set<string>([
      ...indicators.map((i) => i.franchise_id).filter(Boolean) as string[],
      ...targets.map((t) => t.franchise_id).filter(Boolean) as string[],
      ...entries.map((e) => e.franchise_id).filter(Boolean) as string[],
    ]);
    return ids.size > 0 ? allFranchises.filter((f) => ids.has(f.id)) : allFranchises;
  }, [allFranchises, indicators, targets, entries]);

  const metricsByIndicator = useMemo(
    () => buildIndicatorMetrics(indicators, entries, targets),
    [indicators, entries, targets],
  );

  const totals = useMemo(() => {
    const counts = { atingido: 0, atencao: 0, critico: 0, sem_info: 0 };
    for (const m of metricsByIndicator) counts[classify(m.last?.pct ?? null, settings)] += 1;
    const idx = weightedIndex(metricsByIndicator.map((m) => ({ percent: m.last?.pct ?? null, weight: m.ind.weight })));
    return { ...counts, idx };
  }, [metricsByIndicator, settings]);

  const franchiseRanking = useFranchiseRanking(franchises, metricsByIndicator, targets, entries);

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
        <div className="lg:col-span-2">
          <IndexEvolutionCard metrics={metricsByIndicator} period={period} />
        </div>

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
                    <YAxis fontSize={12} unit="%" tickFormatter={(v: number) => String(Math.round(v))} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} formatter={(v: unknown) => (typeof v === "number" ? Math.round(v) : (v as never))} />
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
            <CardContent className="p-4">
              <FranchiseRankingList ranking={franchiseRanking} settings={settings} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AnnualSummaryCard indicators={ownedIndicators} entries={entries} targets={targets} settings={settings} />
    </div>
  );
}
