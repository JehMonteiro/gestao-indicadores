import { newId } from "@/lib/ids";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/app/page-header";
import { useStore, useCurrentUser } from "@/mocks/store";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { validateNumericValue, numericStep, blockDecimalKeys } from "@/lib/value-rules";
import type { IndicatorEntry } from "@/mocks/types";
import { startOfMonth, endOfMonth, formatISO } from "date-fns";
import { computeAchievement, formatValue } from "@/lib/format";
import { useSession } from "@/hooks/use-auth";
import { loadAllFromSupabase } from "@/lib/supabase-data";
import { resolveTargetRowForEntry, resolveTargetForEntry } from "@/lib/metrics";


const searchSchema = z.object({ indicator: z.string().optional() });

export const Route = createFileRoute("/_authenticated/lancamentos/novo")({
  head: () => ({ meta: [{ title: "Novo lançamento" }] }),
  validateSearch: searchSchema,
  component: NewEntry,
});

function NewEntry() {
  const search = useSearch({ from: "/_authenticated/lancamentos/novo" });
  const indicators = useStore((s) => s.indicators);
  const franchises = useStore((s) => s.franchises);
  const targets = useStore((s) => s.targets);
  const allEntries = useStore((s) => s.entries);

  const upsertEntry = useStore((s) => s.upsertEntry);
  const hydrateStore = useStore((s) => s.hydrate);
  const logAudit = useStore((s) => s.logAudit);
  const user = useCurrentUser();
  const { user: authUser, loading: authLoading } = useSession();
  const navigate = useNavigate();

  const [indId, setIndId] = useState(search.indicator ?? indicators[0]?.id ?? "");
  const ind = indicators.find((i) => i.id === indId);

  const myFranchises = useMemo(() => {
    if (ind?.franchise_id) return franchises.filter((f) => f.id === ind.franchise_id);
    return franchises;
  }, [franchises, ind?.franchise_id]);
  const [franchiseId, setFranchiseId] = useState<string>(myFranchises[0]?.id ?? "");
  const [periodStart, setPeriodStart] = useState(formatISO(startOfMonth(new Date()), { representation: "date" }));
  const [periodEnd, setPeriodEnd] = useState(formatISO(endOfMonth(new Date()), { representation: "date" }));
  const [actual, setActual] = useState<string>("");
  const [comment, setComment] = useState("");
  const [justification, setJustification] = useState("");
  const [saving, setSaving] = useState<"rascunho" | "registrado" | null>(null);

  useEffect(() => {
    if (!indId && indicators.length > 0) setIndId(search.indicator ?? indicators[0].id);
  }, [indId, indicators, search.indicator]);

  useEffect(() => {
    const nextFranchiseId = ind?.franchise_id ?? myFranchises[0]?.id ?? "";
    if (nextFranchiseId && franchiseId !== nextFranchiseId) setFranchiseId(nextFranchiseId);
  }, [franchiseId, ind?.franchise_id, myFranchises]);

  // A empresa é exibida sempre que o indicador tiver empresa vinculada
  // (indicadores de escopo "setor" também têm franchise_id no cadastro atual).
  const indicatorHasCompany = !!ind?.franchise_id || ind?.scope === "franquia";
  const effectiveFranchiseId = ind?.franchise_id ?? (ind?.scope === "franquia" ? franchiseId : undefined);

  const entrySectorIdBase = ind?.owner_sector_id || undefined;

  const target = useMemo(() => {
    if (!ind) return undefined;
    return resolveTargetRowForEntry(
      {
        indicator_id: ind.id,
        franchise_id: effectiveFranchiseId,
        sector_id: entrySectorIdBase,
        user_id: authUser?.id,
        period_start: periodStart,
        period_end: periodEnd,
      },
      targets,
    );
  }, [targets, ind, effectiveFranchiseId, entrySectorIdBase, authUser?.id, periodStart, periodEnd]);

  const effectiveTarget = useMemo(() => {
    if (!ind) return null;
    return resolveTargetForEntry(
      ind,
      { indicator_id: ind.id, period_start: periodStart, period_end: periodEnd, target_id: target?.id } as IndicatorEntry,
      targets,
    );
  }, [ind, targets, target?.id, periodStart, periodEnd]);

  const preview = useMemo(() => {
    if (!ind || !effectiveTarget || actual === "") return null;
    return computeAchievement({ actual_value: Number(actual) }, effectiveTarget, ind.direction);
  }, [ind, effectiveTarget, actual]);

  const save = async (status: "rascunho" | "registrado") => {
    if (!ind) { toast.error("Selecione um indicador"); return; }
    const userId = authUser?.id;
    if (authLoading || !userId) { toast.error("Aguarde seu usuário carregar antes de salvar"); return; }
    const entryFranchiseId = effectiveFranchiseId ?? target?.franchise_id;
    const entrySectorId = entrySectorIdBase ?? target?.sector_id;
    if (indicatorHasCompany && !entryFranchiseId) { toast.error("Selecione uma empresa"); return; }
    if (actual === "" || isNaN(Number(actual))) { toast.error("Informe um valor numérico"); return; }
    const intError = validateNumericValue(actual, ind.value_type, "O valor realizado");
    if (intError) { toast.error(intError); return; }
    // Nova revisão substitui o lançamento anterior do mesmo indicador/empresa/período.
    const previous = allEntries.find(
      (e) =>
        e.indicator_id === ind.id &&
        (e.franchise_id ?? "") === (entryFranchiseId ?? "") &&
        e.period_start === periodStart &&
        e.period_end === periodEnd,
    );
    const entry: IndicatorEntry = {
      id: previous?.id ?? newId(),
      indicator_id: ind.id, target_id: target?.id,
      user_id: userId, sector_id: entrySectorId, franchise_id: entryFranchiseId,
      period_start: periodStart, period_end: periodEnd,
      actual_value: Number(actual), comment, justification,
      status,
      submitted_at: status === "registrado" ? new Date().toISOString() : undefined,
      revision_number: (previous?.revision_number ?? 0) + 1,
      created_at: previous?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setSaving(status);
    try {
      const saved = await upsertEntry(entry);
      logAudit({ user_id: userId, action: status === "registrado" ? "submit" : "draft", entity_type: "entry", entity_id: saved.id });
      try {
        const refreshed = await loadAllFromSupabase(userId);
        hydrateStore(refreshed);
      } catch (refreshErr) {
        // eslint-disable-next-line no-console
        console.error("[lancamentos:refresh]", refreshErr);
      }
      toast.success(status === "registrado" ? "Lançamento registrado" : "Rascunho salvo");
      navigate({ to: "/lancamentos" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[lancamentos:save]", err);
      const message = err instanceof Error && err.message ? err.message : "Verifique se indicador, período e franquia estão corretos.";
      toast.error("Não foi possível salvar o lançamento", { description: message });
    } finally {
      setSaving(null);
    }
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
            {indicatorHasCompany && (
              <Field label="Empresa">
                <Select
                  value={ind?.franchise_id ?? franchiseId}
                  onValueChange={setFranchiseId}
                  disabled={!!ind?.franchise_id}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                  <SelectContent>{myFranchises.map((fr) => <SelectItem key={fr.id} value={fr.id}>{fr.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Início do período"><Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} /></Field>
              <Field label="Fim do período"><Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></Field>
            </div>
            <Field label={`Valor realizado${ind?.unit ? ` (${ind.unit})` : ""}`}><Input type="number" step={numericStep(ind?.value_type)} onKeyDown={blockDecimalKeys(ind?.value_type)} value={actual} onChange={(e) => setActual(e.target.value)} /></Field>
            <Field label="Comentário"><Textarea value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
            <Field label="Justificativa (opcional)"><Textarea value={justification} onChange={(e) => setJustification(e.target.value)} /></Field>
            {ind?.allows_attachment && (
              <div className="border-dashed border rounded-md p-4 text-center text-sm text-muted-foreground">
                Anexos de comprovação serão habilitados quando o Lovable Cloud estiver ativo.
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" disabled={!!saving || authLoading} onClick={() => save("rascunho")}>{saving === "rascunho" ? "Salvando..." : "Salvar rascunho"}</Button>
              <Button disabled={!!saving || authLoading} onClick={() => save("registrado")}>{saving === "registrado" ? "Salvando..." : "Cadastrar"}</Button>
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
