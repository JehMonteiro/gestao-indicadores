import { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { rotuloMes, truncar } from "@/lib/chamados-utils";
import type { Chamado } from "@/types/chamados";
import { CORES_SITUACAO_HEX } from "@/types/chamados";

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="h-72">{children}</div>
    </Card>
  );
}

const CONCLUIDAS = ["Concluído", "Resolvido"];

export function ChamadosGraficos({ chamados, loading }: { chamados: Chamado[]; loading?: boolean }) {
  const dados = useMemo(() => {
    const porMes = new Map<string, { mes: string; ordem: string; concluidos: number; andamento: number; aguardando: number }>();
    for (const c of chamados) {
      if (!c.aberto_em) continue;
      const ordem = c.aberto_em.slice(0, 7);
      const item = porMes.get(ordem) ?? { mes: rotuloMes(c.aberto_em), ordem, concluidos: 0, andamento: 0, aguardando: 0 };
      if (CONCLUIDAS.includes(c.situacao)) item.concluidos += 1;
      else if (c.situacao === "Em Andamento") item.andamento += 1;
      else item.aguardando += 1;
      porMes.set(ordem, item);
    }
    const evolucao = Array.from(porMes.values()).sort((a, b) => a.ordem.localeCompare(b.ordem));

    const porSituacao = new Map<string, number>();
    for (const c of chamados) porSituacao.set(c.situacao, (porSituacao.get(c.situacao) ?? 0) + 1);
    const situacoes = Array.from(porSituacao.entries()).map(([name, value]) => ({ name, value }));

    const porResp = new Map<string, { nome: string; total: number; noPrazo: number; tmaSoma: number; tmaQtd: number }>();
    for (const c of chamados) {
      const nome = c.responsavel ?? "Sem responsável";
      const it = porResp.get(nome) ?? { nome, total: 0, noPrazo: 0, tmaSoma: 0, tmaQtd: 0 };
      it.total += 1;
      if (c.no_prazo === true) it.noPrazo += 1;
      if (c.tma_horas != null) { it.tmaSoma += c.tma_horas; it.tmaQtd += 1; }
      porResp.set(nome, it);
    }
    const responsaveis = Array.from(porResp.values())
      .sort((a, b) => b.total - a.total).slice(0, 10)
      .map((r) => ({ nome: truncar(r.nome, 20), total: r.total, noPrazo: r.noPrazo }));
    const tmaPorResp = Array.from(porResp.values())
      .filter((r) => r.tmaQtd > 0)
      .map((r) => ({ nome: truncar(r.nome, 20), tma: Number((r.tmaSoma / r.tmaQtd).toFixed(1)) }))
      .sort((a, b) => b.tma - a.tma).slice(0, 10);
    const tmaMediaGeral = (() => {
      const vals = chamados.map((c) => c.tma_horas).filter((v): v is number => v != null);
      return vals.length ? Number((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)) : 0;
    })();

    const agrupar = (key: (c: Chamado) => string) => {
      const m = new Map<string, number>();
      for (const c of chamados) {
        const k = key(c);
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return Array.from(m.entries()).map(([nome, total]) => ({ nome: truncar(nome, 22), total }))
        .sort((a, b) => b.total - a.total).slice(0, 10);
    };

    const departamentos = agrupar((c) => c.departamento_recebimento ?? "Sem departamento");
    const categorias = agrupar((c) => c.categoria ?? "Sem categoria");

    const notas = [1, 2, 3, 4, 5].map((n) => ({
      nota: String(n),
      total: chamados.filter((c) => c.satisfacao_nota != null && Math.round(c.satisfacao_nota) === n).length,
    }));
    const avaliados = chamados.filter((c) => c.satisfacao_nota != null);
    const mediaNota = avaliados.length
      ? avaliados.reduce((s, c) => s + (c.satisfacao_nota ?? 0), 0) / avaliados.length
      : 0;

    const etiquetasMap = new Map<string, number>();
    for (const c of chamados) {
      if (!c.etiquetas?.length) etiquetasMap.set("Sem etiqueta", (etiquetasMap.get("Sem etiqueta") ?? 0) + 1);
      else for (const e of c.etiquetas) etiquetasMap.set(e, (etiquetasMap.get(e) ?? 0) + 1);
    }
    const etiquetas = Array.from(etiquetasMap.entries()).map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total);

    return { evolucao, situacoes, responsaveis, departamentos, categorias, notas, mediaNota, avaliados: avaliados.length, etiquetas, tmaPorResp, tmaMediaGeral };
  }, [chamados]);

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-lg" />)}
      </div>
    );
  }

  const corEtiqueta = (nome: string) =>
    nome === "Urgente" ? "#ef4444" : nome === "Importante" ? "#f59e0b" : nome === "Comercial" ? "#3b82f6" : "#94a3b8";
  const corNota = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e"];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Evolução Mensal de Chamados">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados.evolucao}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="mes" fontSize={12} />
            <YAxis fontSize={12} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="concluidos" name="Concluídos" stackId="a" fill="#22c55e" />
            <Bar dataKey="andamento" name="Em andamento" stackId="a" fill="#3b82f6" />
            <Bar dataKey="aguardando" name="Novo / aguardando" stackId="a" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Chamados por Situação">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={dados.situacoes} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} label>
              {dados.situacoes.map((s) => (
                <Cell key={s.name} fill={CORES_SITUACAO_HEX[s.name] ?? "#94a3b8"} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Performance por Responsável">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados.responsaveis} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="number" fontSize={12} allowDecimals={false} />
            <YAxis type="category" dataKey="nome" width={140} fontSize={11} />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" name="Total" fill="#3b82f6" />
            <Bar dataKey="noPrazo" name="No prazo" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Volume por Departamento">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados.departamentos} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="number" fontSize={12} allowDecimals={false} />
            <YAxis type="category" dataKey="nome" width={150} fontSize={11} />
            <Tooltip />
            <Bar dataKey="total" name="Chamados" fill="hsl(var(--chart-1, 217 91% 60%))" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Chamados por Categoria">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados.categorias} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="number" fontSize={12} allowDecimals={false} />
            <YAxis type="category" dataKey="nome" width={150} fontSize={11} />
            <Tooltip />
            <Bar dataKey="total" name="Chamados" fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={`Distribuição de Satisfação (${dados.avaliados} avaliados)`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados.notas}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="nota" fontSize={12} />
            <YAxis fontSize={12} allowDecimals={false} />
            <Tooltip />
            <ReferenceLine x={String(Math.round(dados.mediaNota))} stroke="#0f172a" strokeDasharray="4 4" label="Média" />
            <Bar dataKey="total" name="Chamados">
              {dados.notas.map((_, i) => <Cell key={i} fill={corNota[i]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Tempo Médio de Atendimento por Responsável (horas)">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados.tmaPorResp} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="number" fontSize={12} />
            <YAxis type="category" dataKey="nome" width={140} fontSize={11} />
            <Tooltip />
            <ReferenceLine x={dados.tmaMediaGeral} stroke="#ef4444" strokeDasharray="4 4" label="Média geral" />
            <Bar dataKey="tma" name="TMA (h)" fill="#0ea5e9" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Chamados por Etiqueta">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados.etiquetas}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="nome" fontSize={12} />
            <YAxis fontSize={12} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="total" name="Chamados">
              {dados.etiquetas.map((e) => <Cell key={e.nome} fill={corEtiqueta(e.nome)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
