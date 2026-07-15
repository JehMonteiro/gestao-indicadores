import { newId } from "@/lib/ids";
import { createFileRoute } from "@tanstack/react-router";
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
import { formatDate } from "@/lib/format";
import type { IndicatorTarget } from "@/mocks/types";
import { dbWrite, loadAllFromSupabase } from "@/lib/supabase-data";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({ meta: [{ title: "Metas" }] }),
  component: TargetsPage,
});

function TargetsPage() {
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
    const { error } = await dbWrite.target(t);
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
      <PageHeader title="Metas" description="Defina metas por período e indicador."
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
                <TableCell className="font-mono">{new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Math.trunc(t.target_value))}</TableCell>
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
  const { user: authUser } = useSession();
  const isEdit = !!initialValue;
  const [open, setOpen] = useState(!!openControlled);
  const makeInitial = (): IndicatorTarget => initialValue ?? ({
    id: newId(), indicator_id: indicators[0]?.id ?? "", scope_type: "franquia",
    franchise_id: franchises[0]?.id,
    period_start: new Date().toISOString().slice(0,10), period_end: new Date().toISOString().slice(0,10),
    target_value: 0, weight: 1, created_by: authUser?.id ?? "", created_at: new Date().toISOString(),
  });
  const [f, setF] = useState<IndicatorTarget>(makeInitial);
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
          <div><Label>Indicador</Label>
            <Select value={f.indicator_id} onValueChange={(v) => setF({ ...f, indicator_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{indicators.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Empresa</Label>
            <Select value={f.franchise_id ?? ""} onValueChange={(v) => setF({ ...f, franchise_id: v, scope_type: "franquia" })}>
              <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
              <SelectContent>{franchises.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
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
          <div><Label>Valor da meta (número inteiro)</Label>
            <Input
              type="number"
              step="1"
              value={f.target_value}
              onChange={(e) => {
                const raw = e.target.value;
                const n = raw === "" ? 0 : Number(raw);
                setF({ ...f, target_value: Math.trunc(n) });
              }}
            />
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Cancelar</Button><Button onClick={async () => {
          if (!f.indicator_id) { toast.error("Selecione um indicador"); return; }
          if (!f.franchise_id) { toast.error("Selecione uma empresa"); return; }
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

