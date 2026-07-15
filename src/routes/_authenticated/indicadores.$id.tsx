import { createFileRoute, Link, notFound, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { useStore } from "@/mocks/store";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { classify, classificationStyles, computeAchievement, formatDate, formatMonth, formatValue, indicatorPeriodLabel } from "@/lib/format";
import { findTargetForEntry } from "@/lib/metrics";
import { Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/indicadores/$id")({
  head: ({ params }) => ({ meta: [{ title: `Indicador ${params.id}` }] }),
  component: IndicatorDetail,
  notFoundComponent: () => <div className="p-10 text-center"><p>Indicador não encontrado.</p></div>,
});

function IndicatorDetail() {
  const { id } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const indicators = useStore((s) => s.indicators);
  const targets = useStore((s) => s.targets);
  const entries = useStore((s) => s.entries);
  const sectors = useStore((s) => s.sectors);
  const profiles = useStore((s) => s.profiles);
  const settings = useStore((s) => s.settings);
  const { isAdmin } = useIsAdmin();

  if (pathname.endsWith("/editar")) return <Outlet />;

  const ind = indicators.find((i) => i.id === id);
  if (!ind) throw notFound();

  const indEntries = entries.filter((e) => e.indicator_id === id).sort((a, b) => a.period_end.localeCompare(b.period_end));
  const indTargets = targets.filter((t) => t.indicator_id === id);
  const sector = sectors.find((s) => s.id === ind.owner_sector_id);

  const chartData = indEntries.filter((e) => e.status === "aprovado").map((e) => {
    const t = indTargets.find((t) => t.id === e.target_id);
    return { period: formatMonth(e.period_end), realizado: e.actual_value ?? 0, meta: t?.target_value ?? 0 };
  });

  return (
    <div>
      <PageHeader
        title={ind.name}
        description={ind.description ?? "Detalhes, metas e histórico de lançamentos."}
        actions={<>
          <Button variant="outline" asChild><Link to="/indicadores">Voltar</Link></Button>
          {isAdmin && <Button variant="outline" asChild><Link to="/indicadores/$id/editar" params={{ id: ind.id }}><Pencil className="size-4" />Editar</Link></Button>}
          <Button asChild><Link to="/lancamentos/novo" search={{ indicator: ind.id }}>Lançar resultado</Link></Button>
        </>}
      />

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Setor</p>{sector && <Badge variant="outline" className="mt-1" style={{ borderColor: sector.color, color: sector.color }}>{sector.name}</Badge>}</CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Periodicidade</p><p className="text-sm mt-1">{indicatorPeriodLabel(ind)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Status</p><Badge variant="secondary" className="mt-1 capitalize">{ind.status}</Badge></CardContent></Card>
      </div>

      <Tabs defaultValue="definicao">
        <TabsList>
          <TabsTrigger value="definicao">Definição</TabsTrigger>
          <TabsTrigger value="metas">Metas</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="evolucao">Evolução</TabsTrigger>
        </TabsList>

        <TabsContent value="definicao">
          <Card><CardContent className="p-6 grid sm:grid-cols-2 gap-4 text-sm">
            <Item k="Objetivo" v={ind.objective ?? "—"} />
            <Item k="Pilar estratégico" v={ind.strategic_pillar ?? "—"} />
            <Item k="Público" v={ind.audience} />
            <Item k="Abrangência" v={ind.scope} />
            <Item k="Tipo de valor" v={`${ind.value_type}${ind.unit ? ` (${ind.unit})` : ""}`} />
            <Item k="Regra" v={ind.direction.replace("_", " ")} />
            <Item k="Forma de preenchimento" v={ind.input_method} />
            <Item k="Responsável" v={ind.responsible_ids?.length ? ind.responsible_ids.map((rid) => profiles.find((p) => p.id === rid)?.full_name ?? "—").join(", ") : "—"} />
            
            
            <Item k="Necessita aprovação" v={ind.requires_approval ? "Sim" : "Não"} />
            <Item k="Permite anexo" v={ind.allows_attachment ? "Sim" : "Não"} />
            <Item k="Fonte" v={ind.data_source ?? "—"} />
            <Item k="Início" v={formatDate(ind.start_date)} />
            {ind.instructions && <Item k="Instruções" v={ind.instructions} full />}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="metas">
          <Card><Table>
            <TableHeader><TableRow><TableHead>Escopo</TableHead><TableHead>Período</TableHead><TableHead>Meta</TableHead><TableHead>Peso</TableHead></TableRow></TableHeader>
            <TableBody>
              {indTargets.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="capitalize">{t.scope_type}</TableCell>
                  <TableCell>{formatDate(t.period_start)} — {formatDate(t.period_end)}</TableCell>
                  <TableCell className="font-mono">{formatValue(t.target_value, ind.value_type, ind.unit)}</TableCell>
                  <TableCell>{t.weight}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card><Table>
            <TableHeader><TableRow><TableHead>Período</TableHead><TableHead>Valor</TableHead><TableHead>Meta</TableHead><TableHead>%</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {indEntries.map((e) => {
                const t = indTargets.find((x) => x.id === e.target_id);
                const pct = computeAchievement(e, t, ind.direction);
                const c = classify(pct, settings);
                const cs = classificationStyles(c);
                return (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.period_end)}</TableCell>
                    <TableCell className="font-mono">{formatValue(e.actual_value, ind.value_type, ind.unit)}</TableCell>
                    <TableCell className="font-mono">{t ? formatValue(t.target_value, ind.value_type, ind.unit) : "—"}</TableCell>
                    <TableCell className="font-mono">{pct != null ? `${Math.round(pct)}%` : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={cs.className}>{cs.label}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table></Card>
        </TabsContent>

        <TabsContent value="evolucao">
          <Card><CardContent className="p-4"><div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="period" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
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

function Item({ k, v, full }: { k: string; v: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <p className="text-xs uppercase text-muted-foreground">{k}</p>
      <p className="mt-1">{v}</p>
    </div>
  );
}
