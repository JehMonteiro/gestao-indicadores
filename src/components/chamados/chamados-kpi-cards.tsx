import {
  AlertTriangle, CheckCircle2, Clock, Inbox, MessageSquare, Star, Timer, TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarHoras, formatarPercentual } from "@/lib/chamados-utils";
import type { KPIsChamados } from "@/hooks/use-chamados";

function KpiCard({
  label, valor, sub, icon: Icon, tone,
}: {
  label: string;
  valor: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: string;
}) {
  return (
    <Card className="p-4 bg-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className={`size-4 ${tone ?? "text-muted-foreground"}`} />
      </div>
      <p className="text-2xl font-semibold tabular-nums mt-2">{valor}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </Card>
  );
}

export function ChamadosKPICards({ kpis, loading }: { kpis: KPIsChamados; loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
    );
  }

  const prazoTone =
    kpis.percentualNoPrazo == null ? "text-muted-foreground"
      : kpis.percentualNoPrazo >= 80 ? "text-success"
        : kpis.percentualNoPrazo >= 50 ? "text-warning" : "text-destructive";

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-3">
      <KpiCard label="Total de chamados" valor={String(kpis.total)} sub="no período filtrado" icon={Inbox} tone="text-primary" />
      <KpiCard label="Em aberto" valor={String(kpis.emAberto)} sub="Novo, andamento e aguardando" icon={TrendingUp} tone="text-warning" />
      <KpiCard label="Concluídos" valor={String(kpis.concluidos)} sub="Concluídos + resolvidos" icon={CheckCircle2} tone="text-success" />
      <KpiCard label="TMA" valor={formatarHoras(kpis.tmaMedio)} sub="Tempo médio de atendimento" icon={Clock} tone="text-info" />
      <KpiCard label="TMR" valor={formatarHoras(kpis.tmrMedio)} sub="Tempo até a 1ª resposta" icon={Timer} tone="text-info" />
      <KpiCard
        label="Satisfação"
        valor={kpis.satisfacaoMedia == null ? "—" : `${kpis.satisfacaoMedia.toFixed(1)} / 5`}
        sub={`${formatarPercentual(kpis.percentualAvaliados)} avaliados (${kpis.totalAvaliados})`}
        icon={Star}
        tone="text-warning"
      />
      <KpiCard label="% no prazo" valor={formatarPercentual(kpis.percentualNoPrazo)} sub={`${kpis.noPrazo} dos concluídos`} icon={CheckCircle2} tone={prazoTone} />
      <KpiCard label="Fora do prazo" valor={formatarPercentual(kpis.percentualForaPrazo)} sub={`${kpis.foraDoPrazo} chamados`} icon={AlertTriangle} tone="text-destructive" />
      <KpiCard
        label="Média de interações"
        valor={kpis.interacaoMedia == null ? "—" : kpis.interacaoMedia.toFixed(1)}
        sub="por chamado"
        icon={MessageSquare}
      />
    </div>
  );
}
