import { newId } from "@/lib/ids";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, useCurrentUser } from "@/mocks/store";
import { useIsAdmin } from "@/hooks/use-is-admin";
import type { Audience, Direction, Frequency, Indicator, IndicatorStatus, InputMethod, Scope, ValueType } from "@/mocks/types";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/page-header";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/indicadores/novo")({
  head: () => ({ meta: [{ title: "Novo indicador" }] }),
  component: NewIndicator,
});

function NewIndicator() {
  const sectors = useStore((s) => s.sectors);
  const franchises = useStore((s) => s.franchises);
  const categories = useStore((s) => s.categories);
  const upsert = useStore((s) => s.upsertIndicator);
  const logAudit = useStore((s) => s.logAudit);
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const [f, setF] = useState({
    name: "", code: "", description: "", objective: "",
    owner_sector_id: sectors[0]?.id ?? "", franchise_id: "", category_id: "",
    strategic_pillar: "", audience: "ambos" as Audience, scope: "setor" as Scope,
    value_type: "inteiro" as ValueType, unit: "",
    frequency: "mensal" as Frequency, direction: "maior_melhor" as Direction,
    input_method: "manual" as InputMethod, data_source: "",
    default_target: 0, minimum_value: undefined as number | undefined, maximum_value: undefined as number | undefined,
    warning_threshold: 80, critical_threshold: 60, weight: 1,
    requires_approval: true, allows_attachment: false, instructions: "",
    start_date: new Date().toISOString().slice(0, 10),
    status: "ativo" as IndicatorStatus,
  });

  const set = <K extends keyof typeof f>(k: K, v: typeof f[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name || !f.owner_sector_id) {
      toast.error("Preencha nome e setor proprietário");
      return;
    }
    const autoCode = f.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24) || `IND_${Date.now().toString(36).toUpperCase()}`;
    f.code = f.code || autoCode;
    const ind: Indicator = {
      id: newId(),
      shared_sector_ids: [], responsible_ids: [],
      created_by: user?.id ?? "u-admin", created_at: new Date().toISOString(),
      ...f,
    };
    upsert(ind);
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
            <Field label="Descrição"><Textarea value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
            <Field label="Objetivo"><Textarea value={f.objective} onChange={(e) => set("objective", e.target.value)} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Classificação</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3">
            <Field label="Setor proprietário">
              <Select value={f.owner_sector_id} onValueChange={(v) => set("owner_sector_id", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Empresa">
              <Select value={f.franchise_id || "none"} onValueChange={(v) => set("franchise_id", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="— Corporativo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Corporativo (todas)</SelectItem>
                  {franchises.map((fr) => <SelectItem key={fr.id} value={fr.id}>{fr.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Categoria">
              <Select value={f.category_id || "none"} onValueChange={(v) => set("category_id", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem categoria</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Pilar estratégico"><Input value={f.strategic_pillar} onChange={(e) => set("strategic_pillar", e.target.value)} /></Field>
            <Field label="Público">
              <Select value={f.audience} onValueChange={(v) => set("audience", v as Audience)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="interno">Colaboradores internos</SelectItem>
                  <SelectItem value="franqueado">Franqueados</SelectItem>
                  <SelectItem value="ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Abrangência">
              <Select value={f.scope} onValueChange={(v) => set("scope", v as Scope)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporativo">Corporativo</SelectItem>
                  <SelectItem value="setor">Setor</SelectItem>
                  <SelectItem value="franquia">Franquia</SelectItem>
                  
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
            <Field label="Unidade"><Input value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="R$, %, min..." /></Field>
            <Field label="Periodicidade">
              <Select value={f.frequency} onValueChange={(v) => set("frequency", v as Frequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["diaria","semanal","quinzenal","mensal","trimestral","semestral","anual"] as Frequency[]).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
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
            <Field label="Forma de preenchimento">
              <Select value={f.input_method} onValueChange={(v) => set("input_method", v as InputMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="importacao">Importação</SelectItem>
                  <SelectItem value="integracao">Integração</SelectItem>
                  <SelectItem value="calculo">Cálculo automático</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Meta padrão e limites</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3">
            <Field label="Meta padrão"><Input type="number" value={f.default_target} onChange={(e) => set("default_target", Number(e.target.value))} /></Field>
            {f.direction === "faixa_ideal" && (
              <>
                <Field label="Valor mínimo"><Input type="number" value={f.minimum_value ?? ""} onChange={(e) => set("minimum_value", e.target.value === "" ? undefined : Number(e.target.value))} /></Field>
                <Field label="Valor máximo"><Input type="number" value={f.maximum_value ?? ""} onChange={(e) => set("maximum_value", e.target.value === "" ? undefined : Number(e.target.value))} /></Field>
              </>
            )}
            <Field label="Limite de atenção (%)"><Input type="number" value={f.warning_threshold ?? 80} onChange={(e) => set("warning_threshold", Number(e.target.value))} /></Field>
            <Field label="Limite crítico (%)"><Input type="number" value={f.critical_threshold ?? 60} onChange={(e) => set("critical_threshold", Number(e.target.value))} /></Field>
            <Field label="Data de início"><Input type="date" value={f.start_date} onChange={(e) => set("start_date", e.target.value)} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Aprovação e instruções</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between border rounded-md p-3">
              <div><p className="text-sm font-medium">Necessita aprovação</p><p className="text-xs text-muted-foreground">Lançamentos vão para o fluxo de aprovação.</p></div>
              <Switch checked={f.requires_approval} onCheckedChange={(v) => set("requires_approval", v)} />
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <div><p className="text-sm font-medium">Permite anexar comprovantes</p></div>
              <Switch checked={f.allows_attachment} onCheckedChange={(v) => set("allows_attachment", v)} />
            </div>
            <Field label="Instruções de preenchimento"><Textarea value={f.instructions} onChange={(e) => set("instructions", e.target.value)} /></Field>
            <Field label="Fonte dos dados"><Input value={f.data_source} onChange={(e) => set("data_source", e.target.value)} /></Field>
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
