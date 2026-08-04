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
import type { Audience, Direction, Frequency, Indicator, IndicatorStatus, InputMethod, ValueType } from "@/mocks/types";
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
    audience: "ambos" as Audience,
    responsible_id: "",
    value_type: "inteiro" as ValueType, unit: "",
    frequency: "mensal" as Frequency, direction: "maior_melhor" as Direction,
    input_method: "manual" as InputMethod, data_source: "",
    default_target: 0, minimum_value: undefined as number | undefined, maximum_value: undefined as number | undefined,
    warning_threshold: 80, critical_threshold: 60,
    allows_attachment: false, instructions: "",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: "",
    status: "ativo" as IndicatorStatus,
  });

  const set = <K extends keyof typeof f>(k: K, v: typeof f[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name || !f.owner_sector_id) {
      toast.error("Preencha nome e setor proprietário");
      return;
    }
    if (!f.franchise_id) {
      toast.error("Selecione a empresa do indicador");
      return;
    }
    const franchiseRef = franchises.find((fr) => fr.id === f.franchise_id);
    const baseCode = f.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24) || `IND_${Date.now().toString(36).toUpperCase()}`;
    const suffix = (franchiseRef?.code || franchiseRef?.name || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 10);
    const autoCode = suffix ? `${baseCode}_${suffix}` : baseCode;
    const { responsible_id, ...rest } = f;
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
      end_date: rest.end_date || undefined,
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
            <Field label="Objetivo"><Textarea value={f.objective} onChange={(e) => set("objective", e.target.value)} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Classificação</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3">
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
            <Field label="Unidade"><Input value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="R$, %, min..." /></Field>
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

        <Card>
          <CardHeader><CardTitle className="text-base">Instruções</CardTitle></CardHeader>
          <CardContent className="space-y-3">
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
