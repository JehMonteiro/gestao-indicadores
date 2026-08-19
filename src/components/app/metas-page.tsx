import type { EntityKind } from "@/lib/entity-kind";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { newId } from "@/lib/ids";
import { PageHeader } from "@/components/app/page-header";
import { useStore } from "@/mocks/store";
import { useSession } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatDate, formatValue } from "@/lib/format";
import type { IndicatorTarget } from "@/mocks/types";
import { dbWrite, loadAllFromSupabase } from "@/lib/supabase-data";
import { toast } from "sonner";
import { firstIntegerError, numericStep, blockDecimalKeys, requiresInteger } from "@/lib/value-rules";

export function MetasPage({ escopo = "empresa" }: { escopo?: EntityKind }) {
  const targets = useStore((s) => s.targets);
  const indicators = useStore((s) => s.indicators);
  const sectors = useStore((s) => s.sectors);
  const franchises = useStore((s) => s.franchises);
  const profiles = useStore((s) => s.profiles);
  const currentUserId = useStore((s) => s.currentUserId);
  const hydrateStore = useStore((s) => s.hydrate);
  const [editing, setEditing] = useState<IndicatorTarget | null>(null);
  const refreshData = async () => {
    if (!currentUserId) return;
    const data = await loadAllFromSupabase(currentUserId);
    hydrateStore(data);
  };
  const handleSave = async (t: IndicatorTarget) => {
    let error: { message: string } | null = null;
    try {
      ({ error } = await dbWrite.target(t));
    } catch (err) {
      error = { message: err instanceof Error ? err.message : "Erro desconhecido" };
    }
    if (error) {
      toast.error("Não foi possível salvar", { description: error.message });
      return false;
    }
    hydrateStore({ targets: [t, ...targets.filter((existing) => existing.id !== t.id)] });
    try {
      await refreshData();
    } catch (refreshErr) {
      // eslint-disable-next-line no-console
      console.error("[metas:refresh]", refreshErr);
    }
    toast.success("Meta salva");
    return true;
  };
  const handleDelete = async (t: IndicatorTarget) => {
    if (!confirm("Excluir esta meta?")) return;
    const { error } = await dbWrite.deleteTarget(t.id);
    if (error) {
      toast.error("Não foi possível excluir", { description: error.message });
      return;
    }
    hydrateStore({ targets: targets.filter((existing) => existing.id !== t.id) });
    try {
      await refreshData();
    } catch (refreshErr) {
      // eslint-disable-next-line no-console
      console.error("[metas:refresh]", refreshErr);
    }
    toast.success("Meta excluída");
  };
  return (
    <div>
      {escopo === "franquia" && (
        <Alert className="mb-4">
          <Info className="size-4" />
          <AlertDescription>
            A separação por escopo será aplicada quando o campo de entidade for criado. No momento esta tela exibe todos os registros.
          </AlertDescription>
        </Alert>
      )}
      <PageHeader title={escopo === "franquia" ? "Metas Franquia" : "Metas"} description="Defina metas por período e indicador."
        actions={<TargetDialog onSave={handleSave} />}
      />
      <Card><Table>
        <TableHeader><TableRow><TableHead>Indicador</TableHead><TableHead>Empresa</TableHead><TableHead>Setor</TableHead><TableHead>Responsável</TableHead><TableHead>Período</TableHead><TableHead>Meta</TableHead><TableHead className="w-[100px]">Ações</TableHead></TableRow></TableHeader>
        <TableBody>
          {targets.slice(0, 50).map((t) => {
            const ind = indicators.find((i) => i.id === t.indicator_id);
            const empresa = t.franchise_id
              ? franchises.find((f) => f.id === t.franchise_id)?.name ?? "—"
              : ind?.franchise_id
                ? franchises.find((f) => f.id === ind.franchise_id)?.name ?? "Corporativo"
                : "Corporativo";
            const sectorId = t.sector_id ?? ind?.owner_sector_id;
            const setorName = sectorId ? sectors.find((s) => s.id === sectorId)?.name ?? "—" : "—";
            const respId = t.user_id ?? ind?.responsible_ids?.[0];
            const respName = respId ? profiles.find((p) => p.id === respId)?.full_name ?? "—" : "—";
            return (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{ind?.name}</TableCell>
                <TableCell className="text-sm">{empresa}</TableCell>
                <TableCell className="text-sm">{setorName}</TableCell>
                <TableCell className="text-sm">{respName}</TableCell>
                <TableCell className="text-sm">{formatDate(t.period_start)} — {formatDate(t.period_end)}</TableCell>
                <TableCell className="font-mono">{formatValue(t.target_value, ind?.value_type ?? "inteiro")}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(t)} aria-label="Editar"><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(t)} aria-label="Excluir"><Trash2 className="size-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table></Card>
      {editing && (
        <TargetDialog
          key={editing.id}
          initialValue={editing}
          openControlled
          onOpenChange={(o) => { if (!o) setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}


function TargetDialog({
  onSave,
  initialValue,
  openControlled,
  onOpenChange,
}: {
  onSave: (t: IndicatorTarget) => Promise<boolean> | boolean | void;
  initialValue?: IndicatorTarget;
  openControlled?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const indicators = useStore((s) => s.indicators);
  const sectors = useStore((s) => s.sectors);
  const franchises = useStore((s) => s.franchises);
  const profiles = useStore((s) => s.profiles);
  const allTargets = useStore((s) => s.targets);
  const { user: authUser } = useSession();
  const isEdit = !!initialValue;
  const [open, setOpen] = useState(!!openControlled);
  const makeInitial = (): IndicatorTarget => initialValue ?? ({
    id: newId(), indicator_id: "", scope_type: "franquia",
    franchise_id: franchises[0]?.id,
    period_start: new Date().toISOString().slice(0,10), period_end: new Date().toISOString().slice(0,10),
    target_value: 0, weight: 1, created_by: authUser?.id ?? "", created_at: new Date().toISOString(),
  });
  const [f, setF] = useState<IndicatorTarget>(makeInitial);
  const indicatorCompanyLabel = (i: (typeof indicators)[number]) =>
    i.franchise_id ? franchises.find((fr) => fr.id === i.franchise_id)?.name ?? "" : "Corporativo";
  const selectedIndicator = indicators.find((i) => i.id === f.indicator_id);
  const availableIndicators = indicators.filter(
    (i) => !f.franchise_id || !i.franchise_id || i.franchise_id === f.franchise_id,
  );
  const setDialog = (o: boolean) => {
    setOpen(o);
    onOpenChange?.(o);
  };
  return (
    <Dialog open={open} onOpenChange={setDialog}>
      {!isEdit && <DialogTrigger asChild><Button><Plus className="size-4" />Nova meta</Button></DialogTrigger>}
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Editar meta" : "Nova meta"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Empresa</Label>
            <Select
              value={f.franchise_id ?? ""}
              onValueChange={(v) => {
                const stillValid = indicators.some((i) => i.id === f.indicator_id && (!i.franchise_id || i.franchise_id === v));
                setF({ ...f, franchise_id: v, scope_type: "franquia", indicator_id: stillValid ? f.indicator_id : "" });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
              <SelectContent>{franchises.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Indicador</Label>
            <Select value={f.indicator_id} onValueChange={(v) => setF({ ...f, indicator_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione o indicador" /></SelectTrigger>
              <SelectContent>
                {availableIndicators.length === 0 && (
                  <div className="px-2 py-3 text-sm text-muted-foreground">Nenhum indicador para esta empresa.</div>
                )}
                {availableIndicators.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                    {indicatorCompanyLabel(i) ? ` — ${indicatorCompanyLabel(i)}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Setor</Label>
              <Select value={f.sector_id ?? "none"} onValueChange={(v) => setF({ ...f, sector_id: v === "none" ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder="— Sem setor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem setor</SelectItem>
                  {sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Colaborador responsável</Label>
              <Select value={f.user_id ?? "none"} onValueChange={(v) => setF({ ...f, user_id: v === "none" ? undefined : v })}>
                <SelectTrigger><SelectValue placeholder="— Sem responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem responsável</SelectItem>
                  {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Início</Label><Input type="date" value={f.period_start} onChange={(e) => setF({ ...f, period_start: e.target.value })} /></div>
            <div><Label>Fim</Label><Input type="date" value={f.period_end} onChange={(e) => setF({ ...f, period_end: e.target.value })} /></div>
          </div>
          <div><Label>{`Valor da meta${selectedIndicator ? (requiresInteger(selectedIndicator.value_type) ? " (número inteiro)" : " (aceita decimais)") : ""}`}</Label>
            <Input
              type="number"
              step={numericStep(selectedIndicator?.value_type)}
              onKeyDown={blockDecimalKeys(selectedIndicator?.value_type)}
              value={f.target_value}
              onChange={(e) => {
                const raw = e.target.value;
                setF({ ...f, target_value: raw === "" ? 0 : Number(raw) });
              }}
            />
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button><Button onClick={async () => {
          if (!f.franchise_id) { toast.error("Selecione uma empresa"); return; }
          if (!f.indicator_id) { toast.error("Selecione um indicador"); return; }
          const chosen = indicators.find((i) => i.id === f.indicator_id);
          if (chosen?.franchise_id && chosen.franchise_id !== f.franchise_id) {
            toast.error("O indicador selecionado pertence a outra empresa");
            return;
          }
          if (f.period_end < f.period_start) { toast.error("O fim do período não pode ser antes do início"); return; }
          const intError = firstIntegerError(chosen?.value_type, [
            { label: "Valor da meta", value: f.target_value },
            { label: "Valor mínimo", value: f.minimum_value },
            { label: "Valor máximo", value: f.maximum_value },
          ]);
          if (intError) { toast.error(intError); return; }
          const overlapping = allTargets.find(
            (t) =>
              t.id !== f.id &&
              t.indicator_id === f.indicator_id &&
              (t.franchise_id ?? "") === (f.franchise_id ?? "") &&
              (t.sector_id ?? "") === (f.sector_id ?? "") &&
              t.period_start <= f.period_end &&
              t.period_end >= f.period_start,
          );
          if (overlapping && !confirm("Já existe uma meta para este indicador/empresa em período sobreposto. Deseja salvar mesmo assim?")) return;
          const payload = isEdit ? { ...f, created_by: f.created_by || authUser?.id || "" } : { ...f, id: newId(), created_by: authUser?.id ?? "" };
          const ok = await onSave(payload);
          if (ok !== false) {
            setDialog(false);
            if (!isEdit) setF(makeInitial());
          }
        }}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

