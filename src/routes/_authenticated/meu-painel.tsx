import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, BarChart2, ClipboardList, TrendingUp } from "lucide-react";
import { useStore } from "@/mocks/store";
import { useAuthProfile } from "@/hooks/use-auth";
import { useMyDashboardData } from "@/lib/use-my-dashboard";
import {
  classify, classificationStyles, computeAchievement, formatValue, indicatorPeriodLabel, weightedIndex,
} from "@/lib/format";
import type { Classification } from "@/lib/format";
import { resolveTargetForEntry, resolveTargetForIndicator } from "@/lib/metrics";
import { currentPeriod, daysUntil, expectedEntriesInMonth, lastMonths } from "@/lib/period-utils";
import {
  MyDeadlines, MyEvolutionCard, MyIndicatorsTable, MyRecentHistory, MyStatusDonut,
} from "@/components/app/meu-painel-blocks";
import type { DeadlineItem, MyIndicatorRow, PeriodOption } from "@/components/app/meu-painel-blocks";
import type { IndicatorEntry } from "@/mocks/types";

export const Route = createFileRoute("/_authenticated/meu-painel")({
  head: () => ({
    meta: [
      { title: "Meu painel — Gestão de Indicadores" },
      { name: "description", content: "Painel pessoal com seus indicadores, lançamentos, desempenho e prazos." },
      { property: "og:title", content: "Meu painel — Gestão de Indicadores" },
      { property: "og:description", content: "Acompanhe seus indicadores, lançamentos e prazos em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyDashboard,
});

const PERIOD_MONTHS: Record<PeriodOption, number> = { "3m": 3, "6m": 6, "12m": 12 };

function overlaps(a: { period_start: string; period_end: string }, start: string, end: string) {
  return a.period_start <= end && a.period_end >= start;
}

function MyDashboard() {
  const { data: auth } = useAuthProfile();
  const settings = useStore((s) => s.settings);
  const { data, isLoading } = useMyDashboardData();
  const [period, setPeriod] = useState<PeriodOption>("6m");

  const indicators = useMemo(() => data?.indicators ?? [], [data]);
  const targets = useMemo(() => data?.targets ?? [], [data]);
  const entries = useMemo(() => data?.entries ?? [], [data]);
  const sectors = useMemo(() => data?.sectors ?? [], [data]);
  const entryIndicators = useMemo(() => data?.entryIndicators ?? [], [data]);

  const activeIndicators = useMemo(() => indicators.filter((i) => i.status === "ativo"), [indicators]);

  /* ---- linhas da tabela / status atual ---- */
  const rows = useMemo<MyIndicatorRow[]>(() => {
    return activeIndicators.map((ind) => {
      const p = currentPeriod(ind.frequency);
      const indEntries = entries.filter((e) => e.indicator_id === ind.id);
      const currentEntry = indEntries.find((e) => overlaps(e, p.start, p.end));
      const indTargets = targets.filter((t) => t.indicator_id === ind.id);
      const target = currentEntry
        ? resolveTargetForEntry(ind, currentEntry, indTargets)
        : resolveTargetForIndicator(ind, indTargets);
      const percent = currentEntry ? computeAchievement(currentEntry, target, ind.direction) : null;
      const sector = sectors.find((s) => s.id === ind.owner_sector_id);
      const periodLabel = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" })
        .format(new Date(`${p.start}T00:00:00Z`))
        .replace(".", "");
      return {
        indicator: ind,
        sectorName: sector?.name,
        periodLabel: periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1),
        actual: currentEntry?.actual_value,
        target: target?.target_value,
        percent,
        classification: classify(percent, settings) as Classification,
        entryId: currentEntry?.id,
      };
    });
  }, [activeIndicators, entries, targets, sectors, settings]);

  const counts = useMemo(() => {
    const base: Record<Classification, number> = { atingido: 0, atencao: 0, critico: 0, sem_info: 0 };
    for (const r of rows) base[r.classification] += 1;
    return base;
  }, [rows]);

  /* ---- cards ---- */
  const now = new Date();
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);

  const entriesThisMonth = entries.filter((e) => e.period_start >= monthStart && e.period_start <= monthEnd).length;
  const expectedThisMonth = activeIndicators.reduce((s, i) => s + expectedEntriesInMonth(i.frequency), 0);

  const myIndex = useMemo(
    () => weightedIndex(rows.filter((r) => r.percent != null).map((r) => ({ percent: r.percent, weight: r.indicator.weight }))),
    [rows],
  );

  const drafts = entries.filter((e) => e.status === "rascunho").length;
  const missing = rows.filter((r) => !r.entryId).length;
  const pending = drafts + missing;

  /* ---- evolução ---- */
  const evolution = useMemo(() => {
    const months = lastMonths(PERIOD_MONTHS[period]);
    return months.map((m) => {
      const items = activeIndicators.map((ind) => {
        const indTargets = targets.filter((t) => t.indicator_id === ind.id);
        const e = entries.find(
          (x) => x.indicator_id === ind.id && x.status === "registrado" && overlaps(x, m.start, m.end),
        );
        const t = e ? resolveTargetForEntry(ind, e, indTargets) : null;
        return { percent: e ? computeAchievement(e, t, ind.direction) : null, weight: ind.weight };
      });
      return { label: m.label, valor: weightedIndex(items) };
    });
  }, [activeIndicators, entries, targets, period]);

  /* ---- prazos ---- */
  const deadlines = useMemo<DeadlineItem[]>(() => {
    return activeIndicators
      .map((ind) => {
        const p = currentPeriod(ind.frequency);
        const done = entries.some((e) => e.indicator_id === ind.id && e.status === "registrado" && overlaps(e, p.start, p.end));
        if (done) return null;
        return {
          indicator: ind,
          frequencyLabel: indicatorPeriodLabel(ind),
          dueDate: p.end,
          daysLeft: daysUntil(p.end),
        } as DeadlineItem;
      })
      .filter((d): d is DeadlineItem => d != null)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);
  }, [activeIndicators, entries]);

  /* ---- histórico ---- */
  const recent = useMemo<IndicatorEntry[]>(
    () => [...entries]
      .sort((a, b) => (b.submitted_at ?? b.created_at).localeCompare(a.submitted_at ?? a.created_at))
      .slice(0, 10),
    [entries],
  );

  const firstName = auth?.profile?.full_name?.split(" ")[0] ?? "";
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date());

  const indexTone = myIndex == null
    ? "bg-muted text-muted-foreground border-border"
    : myIndex >= 100
      ? classificationStyles("atingido").className
      : myIndex >= 80
        ? classificationStyles("atencao").className
        : classificationStyles("critico").className;

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {firstName} 👋</h1>
        <p className="text-sm text-muted-foreground mt-1 first-letter:uppercase">{today}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={BarChart2} label="Meus indicadores ativos" loading={isLoading}
          value={activeIndicators.length}
        />
        <KpiCard
          icon={ClipboardList} label="Lançamentos no mês" loading={isLoading}
          value={`${entriesThisMonth}`}
          hint={`de ${expectedThisMonth} esperados`}
        />
        <KpiCard
          icon={TrendingUp} label="Meu índice de desempenho" loading={isLoading}
          value={myIndex != null ? `${Math.round(myIndex)}%` : "—"}
          badge={<Badge variant="outline" className={indexTone}>
            {myIndex == null ? "Sem dados" : myIndex >= 100 ? "Atingido" : myIndex >= 80 ? "Em atenção" : "Crítico"}
          </Badge>}
        />
        <KpiCard
          icon={AlertCircle} label="Pendências" loading={isLoading}
          value={pending}
          tone={pending === 0 ? undefined : pending > 3 ? "destructive" : "warning"}
          hint={`${drafts} rascunho(s) · ${missing} sem lançamento`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <MyEvolutionCard data={evolution} period={period} onPeriodChange={setPeriod} loading={isLoading} />
        <MyStatusDonut counts={counts} loading={isLoading} />
      </div>

      <MyIndicatorsTable rows={rows} loading={isLoading} />

      <div className="grid lg:grid-cols-2 gap-4">
        <MyDeadlines items={deadlines} loading={isLoading} />
        <MyRecentHistory entries={recent} indicators={entryIndicators} loading={isLoading} />
      </div>

      <div className="flex justify-end">
        <Button asChild><Link to="/lancamentos/novo">Lançar resultado</Link></Button>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, tone, hint, badge, loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone?: "success" | "warning" | "destructive" | "info";
  hint?: string;
  badge?: React.ReactNode;
  loading?: boolean;
}) {
  const tones: Record<string, string> = {
    success: "text-success", warning: "text-warning", destructive: "text-destructive", info: "text-info",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-20 mt-2" />
          ) : (
            <>
              <p className={`text-2xl font-semibold mt-1 font-mono ${tone ? tones[tone] : ""}`}>{value}</p>
              {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
              {badge && <div className="mt-2">{badge}</div>}
            </>
          )}
        </div>
        <div className={`p-2 rounded-md bg-muted ${tone ? tones[tone] : "text-muted-foreground"}`}>
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  );
}

export function formatValueSafe(v: number | undefined, type: Parameters<typeof formatValue>[1]) {
  return v == null ? "—" : formatValue(v, type);
}
