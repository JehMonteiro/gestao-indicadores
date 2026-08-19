import { newId } from "@/lib/ids";
import { ENTITY_SCOPES } from "@/lib/entity-scope";
import { makeUniqueIndicatorCode } from "@/lib/indicator-code";
import { isFranquia } from "@/lib/entity-kind";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, useCurrentUser } from "@/mocks/store";
import { loadAllFromSupabase } from "@/lib/supabase-data";
import { useIsAdmin } from "@/hooks/use-is-admin";
import type { Direction, EntityScope, Frequency, Indicator, IndicatorStatus, KpiGroup, ValueType } from "@/mocks/types";
import { KPI_GROUPS } from "@/lib/format";
import { toast } from "sonner";
import { firstIntegerError, numericStep, blockDecimalKeys } from "@/lib/value-rules";
import { EmptyState } from "@/components/app/page-header";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/indicadores/novo")({
  head: () => ({ meta: [{ title: "Novo indicador" }] }),
  component: NewIndicator,
});

function NewIndicator() {
  const sectors = useStore((s) => s.sectors);
  const indicators = useStore((s) => s.indicators);
  const franchises = useStore((s) => s.franchises);
  const profiles = useStore((s) => s.profiles);
  const upsert = useStore((s) => s.upsertIndicator);
  const logAudit = useStore((s) => s.logAudit);
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const [f, setF] = useState({
    name: "", objective: "",
    owner_sector_id: sectors[0]?.id ?? "", franchise_id: "",
    responsible_id: "",
    kpi_group: "resultado" as KpiGroup,
    entity_scope: "" as EntityScope | "",
    entity_id: "",
    value_type: "inteiro" as ValueType,
    frequency: "mensal" as Frequency, direction: "maior_melhor" as Direction,
    default_target: 0, minimum_value: undefined as number | undefined, maximum_value: undefined as number | undefined,
    warning_threshold: 80, critical_threshold: 60,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: "",
    status: "ativo" as IndicatorStatus,
  });

  const set = <K extends keyof typeof f>(k: K, v: typeof f[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name || !f.owner_sector_id) {
      toast.error("Preencha nome e setor proprietário");
      return;
    }
    if (!f.franchise_id) {
      toast.error("Selecione a empresa do indicador");
      return;
    }
    if (!f.entity_scope) {
      toast.error("Selecione o escopo do indicador");
      return;
    }
    const intError = firstIntegerError(f.value_type, [
      { label: "Meta padrão", value: f.default_target },
      { label: "Valor mínimo", value: f.minimum_value },
      { label: "Valor máximo", value: f.maximum_value },
      { label: "Peso", value: (f as { weight?: number }).weight },
    ]);
    if (intError) { toast.error(intError); return; }
    const autoCode = makeUniqueIndicatorCode(f.name, indicators.map((i) => i.code));
    const { responsible_id, entity_scope, entity_id, ...rest } = f;
    const ind: Indicator = {
      id: newId(),
      code: autoCode,
      shared_sector_ids: [],
      responsible_ids: responsible_id ? [responsible_id] : [],
      scope: "setor",
      weight: 1,
      created_by: user?.id ?? "u-admin",
      created_at: new Date().toISOString(),
      ...rest,
      entity_scope: entity_scope as EntityScope,
      entity_id: entity_id || null,
      end_date: rest.end_date || undefined,
    };
    await upsert(ind);
    if (user?.id) {
      const data = await loadAllFromSupabase(user.id);
      useStore.getState().hydrate(data);
    }
    logAudit({ user_id: user?.id ?? "", action: "create", entity_type: "indicator", entity_id: ind.id });
    toast.success("Indicador criado com sucesso");
    navigate({ to: "/indicadores/$id", params: { id: ind.id } });
  };

  if (!adminLoading && !isAdmin) {
    return (
      <div>
        <PageHeader title="Novo indicador" description="Apenas administradores podem criar indicadores." />
        <EmptyState
          title="Acesso restrito"
          description="Você não tem permissão para criar indicadores. Solicite ao administrador."
          icon={<ShieldAlert className="size-5" />}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Novo indicador" description="Defina a estrutura, a regra de desempenho e a meta padrão." />
      <form onSubmit={submit} className="space-y-4 max-w-4xl">
        <Card>
          <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-1 gap-3">
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
                  {KPI_GROUPS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.label} — {g.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Escopo">
              <Select value={f.entity_scope} onValueChange={(v) => setF((p) => ({ ...p, entity_scope: v as EntityScope, entity_id: "" }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o escopo" /></SelectTrigger>
                <SelectContent>
                  {ENTITY_SCOPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            {f.entity_scope === "franquia" && (
              <Field label="Unidade">
                <Select value={f.entity_id || "rede"} onValueChange={(v) => set("entity_id", v === "rede" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rede">Toda a rede</SelectItem>
                    {franchises.filter(isFranquia).map((fr) => <SelectItem key={fr.id} value={fr.id}>{fr.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Setor">
              <Select value={f.owner_sector_id} onValueChange={(v) => set("owner_sector_id", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Empresa">
              <Select value={f.franchise_id} onValueChange={(v) => set("franchise_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                <SelectContent>
                  {franchises.map((fr) => <SelectItem key={fr.id} value={fr.id}>{fr.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Colaborador responsável">
              <Select value={f.responsible_id || "none"} onValueChange={(v) => set("responsible_id", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="— Sem responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem responsável</SelectItem>
                  {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
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
                  {(["inteiro","decimal","percentual","moeda"] as ValueType[]).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Periodicidade">
              <Select value={f.frequency} onValueChange={(v) => set("frequency", v as Frequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["diaria","semanal","mensal","trimestral","semestral","anual"] as Frequency[]).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
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
            <Field label="Limite de atenção (%)"><Input type="number" value={f.warning_threshold ?? 80} onChange={(e) => set("warning_threshold", Number(e.target.value))} /></Field>
            <Field label="Limite crítico (%)"><Input type="number" value={f.critical_threshold ?? 60} onChange={(e) => set("critical_threshold", Number(e.target.value))} /></Field>
            <Field label="Data de início"><Input type="date" value={f.start_date} onChange={(e) => set("start_date", e.target.value)} /></Field>
            <Field label="Data de encerramento"><Input type="date" value={f.end_date} onChange={(e) => set("end_date", e.target.value)} /></Field>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/indicadores" })}>Cancelar</Button>
          <Button type="submit">Salvar indicador</Button>
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
