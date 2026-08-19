import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { ENTITY_SCOPES } from "@/lib/entity-scope";
import { isFranquia } from "@/lib/entity-kind";
import type { Direction, EntityScope, Frequency, Indicator, IndicatorStatus, KpiGroup, ValueType } from "@/mocks/types";
import { KPI_GROUPS } from "@/lib/format";
import { toast } from "sonner";
import { firstIntegerError, numericStep, blockDecimalKeys } from "@/lib/value-rules";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/indicadores/$id/editar")({
  head: () => ({ meta: [{ title: "Editar indicador" }] }),
  component: EditIndicator,
});

function EditIndicator() {
  const { id } = Route.useParams();
  const indicators = useStore((s) => s.indicators);
  const sectors = useStore((s) => s.sectors);
  const franchises = useStore((s) => s.franchises);
  
  const profiles = useStore((s) => s.profiles);
  const upsert = useStore((s) => s.upsertIndicator);
  const logAudit = useStore((s) => s.logAudit);
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const existing = indicators.find((i) => i.id === id);
  const [f, setF] = useState<Indicator | null>(existing ?? null);
  const [loadedIndicatorId, setLoadedIndicatorId] = useState<string | null>(existing?.id ?? null);

  useEffect(() => {
    if (existing && loadedIndicatorId !== existing.id) {
      setF(existing);
      setLoadedIndicatorId(existing.id);
    }
  }, [existing, loadedIndicatorId]);

  if (!adminLoading && !isAdmin) {
    return (
      <div>
        <PageHeader title="Editar indicador" description="Apenas administradores podem editar indicadores." />
        <EmptyState title="Acesso restrito" description="Você não tem permissão para editar indicadores." icon={<ShieldAlert className="size-5" />} />
      </div>
    );
  }

  if (!f) {
    return (
      <div>
        <PageHeader title="Editar indicador" />
        <EmptyState
          title={indicators.length === 0 ? "Carregando informações do indicador" : "Abra a edição pela lista de indicadores"}
          description={indicators.length === 0 ? "Aguarde a sincronização dos dados." : "Volte para a lista e toque no ícone de edição do indicador."}
          icon={<ShieldAlert className="size-5" />}
          action={indicators.length === 0 ? undefined : <Button asChild><Link to="/indicadores">Voltar para indicadores</Link></Button>}
        />
      </div>
    );
  }

  const set = <K extends keyof Indicator>(k: K, v: Indicator[K]) => setF((p) => (p ? { ...p, [k]: v } : p));

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
    await upsert(f);
    if (user?.id) {
      const data = await loadAllFromSupabase(user.id);
      useStore.getState().hydrate(data);
    }
    logAudit({ user_id: user?.id ?? "", action: "update", entity_type: "indicator", entity_id: f.id });
    toast.success("Indicador atualizado");
    navigate({ to: "/indicadores/$id", params: { id: f.id } });
  };

  return (
    <div>
      <PageHeader title={`Editar: ${f.name}`} description="Atualize as informações do indicador." />
      <form onSubmit={submit} className="space-y-4 max-w-4xl">
        <Card>
          <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-1 gap-3">
            <Field label="Nome"><Input value={f.name} onChange={(e) => set("name", e.target.value)} required /></Field>
            <Field label="Objetivo"><Textarea value={f.objective ?? ""} onChange={(e) => set("objective", e.target.value)} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Classificação</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3">
            <Field label="Grupo estratégico">
              <Select value={f.kpi_group ?? "resultado"} onValueChange={(v) => set("kpi_group", v as KpiGroup)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KPI_GROUPS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.label} — {g.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Escopo">
              <Select value={f.entity_scope ?? ""} onValueChange={(v) => setF((p) => ({ ...p, entity_scope: v as EntityScope, entity_id: "" }))}>
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
              <Select value={f.franchise_id ?? ""} onValueChange={(v) => set("franchise_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                <SelectContent>
                  {franchises.map((fr) => <SelectItem key={fr.id} value={fr.id}>{fr.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Colaborador responsável">
              <Select
                value={(f.responsible_ids?.[0]) || "none"}
                onValueChange={(v) => set("responsible_ids", v === "none" ? [] : [v])}
              >
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
            <Field label="Meta padrão"><Input type="number" step={numericStep(f.value_type)} onKeyDown={blockDecimalKeys(f.value_type)} value={f.default_target ?? 0} onChange={(e) => set("default_target", Number(e.target.value))} /></Field>
            {f.direction === "faixa_ideal" && (
              <>
                <Field label="Valor mínimo"><Input type="number" step={numericStep(f.value_type)} onKeyDown={blockDecimalKeys(f.value_type)} value={f.minimum_value ?? ""} onChange={(e) => set("minimum_value", e.target.value === "" ? undefined : Number(e.target.value))} /></Field>
                <Field label="Valor máximo"><Input type="number" step={numericStep(f.value_type)} onKeyDown={blockDecimalKeys(f.value_type)} value={f.maximum_value ?? ""} onChange={(e) => set("maximum_value", e.target.value === "" ? undefined : Number(e.target.value))} /></Field>
              </>
            )}
            <Field label="Limite de atenção (%)"><Input type="number" value={f.warning_threshold ?? 80} onChange={(e) => set("warning_threshold", Number(e.target.value))} /></Field>
            <Field label="Limite crítico (%)"><Input type="number" value={f.critical_threshold ?? 60} onChange={(e) => set("critical_threshold", Number(e.target.value))} /></Field>
            <Field label="Data de início"><Input type="date" value={f.start_date ?? ""} onChange={(e) => set("start_date", e.target.value)} /></Field>
            <Field label="Data de encerramento"><Input type="date" value={f.end_date ?? ""} onChange={(e) => set("end_date", e.target.value || undefined)} /></Field>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/indicadores" })}>Cancelar</Button>
          <Button type="submit">Salvar alterações</Button>
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
