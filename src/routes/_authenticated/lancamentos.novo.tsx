import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/app/page-header";
import { useStore, useCurrentUser } from "@/mocks/store";
import { useVisibleIndicators } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { IndicatorEntry } from "@/mocks/types";
import { startOfMonth, endOfMonth, formatISO } from "date-fns";
import { computeAchievement, formatValue } from "@/lib/format";

const searchSchema = z.object({ indicator: z.string().optional() });

export const Route = createFileRoute("/_authenticated/lancamentos/novo")({
  head: () => ({ meta: [{ title: "Novo lançamento" }] }),
  validateSearch: searchSchema,
  component: NewEntry,
});

function NewEntry() {
  const search = useSearch({ from: "/_authenticated/lancamentos/novo" });
  const indicators = useVisibleIndicators();
  const franchises = useStore((s) => s.franchises);
  const userFranchises = useStore((s) => s.userFranchises);
  const targets = useStore((s) => s.targets);
  const upsertEntry = useStore((s) => s.upsertEntry);
  const logAudit = useStore((s) => s.logAudit);
  const user = useCurrentUser();
  const navigate = useNavigate();

  const [indId, setIndId] = useState(search.indicator ?? indicators[0]?.id ?? "");
  const ind = indicators.find((i) => i.id === indId);

  const myFranchises = franchises.filter((f) => userFranchises.some((uf) => uf.user_id === user?.id && uf.franchise_id === f.id));
  const [franchiseId, setFranchiseId] = useState<string>(myFranchises[0]?.id ?? "");
  const [periodStart, setPeriodStart] = useState(formatISO(startOfMonth(new Date()), { representation: "date" }));
  const [periodEnd, setPeriodEnd] = useState(formatISO(endOfMonth(new Date()), { representation: "date" }));
  const [actual, setActual] = useState<string>("");
  const [comment, setComment] = useState("");
  const [justification, setJustification] = useState("");

  const target = useMemo(() => {
    return targets.find((t) => t.indicator_id === indId && t.period_start === periodStart && (!ind || ind.scope !== "franquia" || t.franchise_id === franchiseId));
  }, [targets, indId, periodStart, franchiseId, ind]);

  const preview = useMemo(() => {
    if (!ind || !target || actual === "") return null;
    return computeAchievement({ actual_value: Number(actual) }, target, ind.direction);
  }, [ind, target, actual]);

  const save = (status: "rascunho" | "enviado") => {
    if (!ind) { toast.error("Selecione um indicador"); return; }
    if (actual === "" || isNaN(Number(actual))) { toast.error("Informe um valor numérico"); return; }
    const entry: IndicatorEntry = {
      id: `e-${Date.now()}`,
      indicator_id: ind.id, target_id: target?.id,
      user_id: user?.id ?? "u-colab", sector_id: ind.owner_sector_id, franchise_id: ind.scope === "franquia" ? franchiseId : undefined,
      period_start: periodStart, period_end: periodEnd,
      actual_value: Number(actual), comment, justification,
      status: ind.requires_approval && status === "enviado" ? "enviado" : (status === "enviado" ? "aprovado" : "rascunho"),
      submitted_at: status === "enviado" ? new Date().toISOString() : undefined,
      revision_number: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    upsertEntry(entry);
    logAudit({ user_id: user?.id ?? "", action: status === "enviado" ? "submit" : "draft", entity_type: "entry", entity_id: entry.id });
    toast.success(status === "enviado" ? "Lançamento enviado" : "Rascunho salvo");
    navigate({ to: "/lancamentos" });
  };

  return (
    <div>
      <PageHeader title="Novo lançamento" description="Registre o resultado de um indicador." />
      <div className="grid lg:grid-cols-[1fr_320px] gap-4 max-w-5xl">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados do lançamento</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Indicador">
              <Select value={indId} onValueChange={setIndId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{indicators.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {ind?.scope === "franquia" && myFranchises.length > 0 && (
              <Field label="Franquia">
                <Select value={franchiseId} onValueChange={setFranchiseId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{myFranchises.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Início do período"><Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} /></Field>
              <Field label="Fim do período"><Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></Field>
            </div>
            <Field label={`Valor realizado${ind?.unit ? ` (${ind.unit})` : ""}`}><Input type="number" step="0.01" value={actual} onChange={(e) => setActual(e.target.value)} /></Field>
            <Field label="Comentário"><Textarea value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
            <Field label="Justificativa (opcional)"><Textarea value={justification} onChange={(e) => setJustification(e.target.value)} /></Field>
            {ind?.allows_attachment && (
              <div className="border-dashed border rounded-md p-4 text-center text-sm text-muted-foreground">
                Anexos de comprovação serão habilitados quando o Lovable Cloud estiver ativo.
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => save("rascunho")}>Salvar rascunho</Button>
              <Button onClick={() => save("enviado")}>{ind?.requires_approval ? "Enviar para aprovação" : "Confirmar lançamento"}</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Previsão</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p className="text-muted-foreground">Meta: {target ? formatValue(target.target_value, ind?.value_type ?? "inteiro", ind?.unit) : "—"}</p>
            <p className="text-muted-foreground">Atual: {actual ? formatValue(Number(actual), ind?.value_type ?? "inteiro", ind?.unit) : "—"}</p>
            <div className="border-t pt-3">
              <p className="text-xs uppercase text-muted-foreground">Atingimento</p>
              <p className="text-3xl font-semibold font-mono mt-1">{preview != null ? `${Math.round(preview)}%` : "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
