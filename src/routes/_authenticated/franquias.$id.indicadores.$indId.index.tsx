import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { useStore } from "@/mocks/store";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { classify, classificationStyles, computeAchievement, formatDate, formatMonth, formatValue, indicatorPeriodLabel, kpiGroupStyles } from "@/lib/format";
import { resolveTargetForEntry, latestEntriesByPeriod } from "@/lib/metrics";
import { Pencil, Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/franquias/$id/indicadores/$indId/")({
  head: () => ({ meta: [{ title: "Indicador da franquia" }] }),
  component: FranchiseIndicatorDetail,
});

function FranchiseIndicatorDetail() {
  const { id, indId } = Route.useParams();
  const franchises = useStore((s) => s.franchises);
  const indicators = useStore((s) => s.indicators);
  const targets = useStore((s) => s.targets);
  const entries = useStore((s) => s.entries);
  const profiles = useStore((s) => s.profiles);
  const settings = useStore((s) => s.settings);
  const { isAdmin } = useIsAdmin();

  const franchise = franchises.find((fr) => fr.id === id);
  const ind = indicators.find((i) => i.id === indId);

  if (!ind) {
    return (
      <div>
        <PageHeader title="Indicador da unidade" />
        <EmptyState
          title={indicators.length === 0 ? "Carregando indicador…" : "Indicador não encontrado"}
          description={indicators.length === 0 ? "Aguarde a sincronização dos dados." : "Ele pode ter sido removido."}
          icon={<Target className="size-5" />}
          action={<Button asChild><Link to="/franquias/$id" params={{ id }}>Voltar para a franquia</Link></Button>}
        />
      </div>
    );
  }

  const indEntries = latestEntriesByPeriod(entries.filter((e) => e.indicator_id === indId));
  const indTargets = targets.filter((t) => t.indicator_id === indId);
  const chartData = indEntries.filter((e) => e.status === "registrado").map((e) => {
    const t = resolveTargetForEntry(ind, e, indTargets);
    return { period: formatMonth(e.period_end), realizado: e.actual_value ?? 0, meta: t?.target_value ?? 0 };
  });

  return (
    <div>
      <nav aria-label="breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link to="/franquias" className="hover:underline">Franquias</Link>
        <span>›</span>
        <Link to="/franquias/$id" params={{ id }} className="hover:underline">{franchise?.name ?? "Unidade"}</Link>
        <span>›</span>
        <span>Indicadores</span>
        <span>›</span>
        <span className="text-foreground">{ind.name}</span>
      </nav>

      <PageHeader
        title={ind.name}
        description={ind.objective ?? "Indicador da unidade."}
        actions={<>
          <Button variant="outline" asChild><Link to="/franquias/$id" params={{ id }}>Voltar</Link></Button>
          {isAdmin && (
            <Button variant="outline" asChild>
              <Link to="/franquias/$id/indicadores/$indId/editar" params={{ id, indId }}><Pencil className="size-4" />Editar</Link>
            </Button>
          )}
          <Button asChild><Link to="/lancamentos/novo" search={{ indicator: ind.id }}>Lançar resultado</Link></Button>
        </>}
      />

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Unidade</p><p className="text-sm mt-1">{franchise?.name ?? "—"}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Periodicidade</p><p className="text-sm mt-1">{indicatorPeriodLabel(ind)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Grupo estratégico</p>{(() => { const st = kpiGroupStyles(ind.kpi_group ?? "resultado"); return <Badge variant="outline" className={`mt-1 ${st.className}`}>{st.label}</Badge>; })()}</CardContent></Card>
      </div>

      <Tabs defaultValue="definicao">
        <TabsList>
          <TabsTrigger value="definicao">Definição</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="evolucao">Evolução</TabsTrigger>
        </TabsList>

        <TabsContent value="definicao">
          <Card><CardContent className="p-6 grid sm:grid-cols-2 gap-4 text-sm">
            <Item k="Objetivo" v={ind.objective ?? "—"} />
            <Item k="Tipo de valor" v={ind.value_type} />
            <Item k="Regra" v={ind.direction.replace("_", " ")} />
            <Item k="Responsável" v={ind.responsible_ids?.length ? ind.responsible_ids.map((rid) => profiles.find((p) => p.id === rid)?.full_name ?? "—").join(", ") : "—"} />
            <Item k="Meta padrão" v={ind.default_target != null ? formatValue(ind.default_target, ind.value_type) : "—"} />
            <Item k="Início" v={formatDate(ind.start_date)} />
            <Item k="Status" v={ind.status} />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card><Table>
            <TableHeader><TableRow><TableHead>Período</TableHead><TableHead>Valor</TableHead><TableHead>Meta</TableHead><TableHead>%</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {indEntries.map((e) => {
                const t = resolveTargetForEntry(ind, e, indTargets);
                const pct = computeAchievement(e, t, ind.direction);
                const cs = classificationStyles(classify(pct, settings));
                return (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.period_end)}</TableCell>
                    <TableCell className="font-mono">{formatValue(e.actual_value, ind.value_type)}</TableCell>
                    <TableCell className="font-mono">{t ? formatValue(t.target_value, ind.value_type) : <span className="text-muted-foreground text-xs">Sem meta definida</span>}</TableCell>
                    <TableCell className="font-mono">{pct != null ? `${Math.round(pct)}%` : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={cs.className}>{cs.label}</Badge></TableCell>
                  </TableRow>
                );
              })}
              {indEntries.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">Nenhum lançamento registrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table></Card>
        </TabsContent>

        <TabsContent value="evolucao">
          <Card><CardContent className="p-4"><div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="period" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v: number) => String(Math.round(v))} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} formatter={(v: unknown) => (typeof v === "number" ? Math.round(v) : (v as never))} />
                <Line type="monotone" dataKey="meta" stroke="var(--muted-foreground)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="realizado" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{k}</p>
      <p className="mt-1">{v}</p>
    </div>
  );
}
