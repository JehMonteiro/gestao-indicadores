import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader, EmptyState, StatusDot } from "@/components/app/page-header";
import { useCurrentUser, useStore } from "@/mocks/store";
import { useVisibleIndicators } from "@/lib/permissions";
import { classify, classificationStyles, computeAchievement, formatDate, formatValue, weightedIndex } from "@/lib/format";
import { registeredEntriesForIndicator, resolveTargetForEntry, resolveTargetForIndicator } from "@/lib/metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Activity, AlertTriangle, CheckCircle2, Clock, ListChecks, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/meu-painel")({
  head: () => ({ meta: [{ title: "Meu painel — Gestão de Indicadores" }] }),
  component: MyDashboard,
});

function MyDashboard() {
  const user = useCurrentUser();
  const indicators = useVisibleIndicators();
  const entries = useStore((s) => s.entries);
  const targets = useStore((s) => s.targets);
  const settings = useStore((s) => s.settings);
  const sectors = useStore((s) => s.sectors);

  const stats = useMemo(() => {
    const metrics = indicators.map((ind) => {
      const indTargets = targets.filter((t) => t.indicator_id === ind.id);
      const e = registeredEntriesForIndicator(ind, entries).slice(-1)[0];
      const t = e ? resolveTargetForEntry(ind, e, indTargets) : resolveTargetForIndicator(ind, indTargets);
      const pct = computeAchievement(e, t, ind.direction);
      return { ind, pct, target: t, entry: e };
    });
    const counts = { atingido: 0, atencao: 0, critico: 0, sem_info: 0 };
    for (const m of metrics) counts[classify(m.pct, settings)] += 1;
    const idx = weightedIndex(metrics.map((m) => ({ percent: m.pct, weight: m.ind.weight })));
    return { metrics, counts, idx };
  }, [indicators, targets, entries, settings]);

  const pending = entries.filter((e) => e.user_id === user?.id && e.status === "rascunho");
  const sectorChart = useMemo(() => {
    return sectors.map((s) => {
      const sectorMetrics = stats.metrics.filter((m) => m.ind.owner_sector_id === s.id);
      const avg = weightedIndex(sectorMetrics.map((m) => ({ percent: m.pct, weight: m.ind.weight })));
      return { setor: s.code, valor: avg ? Math.round(avg) : 0, fill: s.color };
    });
  }, [sectors, stats]);

  const pieData = [
    { name: "Atingido", value: stats.counts.atingido, fill: "oklch(0.65 0.16 150)" },
    { name: "Atenção", value: stats.counts.atencao, fill: "oklch(0.78 0.16 75)" },
    { name: "Crítico", value: stats.counts.critico, fill: "oklch(0.58 0.22 27)" },
    { name: "Sem info", value: stats.counts.sem_info, fill: "oklch(0.7 0 0)" },
  ];

  return (
    <div>
      <PageHeader
        title={`Olá, ${user?.full_name.split(" ")[0]}`}
        description="Resumo dos seus indicadores e pendências."
        actions={
          <Button asChild><Link to="/lancamentos">Lançar resultado</Link></Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={ListChecks} label="Indicadores visíveis" value={indicators.length} />
        <KpiCard icon={CheckCircle2} label="Atingidos" value={stats.counts.atingido} tone="success" />
        <KpiCard icon={AlertTriangle} label="Em atenção" value={stats.counts.atencao} tone="warning" />
        <KpiCard icon={TrendingDown} label="Críticos" value={stats.counts.critico} tone="destructive" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Desempenho por setor</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorChart}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="setor" fontSize={12} />
                  <YAxis fontSize={12} unit="%" tickFormatter={(v: number) => String(Math.round(v))} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} formatter={(v: number | string) => (typeof v === "number" ? Math.round(v) : v)} />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                    {sectorChart.map((s, i) => (<Cell key={i} fill={s.fill} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Distribuição</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Meus indicadores</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.metrics.slice(0, 6).map((m) => {
              const c = classify(m.pct, settings);
              const cs = classificationStyles(c);
              return (
                <div key={m.ind.id} className="flex items-center justify-between gap-3 p-3 rounded-md border">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.ind.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.entry ? `Último: ${formatValue(m.entry.actual_value, m.ind.value_type, m.ind.unit)}` : "Sem lançamento"}
                      {m.target ? ` · Meta: ${formatValue(m.target.target_value, m.ind.value_type, m.ind.unit)}` : " · Sem meta definida"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-medium">{m.pct != null ? `${Math.round(m.pct)}%` : "—"}</p>
                    <Badge variant="outline" className={cs.className}>{cs.label}</Badge>
                  </div>
                </div>
              );
            })}
            {stats.metrics.length === 0 && (
              <EmptyState title="Você ainda não tem indicadores visíveis" icon={<ListChecks className="size-5" />} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Próximas pendências</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pending.length === 0 && <EmptyState title="Nenhuma pendência" description="Você está em dia!" icon={<CheckCircle2 className="size-5" />} />}
            {pending.slice(0, 6).map((p) => {
              const ind = indicators.find((i) => i.id === p.indicator_id);
              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-md border">
                  <div>
                    <p className="text-sm font-medium">{ind?.name}</p>
                    <p className="text-xs text-muted-foreground">Período {formatDate(p.period_start)} — {formatDate(p.period_end)}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">{p.status}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Índice consolidado</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-semibold font-mono">{stats.idx != null ? `${Math.round(stats.idx)}%` : "—"}</div>
            <div className="flex-1">
              <Progress value={Math.min(stats.idx ?? 0, 150)} max={150} />
              <p className="text-xs text-muted-foreground mt-2">Média ponderada pelos pesos dos indicadores visíveis.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; tone?: "success" | "warning" | "destructive" | "info" }) {
  const tones: Record<string, string> = { success: "text-success", warning: "text-warning", destructive: "text-destructive", info: "text-info" };
  return (
    <Card>
      <CardContent className="p-4 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={`text-2xl font-semibold mt-1 font-mono ${tone ? tones[tone] : ""}`}>{value}</p>
        </div>
        <div className={`p-2 rounded-md bg-muted ${tone ? tones[tone] : "text-muted-foreground"}`}>
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  );
}
