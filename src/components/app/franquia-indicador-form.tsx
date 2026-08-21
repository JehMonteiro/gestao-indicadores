import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, useCurrentUser } from "@/mocks/store";
import { loadAllFromSupabase } from "@/lib/supabase-data";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { newId } from "@/lib/ids";
import { makeUniqueIndicatorCode } from "@/lib/indicator-code";
import { isFranquia } from "@/lib/entity-kind";

import { KPI_GROUPS } from "@/lib/format";
import { firstIntegerError, numericStep, blockDecimalKeys } from "@/lib/value-rules";
import type { Direction, Frequency, Indicator, IndicatorStatus, KpiGroup, ValueType } from "@/mocks/types";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

type FormState = {
  name: string;
  objective: string;
  responsible_id: string;
  kpi_group: KpiGroup;
  value_type: ValueType;
  frequency: Frequency;
  direction: Direction;
  default_target: number;
  minimum_value?: number;
  maximum_value?: number;
  warning_threshold: number;
  critical_threshold: number;
  start_date: string;
  end_date: string;
  status: IndicatorStatus;
};

function fromIndicator(i: Indicator): FormState {
  return {
    name: i.name,
    objective: i.objective ?? "",
    responsible_id: i.responsible_ids?.[0] ?? "",
    kpi_group: i.kpi_group ?? "resultado",
    value_type: i.value_type,
    frequency: i.frequency,
    direction: i.direction,
    default_target: i.default_target ?? 0,
    minimum_value: i.minimum_value,
    maximum_value: i.maximum_value,
    warning_threshold: i.warning_threshold ?? 80,
    critical_threshold: i.critical_threshold ?? 60,
    start_date: i.start_date ?? new Date().toISOString().slice(0, 10),
    end_date: i.end_date ?? "",
    status: i.status,
  };
}

function emptyForm(): FormState {
  return {
    name: "", objective: "", responsible_id: "",
    kpi_group: "resultado", value_type: "inteiro", frequency: "mensal", direction: "maior_melhor",
    default_target: 0, warning_threshold: 80, critical_threshold: 60,
    start_date: new Date().toISOString().slice(0, 10), end_date: "",
    status: "ativo",
  };
}

export function FranquiaIndicadorForm({
  franchiseId,
  existing,
  allFranchises = false,
}: { franchiseId?: string; existing?: Indicator; allFranchises?: boolean }) {
  const franchises = useStore((s) => s.franchises);
  const profiles = useStore((s) => s.profiles);
  const userFranchises = useStore((s) => s.userFranchises);
  const indicators = useStore((s) => s.indicators);
  const upsert = useStore((s) => s.upsertIndicator);
  const logAudit = useStore((s) => s.logAudit);
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const unidades = franchises.filter(isFranquia);
  const franchise = franchises.find((fr) => fr.id === franchiseId);
  const [f, setF] = useState<FormState>(existing ? fromIndicator(existing) : emptyForm());
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));

  const linkedIds = new Set(userFranchises.filter((uf) => uf.franchise_id === franchiseId).map((uf) => uf.user_id));
  const linkedProfiles = profiles.filter((p) => linkedIds.has(p.id));
  const responsibleOptions = allFranchises
    ? profiles
    : linkedProfiles.length > 0 ? linkedProfiles : profiles;

  const buildIndicator = (targetId: string, code: string, base?: Indicator): Indicator => ({
    ...(base ?? {
      id: newId(),
      code,
      name: f.name,
      shared_sector_ids: [],
      owner_sector_id: "",
      responsible_ids: [],
      scope: "franquia" as const,
      weight: 1,
      kpi_group: f.kpi_group,
      value_type: f.value_type,
      frequency: f.frequency,
      direction: f.direction,
      start_date: f.start_date,
      status: f.status,
      created_by: user?.id ?? "",
      created_at: new Date().toISOString(),
    }),
    name: f.name,
    objective: f.objective || undefined,
    owner_sector_id: "",
    responsible_ids: f.responsible_id ? [f.responsible_id] : [],
    kpi_group: f.kpi_group,
    value_type: f.value_type,
    frequency: f.frequency,
    direction: f.direction,
    default_target: f.default_target,
    minimum_value: f.minimum_value,
    maximum_value: f.maximum_value,
    warning_threshold: f.warning_threshold,
    critical_threshold: f.critical_threshold,
    start_date: f.start_date,
    end_date: f.end_date || undefined,
    status: f.status,
    scope: "franquia",
    entity_scope: "franquia",
    entity_id: targetId,
    franchise_id: targetId,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) { toast.error("Informe o nome do indicador"); return; }
    const intError = firstIntegerError(f.value_type, [
      { label: "Meta padrão", value: f.default_target },
      { label: "Valor mínimo", value: f.minimum_value },
      { label: "Valor máximo", value: f.maximum_value },
    ]);
    if (intError) { toast.error(intError); return; }

    if (allFranchises) {
      if (unidades.length === 0) { toast.error("Nenhuma franquia cadastrada"); return; }
      const usedCodes = indicators.map((i) => i.code);
      for (const u of unidades) {
        const code = makeUniqueIndicatorCode(f.name, usedCodes);
        usedCodes.push(code);
        const ind = buildIndicator(u.id, code);
        await upsert(ind);
        logAudit({ user_id: user?.id ?? "", action: "create", entity_type: "indicator", entity_id: ind.id });
      }
      if (user?.id) {
        const data = await loadAllFromSupabase(user.id);
        useStore.getState().hydrate(data);
      }
      toast.success(`${unidades.length} indicadores criados`);
      navigate({ to: "/indicadores-franquia" });
      return;
    }

    if (!franchiseId) { toast.error("Franquia não encontrada"); return; }
    const ind = buildIndicator(
      franchiseId,
      makeUniqueIndicatorCode(f.name, indicators.map((i) => i.code)),
      existing,
    );

    await upsert(ind);
    if (user?.id) {
      const data = await loadAllFromSupabase(user.id);
      useStore.getState().hydrate(data);
    }
    logAudit({ user_id: user?.id ?? "", action: existing ? "update" : "create", entity_type: "indicator", entity_id: ind.id });
    toast.success(existing ? "Indicador atualizado" : "Indicador criado com sucesso");
    navigate({ to: "/franquias/$id", params: { id: franchiseId } });
  };


  if (!adminLoading && !isAdmin) {
    return (
      <div>
        <PageHeader title="Indicador da franquia" description="Apenas administradores podem gerenciar indicadores." />
        <EmptyState title="Acesso restrito" description="Você não tem permissão para esta ação." icon={<ShieldAlert className="size-5" />} />
      </div>
    );
  }

  return (
    <div>
      <nav aria-label="breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link to="/franquias" className="hover:underline">Franquias</Link>
        <span>›</span>
        {allFranchises || !franchiseId ? (
          <span>Todas as franquias</span>
        ) : (
          <Link to="/franquias/$id" params={{ id: franchiseId }} className="hover:underline">{franchise?.name ?? "Unidade"}</Link>
        )}
        <span>›</span>
        <span>Indicadores</span>
        <span>›</span>
        <span className="text-foreground">{existing ? "Editar indicador" : "Novo indicador"}</span>
      </nav>

      <PageHeader
        title={existing ? `Editar: ${existing.name}` : allFranchises ? "Novo indicador para todas as franquias" : "Novo indicador da franquia"}
        description={allFranchises
          ? `Será criado um indicador independente para cada uma das ${unidades.length} unidades.`
          : `Indicador da unidade ${franchise?.name ?? ""}`.trim()}
      />

      <form onSubmit={submit} className="space-y-4 max-w-4xl">
        <Card>
          <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <Field label="Franquia">
              <Input
                value={allFranchises ? `Todas as franquias (${unidades.length} unidades)` : franchise?.name ?? ""}
                readOnly
                disabled
              />
            </Field>

            <Field label="Nome"><Input value={f.name} onChange={(e) => set("name", e.target.value)} required /></Field>
            <Field label="Objetivo"><Textarea value={f.objective} onChange={(e) => set("objective", e.target.value)} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Classificação</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3">
            <Field label="Grupo estratégico">
              <Select value={f.kpi_group} onValueChange={(v) => set("kpi_group", v as KpiGroup)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KPI_GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label} — {g.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Colaborador responsável">
              <Select value={f.responsible_id || "none"} onValueChange={(v) => set("responsible_id", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="— Sem responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem responsável</SelectItem>
                  {responsibleOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={f.status} onValueChange={(v) => set("status", v as IndicatorStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Mensuração</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3">
            <Field label="Tipo de valor">
              <Select value={f.value_type} onValueChange={(v) => set("value_type", v as ValueType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["inteiro", "decimal", "percentual", "moeda"] as ValueType[]).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Periodicidade">
              <Select value={f.frequency} onValueChange={(v) => set("frequency", v as Frequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["diaria", "semanal", "mensal", "trimestral", "semestral", "anual"] as Frequency[]).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Regra de desempenho">
              <Select value={f.direction} onValueChange={(v) => set("direction", v as Direction)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maior_melhor">Quanto maior, melhor</SelectItem>
                  <SelectItem value="menor_melhor">Quanto menor, melhor</SelectItem>
                  <SelectItem value="faixa_ideal">Faixa ideal</SelectItem>
                  <SelectItem value="meta_exata">Meta exata</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Meta padrão e limites</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3">
            <Field label="Meta padrão"><Input type="number" step={numericStep(f.value_type)} onKeyDown={blockDecimalKeys(f.value_type)} value={f.default_target} onChange={(e) => set("default_target", Number(e.target.value))} /></Field>
            {f.direction === "faixa_ideal" && (
              <>
                <Field label="Valor mínimo"><Input type="number" step={numericStep(f.value_type)} onKeyDown={blockDecimalKeys(f.value_type)} value={f.minimum_value ?? ""} onChange={(e) => set("minimum_value", e.target.value === "" ? undefined : Number(e.target.value))} /></Field>
                <Field label="Valor máximo"><Input type="number" step={numericStep(f.value_type)} onKeyDown={blockDecimalKeys(f.value_type)} value={f.maximum_value ?? ""} onChange={(e) => set("maximum_value", e.target.value === "" ? undefined : Number(e.target.value))} /></Field>
              </>
            )}
            <Field label="Limite de atenção (%)"><Input type="number" value={f.warning_threshold} onChange={(e) => set("warning_threshold", Number(e.target.value))} /></Field>
            <Field label="Limite crítico (%)"><Input type="number" value={f.critical_threshold} onChange={(e) => set("critical_threshold", Number(e.target.value))} /></Field>
            <Field label="Data de início"><Input type="date" value={f.start_date} onChange={(e) => set("start_date", e.target.value)} /></Field>
            <Field label="Data de encerramento"><Input type="date" value={f.end_date} onChange={(e) => set("end_date", e.target.value)} /></Field>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => (allFranchises || !franchiseId ? navigate({ to: "/indicadores-franquia" }) : navigate({ to: "/franquias/$id", params: { id: franchiseId } }))}>Cancelar</Button>
          <Button type="submit">{existing ? "Salvar alterações" : "Salvar indicador"}</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
