import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/app/page-header";
import {
  CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  CalendarClock, CheckCircle2, ClipboardList, Clock, ListChecks, Pencil, Send,
} from "lucide-react";
import { formatDate, formatValue } from "@/lib/format";
import type { Classification } from "@/lib/format";
import type { Indicator, IndicatorEntry } from "@/mocks/types";

export type PeriodOption = "3m" | "6m" | "12m";

export const CLASSIFICATION_META: Record<Classification, { label: string; color: string; className: string }> = {
  atingido: { label: "Atingido", color: "var(--success)", className: "bg-success/15 text-success border-success/30" },
  atencao: { label: "Em atenção", color: "var(--warning)", className: "bg-warning/15 text-warning-foreground border-warning/40" },
  critico: { label: "Crítico", color: "var(--destructive)", className: "bg-destructive/15 text-destructive border-destructive/30" },
  sem_info: { label: "Sem lançamento", color: "var(--muted-foreground)", className: "bg-muted text-muted-foreground border-border" },
};

export function ChartSkeleton({ height = 256 }: { height?: number }) {
  return <Skeleton className="w-full rounded-md" style={{ height }} />;
}

/* ---------------- Seção 2: evolução ---------------- */

export function MyEvolutionCard({
  data, period, onPeriodChange, loading,
}: {
  data: { label: string; valor: number | null }[];
  period: PeriodOption;
  onPeriodChange: (p: PeriodOption) => void;
  loading?: boolean;
}) {
  const hasData = data.some((d) => d.valor != null);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Evolução do meu desempenho</CardTitle>
        <Select value={period} onValueChange={(v) => onPeriodChange(v as PeriodOption)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3m">3 meses</SelectItem>
            <SelectItem value="6m">6 meses</SelectItem>
            <SelectItem value="12m">12 meses</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? <ChartSkeleton /> : !hasData ? (
          <EmptyState
            title="Sem histórico de desempenho"
            description="Faça lançamentos para acompanhar sua evolução mês a mês."
            icon={<ClipboardList className="size-5" />}
          />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} unit="%" tickFormatter={(v: number) => String(Math.round(v))} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }}
                  formatter={(v: unknown) => [`${Math.round(Number(v))}%`, "Atingimento"]}
                  labelFormatter={(l: unknown) => `Mês: ${String(l)}`}
                />
                <ReferenceLine y={100} stroke="var(--muted-foreground)" strokeDasharray="6 4" />
                <Line type="monotone" dataKey="valor" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Seção 3: status ---------------- */

export function MyStatusDonut({
  counts, loading,
}: { counts: Record<Classification, number>; loading?: boolean }) {
  const order: Classification[] = ["atingido", "atencao", "critico", "sem_info"];
  const total = order.reduce((s, k) => s + counts[k], 0);
  const data = order.map((k) => ({ key: k, name: CLASSIFICATION_META[k].label, value: counts[k], fill: CLASSIFICATION_META[k].color }));

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Meus indicadores por status</CardTitle></CardHeader>
      <CardContent>
        {loading ? <ChartSkeleton /> : total === 0 ? (
          <EmptyState title="Nenhum indicador para classificar" icon={<ListChecks className="size-5" />} />
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative h-56 w-56 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="value" innerRadius={62} outerRadius={88} paddingAngle={2}>
                    {data.map((d) => <Cell key={d.key} fill={d.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center">
                  <p className="text-3xl font-semibold font-mono">{total}</p>
                  <p className="text-xs text-muted-foreground">indicadores</p>
                </div>
              </div>
            </div>
            <ul className="flex-1 w-full space-y-2">
              {data.map((d) => (
                <li key={d.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: d.fill }} />
                    {d.name}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {d.value} · {total ? Math.round((d.value / total) * 100) : 0}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Seção 4: tabela ---------------- */

export type MyIndicatorRow = {
  indicator: Indicator;
  sectorName?: string;
  periodLabel: string;
  actual?: number;
  target?: number;
  percent: number | null;
  classification: Classification;
  entryId?: string;
};

const PAGE_SIZE = 10;

export function MyIndicatorsTable({ rows, loading }: { rows: MyIndicatorRow[]; loading?: boolean }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const slice = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Meus indicadores detalhados</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nenhum indicador atribuído a você no momento"
            description="Fale com o seu gestor para receber indicadores sob sua responsabilidade."
            icon={<ListChecks className="size-5" />}
            action={<Button variant="outline" asChild><Link to="/perfil">Falar com meu gestor</Link></Button>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Indicador</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Período atual</TableHead>
                  <TableHead>Realizado</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Atingimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {slice.map((r) => {
                    const meta = CLASSIFICATION_META[r.classification];
                    return (
                      <TableRow key={r.indicator.id}>
                        <TableCell>
                          <p className="font-medium">{r.indicator.name}</p>
                          <p className="text-xs font-mono text-muted-foreground">{r.indicator.code}</p>
                        </TableCell>
                        <TableCell className="text-sm">{r.sectorName ?? "—"}</TableCell>
                        <TableCell className="text-sm">{r.periodLabel}</TableCell>
                        <TableCell className="font-mono">{r.actual != null ? formatValue(r.actual, r.indicator.value_type) : "—"}</TableCell>
                        <TableCell className="font-mono">{r.target != null ? formatValue(r.target, r.indicator.value_type) : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={meta.className}>{r.percent != null ? `${Math.round(r.percent)}%` : "—"}</Badge>
                        </TableCell>
                        <TableCell><Badge variant="outline" className={meta.className}>{meta.label}</Badge></TableCell>
                        <TableCell className="text-right">
                          {r.entryId ? (
                            <Button size="sm" variant="outline" asChild>
                              <Link to="/lancamentos/$id" params={{ id: r.entryId }}>Ver</Link>
                            </Button>
                          ) : (
                            <Button size="sm" asChild>
                              <Link to="/lancamentos/novo" search={{ indicator: r.indicator.id }}>Lançar</Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">Página {current + 1} de {pages}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={current === 0} onClick={() => setPage(current - 1)}>Anterior</Button>
                  <Button size="sm" variant="outline" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Próxima</Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Seção 5: prazos ---------------- */

export type DeadlineItem = {
  indicator: Indicator;
  frequencyLabel: string;
  dueDate: string;
  daysLeft: number;
};

export function MyDeadlines({ items, loading }: { items: DeadlineItem[]; loading?: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Próximos prazos</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
        ) : items.length === 0 ? (
          <EmptyState title="Nenhum prazo em aberto" description="Todos os lançamentos do período estão em dia." icon={<CheckCircle2 className="size-5" />} />
        ) : (
          items.map((d) => {
            const tone = d.daysLeft <= 3
              ? "bg-destructive/15 text-destructive border-destructive/30"
              : d.daysLeft <= 7
                ? "bg-warning/15 text-warning-foreground border-warning/40"
                : "bg-muted text-muted-foreground border-border";
            return (
              <div key={d.indicator.id} className="flex items-center justify-between gap-3 p-3 rounded-md border">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.indicator.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarClock className="size-3" />
                    {d.frequencyLabel} · limite {formatDate(d.dueDate)}
                  </p>
                </div>
                <Badge variant="outline" className={tone}>
                  {d.daysLeft < 0 ? `${Math.abs(d.daysLeft)}d em atraso` : d.daysLeft === 0 ? "Vence hoje" : `${d.daysLeft} dias`}
                </Badge>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Seção 6: histórico ---------------- */

const STATUS_META: Record<string, { label: string; className: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  registrado: { label: "Registrado", className: "bg-success/15 text-success border-success/30", icon: CheckCircle2, tone: "text-success" },
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground border-border", icon: Pencil, tone: "text-muted-foreground" },
  atrasado: { label: "Atrasado", className: "bg-destructive/15 text-destructive border-destructive/30", icon: Clock, tone: "text-destructive" },
};

export function MyRecentHistory({
  entries, indicators, loading,
}: { entries: IndicatorEntry[]; indicators: Indicator[]; loading?: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Histórico recente</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : entries.length === 0 ? (
          <EmptyState title="Nenhum lançamento ainda" description="Seus lançamentos aparecerão aqui." icon={<Send className="size-5" />} />
        ) : (
          <ol className="relative border-l pl-5 space-y-4">
            {entries.map((e) => {
              const ind = indicators.find((i) => i.id === e.indicator_id);
              const meta = STATUS_META[e.status] ?? STATUS_META.rascunho;
              const Icon = meta.icon;
              return (
                <li key={e.id} className="relative">
                  <span className={`absolute -left-[27px] top-0.5 grid place-items-center size-5 rounded-full bg-background border ${meta.tone}`}>
                    <Icon className="size-3" />
                  </span>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{ind?.name ?? "Indicador"}</p>
                      <p className="text-xs text-muted-foreground">
                        {ind && e.actual_value != null ? formatValue(e.actual_value, ind.value_type) : "—"} · {formatDate(e.submitted_at ?? e.created_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-4">
          <Button variant="link" className="px-0" asChild><Link to="/lancamentos">Ver todos os lançamentos</Link></Button>
        </div>
      </CardContent>
    </Card>
  );
}
