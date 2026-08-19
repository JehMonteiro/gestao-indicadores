import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { useStore } from "@/mocks/store";
import { useVisibleIndicators } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store } from "lucide-react";
import { classify, weightedIndex } from "@/lib/format";
import { isFranquia } from "@/lib/entity-kind";
import {
  FranchiseRankingList,
  IndexEvolutionCard,
  buildIndicatorMetrics,
  useFranchiseRanking,
} from "@/components/app/dashboard-blocks";

export const Route = createFileRoute("/_authenticated/desempenho-franquias")({
  head: () => ({
    meta: [
      { title: "Desempenho das Franquias — Gestão de Indicadores" },
      { name: "description", content: "Ranking e evolução do desempenho das unidades franqueadas." },
      { property: "og:title", content: "Desempenho das Franquias — Gestão de Indicadores" },
      { property: "og:description", content: "Ranking e evolução do desempenho das unidades franqueadas." },
    ],
  }),
  component: FranchisePerformance,
});

function FranchisePerformance() {
  const indicators = useVisibleIndicators();
  const allTargets = useStore((s) => s.targets);
  const allEntries = useStore((s) => s.entries);
  const allFranchises = useStore((s) => s.franchises);
  const settings = useStore((s) => s.settings);
  const [period] = useState<"3m" | "6m" | "12m">("6m");

  const units = useMemo(() => allFranchises.filter(isFranquia), [allFranchises]);

  const visibleIds = useMemo(() => new Set(indicators.map((i) => i.id)), [indicators]);
  const targets = useMemo(() => allTargets.filter((t) => visibleIds.has(t.indicator_id)), [allTargets, visibleIds]);
  const entries = useMemo(() => allEntries.filter((e) => visibleIds.has(e.indicator_id)), [allEntries, visibleIds]);

  const metrics = useMemo(
    () => buildIndicatorMetrics(indicators, entries, targets),
    [indicators, entries, targets],
  );
  const ranking = useFranchiseRanking(units, metrics, targets, entries);

  const totals = useMemo(() => {
    const counts = { atingido: 0, atencao: 0, critico: 0, sem_info: 0 };
    for (const m of metrics) counts[classify(m.last?.pct ?? null, settings)] += 1;
    const idx = weightedIndex(metrics.map((m) => ({ percent: m.last?.pct ?? null, weight: m.ind.weight })));
    return { ...counts, idx };
  }, [metrics, settings]);

  return (
    <div>
      <PageHeader
        title="Desempenho das Franquias"
        description="Ranking e evolução das unidades da Nocta Franquia."
      />

      <div className="grid gap-4 sm:grid-cols-4 mb-4">
        <StatCard label="Unidades" value={String(units.length)} />
        <StatCard label="Índice geral" value={totals.idx === null ? "—" : `${Math.round(totals.idx)}%`} />
        <StatCard label="Indicadores atingidos" value={String(totals.atingido)} />
        <StatCard label="Indicadores críticos" value={String(totals.critico)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <IndexEvolutionCard metrics={metrics} period={period} />
        <Card>
          <CardHeader><CardTitle className="text-base">Ranking por unidade</CardTitle></CardHeader>
          <CardContent>
            {units.length === 0 ? (
              <EmptyState
                title="Nenhuma franquia cadastrada."
                description="Cadastre unidades em Empresas / Franquias para acompanhar o desempenho."
                icon={<Store className="size-5" />}
              />
            ) : (
              <FranchiseRankingList ranking={ranking} settings={settings} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
