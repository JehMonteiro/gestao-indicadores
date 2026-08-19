import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Pie, PieChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatarHoras } from "@/lib/chamados-utils";
import {
  distribuicaoSatisfacao, evolucaoMensal, histogramaInteracoes, mediaInteracoes, porCategoria,
  porEtiqueta, porSituacao, tmaPorResponsavel, topDepartamentos, topResponsaveis, topSolicitantes,
  topUnidades, type DimensaoInteracoes,
} from "@/lib/chamados-agregacoes";
import type { Chamado } from "@/types/chamados";
import { CORES_SITUACAO_HEX } from "@/types/chamados";

const AZUL = "var(--chart-1)";
const VERDE = "var(--chart-2)";
const AMBAR = "var(--chart-3)";
const ROXO = "var(--chart-4)";
const CIANO = "var(--chart-5)";

function ChartCard({
  title, badge, height = 280, full, children,
}: {
  title: string;
  badge?: React.ReactNode;
  height?: number;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn(full && "lg:col-span-2")}>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {badge ? <div className="flex items-center gap-2 text-xs text-muted-foreground">{badge}</div> : null}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function Caixa({ titulo, linhas }: { titulo: string; linhas: string[] }) {
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-sm">
      <p className="font-medium mb-1">{titulo}</p>
      {linhas.map((l) => <p key={l} className="text-muted-foreground">{l}</p>)}
    </div>
  );
}

const pct = (parte: number, total: number) => (total ? Math.round((parte / total) * 100) : 0);

export function ChamadosGraficos({ chamados, loading }: { chamados: Chamado[]; loading?: boolean }) {
  const [dimensao, setDimensao] = useState<DimensaoInteracoes>("responsavel");

  const d = useMemo(() => ({
    evolucao: evolucaoMensal(chamados),
    situacoes: porSituacao(chamados),
    etiquetas: porEtiqueta(chamados),
    responsaveis: topResponsaveis(chamados),
    solicitantes: topSolicitantes(chamados),
    departamentos: topDepartamentos(chamados),
    unidades: topUnidades(chamados),
    categorias: porCategoria(chamados),
    satisfacao: distribuicaoSatisfacao(chamados),
    tma: tmaPorResponsavel(chamados),
    histograma: histogramaInteracoes(chamados),
    distintos: {
      responsaveis: new Set(chamados.map((c) => c.responsavel ?? "—")).size,
      solicitantes: new Set(chamados.map((c) => c.solicitante ?? "—")).size,
      unidades: new Set(chamados.map((c) => c.unidade).filter(Boolean)).size,
    },
  }), [chamados]);

  const interacoes = useMemo(() => mediaInteracoes(chamados, dimensao), [chamados, dimensao]);

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-lg" />)}
      </div>
    );
  }

  const total = chamados.length;
  const mediaTop = (vals: number[]) => (vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0);
  const corEtiqueta = (nome: string) =>
    nome === "Urgente" ? "var(--destructive)"
      : nome === "Importante" ? AMBAR
      : nome === "Comercial" ? AZUL
      : "var(--muted-foreground)";
  const corNota = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e"];
  const eixoHoras = (v: number) => (v >= 24 ? `${Math.round(v / 24)}d` : `${v.toFixed(1)}h`);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* BLOCO A */}
      <ChartCard title="Evolução Mensal de Chamados" badge={<Badge variant="secondary">{total} chamados</Badge>} full>
        <BarChart data={d.evolucao}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="mes" fontSize={12} />
          <YAxis fontSize={12} allowDecimals={false} />
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <Caixa
                  titulo={String(label)}
                  linhas={[
                    ...payload.map((p) => `${p.name}: ${p.value}`),
                    `Total: ${payload.reduce((s, p) => s + Number(p.value ?? 0), 0)}`,
                  ]}
                />
              ) : null
            }
          />
          <Legend />
          <Bar dataKey="finalizados" name="Finalizados" stackId="a" fill={VERDE} />
          <Bar dataKey="andamento" name="Em Andamento" stackId="a" fill={AZUL} />
          <Bar dataKey="aguardando" name="Aguardando" stackId="a" fill={AMBAR} />
        </BarChart>
      </ChartCard>

      <ChartCard title="Chamados por Situação" badge={<Badge variant="secondary">{total} chamados</Badge>}>
        <PieChart>
          <Pie data={d.situacoes} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} cx="40%">
            {d.situacoes.map((s) => <Cell key={s.name} fill={CORES_SITUACAO_HEX[s.name] ?? "#94a3b8"} />)}
          </Pie>
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <Caixa
                  titulo={String(payload[0]?.name)}
                  linhas={[`${payload[0]?.value} chamados`, `${pct(Number(payload[0]?.value ?? 0), total)}% do total`]}
                />
              ) : null
            }
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value) => {
              const item = d.situacoes.find((s) => s.name === value);
              return <span className="text-xs">{`${value} — ${pct(item?.value ?? 0, total)}%`}</span>;
            }}
          />
        </PieChart>
      </ChartCard>

      <ChartCard title="Chamados por Etiqueta" badge={<Badge variant="secondary">{d.etiquetas.length} etiquetas</Badge>}>
        <BarChart data={d.etiquetas}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="nome" fontSize={12} />
          <YAxis fontSize={12} allowDecimals={false} />
          <Tooltip cursor={{ opacity: 0.1 }} />
          <Bar dataKey="total" name="Chamados">
            <LabelList dataKey="total" position="top" className="fill-foreground text-xs" />
            {d.etiquetas.map((e) => <Cell key={e.nome} fill={corEtiqueta(e.nome)} />)}
          </Bar>
        </BarChart>
      </ChartCard>

      {/* BLOCO B */}
      <ChartCard
        title="Top 10 Responsáveis"
        badge={<Badge variant="secondary">{d.distintos.responsaveis} responsáveis</Badge>}
        height={360}
        full
      >
        <BarChart data={d.responsaveis} layout="vertical" margin={{ left: 40 }} barGap={4} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis type="number" fontSize={12} allowDecimals={false} />
          <YAxis type="category" dataKey="nome" width={160} fontSize={11} />
          <Tooltip
            content={({ active, payload }) => {
              const it = payload?.[0]?.payload as { nomeCompleto: string; total: number; destaque: number } | undefined;
              return active && it ? (
                <Caixa
                  titulo={it.nomeCompleto}
                  linhas={[
                    `Total: ${it.total}`,
                    `No Prazo: ${it.destaque} (${pct(it.destaque, it.total)}%)`,
                    `Fora do Prazo: ${it.total - it.destaque}`,
                  ]}
                />
              ) : null;
            }}
          />
          <Legend />
          <ReferenceLine
            x={mediaTop(d.responsaveis.map((r) => r.total))}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{ value: "Média", position: "top", fontSize: 11 }}
          />
          <Bar dataKey="total" name="Total" fill={AZUL} />
          <Bar dataKey="destaque" name="No Prazo" fill={VERDE} />
        </BarChart>
      </ChartCard>

      <ChartCard
        title="Top 10 Solicitantes"
        badge={<Badge variant="secondary">{d.distintos.solicitantes} solicitantes</Badge>}
        height={360}
        full
      >
        <BarChart data={d.solicitantes} layout="vertical" margin={{ left: 40 }} barGap={4} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis type="number" fontSize={12} allowDecimals={false} />
          <YAxis type="category" dataKey="nome" width={160} fontSize={11} />
          <Tooltip
            content={({ active, payload }) => {
              const it = payload?.[0]?.payload as { nomeCompleto: string; total: number; destaque: number } | undefined;
              return active && it ? (
                <Caixa
                  titulo={it.nomeCompleto}
                  linhas={[
                    `Total: ${it.total}`,
                    `Concluídos: ${it.destaque} (${pct(it.destaque, it.total)}%)`,
                    `Em aberto: ${it.total - it.destaque}`,
                  ]}
                />
              ) : null;
            }}
          />
          <Legend />
          <ReferenceLine
            x={mediaTop(d.solicitantes.map((r) => r.total))}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{ value: "Média", position: "top", fontSize: 11 }}
          />
          <Bar dataKey="total" name="Total" fill={AZUL} />
          <Bar dataKey="destaque" name="Concluídos" fill={VERDE} />
        </BarChart>
      </ChartCard>

      {/* BLOCO C */}
      <ChartCard
        title="Top 10 Departamentos de Recebimento"
        badge={<Badge variant="secondary">{d.departamentos.distintos} departamentos</Badge>}
        height={360}
        full
      >
        <BarChart data={d.departamentos.itens} layout="vertical" margin={{ left: 40 }} barGap={4} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis type="number" fontSize={12} allowDecimals={false} />
          <YAxis type="category" dataKey="nome" width={200} fontSize={11} />
          <Tooltip
            content={({ active, payload }) => {
              const it = payload?.[0]?.payload as
                | { nomeCompleto: string; total: number; noPrazo: number; emAberto: number }
                | undefined;
              return active && it ? (
                <Caixa
                  titulo={it.nomeCompleto}
                  linhas={[
                    `Total: ${it.total}`,
                    `No Prazo: ${it.noPrazo} (${pct(it.noPrazo, it.total)}%)`,
                    `Em Aberto: ${it.emAberto}`,
                  ]}
                />
              ) : null;
            }}
          />
          <Legend />
          <Bar dataKey="total" name="Total" fill={AZUL} />
          <Bar dataKey="noPrazo" name="No Prazo" fill={VERDE} />
          <Bar dataKey="emAberto" name="Em Aberto" fill={AMBAR} />
        </BarChart>
      </ChartCard>

      <ChartCard
        title="Top 10 Unidades"
        badge={<Badge variant="secondary">{d.distintos.unidades} unidades</Badge>}
        height={360}
        full
      >
        <BarChart data={d.unidades} layout="vertical" margin={{ left: 40 }} barGap={4} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis type="number" fontSize={12} allowDecimals={false} />
          <YAxis type="category" dataKey="nome" width={180} fontSize={11} />
          <Tooltip
            content={({ active, payload }) => {
              const it = payload?.[0]?.payload as { nomeCompleto: string; total: number; destaque: number } | undefined;
              return active && it ? (
                <Caixa
                  titulo={it.nomeCompleto}
                  linhas={[
                    `Total: ${it.total}`,
                    `Concluídos: ${it.destaque} (${pct(it.destaque, it.total)}%)`,
                    `Em aberto: ${it.total - it.destaque}`,
                  ]}
                />
              ) : null;
            }}
          />
          <Legend />
          <ReferenceLine
            x={mediaTop(d.unidades.map((r) => r.total))}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{ value: "Média", position: "top", fontSize: 11 }}
          />
          <Bar dataKey="total" name="Total" fill={AZUL} />
          <Bar dataKey="destaque" name="Concluídos" fill={VERDE} />
        </BarChart>
      </ChartCard>

      {/* BLOCO D */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Média de Interações</h3>
            {([
              ["responsavel", "Por Responsável"],
              ["departamento", "Por Departamento"],
              ["categoria", "Por Categoria"],
            ] as const).map(([valor, rotulo]) => (
              <Button
                key={valor}
                size="sm"
                variant="outline"
                aria-pressed={dimensao === valor}
                className={cn(dimensao === valor && "bg-accent text-accent-foreground")}
                onClick={() => setDimensao(valor)}
              >
                {rotulo}
              </Button>
            ))}
          </div>
          <Badge variant="secondary">Média geral: {interacoes.geral.toFixed(1)} interações/chamado</Badge>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={interacoes.itens} layout="vertical" margin={{ left: 40, right: 32 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" fontSize={12} />
              <YAxis type="category" dataKey="nome" width={170} fontSize={11} />
              <Tooltip
                content={({ active, payload }) => {
                  const it = payload?.[0]?.payload as
                    | { nomeCompleto: string; mediaInteracoes: number; totalChamados: number; interacoesTotais: number }
                    | undefined;
                  return active && it ? (
                    <Caixa
                      titulo={it.nomeCompleto}
                      linhas={[
                        `Média de interações: ${it.mediaInteracoes.toFixed(1)}`,
                        `Total de chamados: ${it.totalChamados}`,
                        `Interações totais: ${it.interacoesTotais}`,
                      ]}
                    />
                  ) : null;
                }}
              />
              <ReferenceLine
                x={interacoes.geral}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                label={{ value: `Média geral: ${interacoes.geral.toFixed(1)}`, position: "top", fontSize: 11 }}
              />
              <Bar dataKey="mediaInteracoes" name="Média de interações" fill={ROXO}>
                <LabelList
                  dataKey="mediaInteracoes"
                  position="right"
                  className="fill-foreground text-xs"
                  formatter={(v: number) => v.toFixed(1)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* BLOCO E */}
      <ChartCard
        title="Chamados por Categoria de Assunto"
        badge={<Badge variant="secondary">{d.categorias.distintas} categorias</Badge>}
        height={320}
      >
        <BarChart data={d.categorias.itens} layout="vertical" margin={{ left: 20, right: 32 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis type="number" fontSize={12} allowDecimals={false} />
          <YAxis type="category" dataKey="nome" width={150} fontSize={11} />
          <Tooltip cursor={{ opacity: 0.1 }} />
          <Bar dataKey="total" name="Chamados" fill={CIANO}>
            <LabelList
              dataKey="percentual"
              position="right"
              className="fill-foreground text-xs"
              formatter={(v: number) => `${v}%`}
            />
          </Bar>
        </BarChart>
      </ChartCard>

      <ChartCard
        title="Distribuição de Satisfação"
        height={320}
        badge={
          <>
            <Badge variant="secondary">★ {d.satisfacao.media.toFixed(1)} média</Badge>
            <span>({d.satisfacao.avaliados} avaliados)</span>
          </>
        }
      >
        <BarChart data={d.satisfacao.itens}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="nota" fontSize={12} />
          <YAxis fontSize={12} allowDecimals={false} />
          <Tooltip cursor={{ opacity: 0.1 }} />
          <ReferenceLine
            x={String(Math.round(d.satisfacao.media))}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{ value: `Média ${d.satisfacao.media.toFixed(1)}`, position: "top", fontSize: 11 }}
          />
          <Bar dataKey="total" name="Chamados">
            <LabelList dataKey="total" position="top" className="fill-foreground text-xs" />
            {d.satisfacao.itens.map((_, i) => <Cell key={i} fill={corNota[i]} />)}
          </Bar>
        </BarChart>
      </ChartCard>

      <ChartCard
        title="TMA por Responsável"
        height={320}
        badge={<Badge variant="secondary">TMA médio: {formatarHoras(d.tma.geral)}</Badge>}
      >
        <BarChart data={d.tma.itens} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis type="number" fontSize={12} tickFormatter={eixoHoras} />
          <YAxis type="category" dataKey="nome" width={150} fontSize={11} />
          <Tooltip
            content={({ active, payload }) => {
              const it = payload?.[0]?.payload as
                | { nomeCompleto: string; tma: number; chamados: number }
                | undefined;
              return active && it ? (
                <Caixa
                  titulo={it.nomeCompleto}
                  linhas={[`TMA médio: ${formatarHoras(it.tma)}`, `Chamados considerados: ${it.chamados}`]}
                />
              ) : null;
            }}
          />
          <ReferenceLine
            x={d.tma.geral}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{ value: `Média: ${formatarHoras(d.tma.geral)}`, position: "top", fontSize: 11 }}
          />
          <Bar dataKey="tma" name="TMA" fill={ROXO} />
        </BarChart>
      </ChartCard>

      <ChartCard
        title="Distribuição de Volume de Interações"
        height={320}
        badge={
          <>
            <Badge variant="secondary">Mediana: {d.histograma.mediana} interações</Badge>
            <span>Máximo: {d.histograma.maximo}</span>
          </>
        }
      >
        <BarChart data={d.histograma.itens}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="faixa" fontSize={12} />
          <YAxis fontSize={12} allowDecimals={false} />
          <Tooltip
            content={({ active, payload }) => {
              const it = payload?.[0]?.payload as
                | { faixa: string; total: number; percentual: number; mediaFaixa: number }
                | undefined;
              return active && it ? (
                <Caixa
                  titulo={`Faixa ${it.faixa}`}
                  linhas={[
                    `${it.total} chamados (${it.percentual}%)`,
                    `Média da faixa: ${it.mediaFaixa.toFixed(1)} interações`,
                  ]}
                />
              ) : null;
            }}
          />
          <Bar dataKey="total" name="Chamados" fill={AZUL} fillOpacity={0.8} />
        </BarChart>
      </ChartCard>
    </div>
  );
}
