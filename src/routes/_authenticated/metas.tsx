import { newId } from "@/lib/ids";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { useStore, useCurrentUser } from "@/mocks/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Plus } from "lucide-react";
import { formatDate, formatValue } from "@/lib/format";
import type { IndicatorTarget } from "@/mocks/types";
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
  const upsert = useStore((s) => s.upsertTarget);
  const user = useCurrentUser();
  return (
    <div>
      <PageHeader title="Metas" description="Defina metas por escopo, período e indicador."
        actions={
          <TargetDialog onSave={(t) => { upsert(t); toast.success("Meta salva"); }} />
        }
      />
      <Card><Table>
        <TableHeader><TableRow><TableHead>Indicador</TableHead><TableHead>Empresa</TableHead><TableHead>Setor</TableHead><TableHead>Responsável</TableHead><TableHead>Período</TableHead><TableHead>Meta</TableHead></TableRow></TableHeader>
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
                <TableCell className="font-mono">{ind && formatValue(t.target_value, ind.value_type, ind.unit)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table></Card>
    </div>
  );
}

function TargetDialog({ onSave }: { onSave: (t: IndicatorTarget) => void }) {
  const indicators = useStore((s) => s.indicators);
  const sectors = useStore((s) => s.sectors);
  const franchises = useStore((s) => s.franchises);
  const profiles = useStore((s) => s.profiles);
  const [open, setOpen] = useState(false);
  const initial = (): IndicatorTarget => ({
    id: newId(), indicator_id: indicators[0]?.id ?? "", scope_type: "franquia",
    franchise_id: franchises[0]?.id,
    period_start: new Date().toISOString().slice(0,10), period_end: new Date().toISOString().slice(0,10),
    target_value: 0, weight: 1, created_by: "u-admin", created_at: new Date().toISOString(),
  });
  const [f, setF] = useState<IndicatorTarget>(initial);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="size-4" />Nova meta</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova meta</DialogTitle></DialogHeader>
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
          <div><Label>Valor da meta</Label><Input type="number" step="0.01" value={f.target_value} onChange={(e) => setF({ ...f, target_value: Number(e.target.value) })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => {
          onSave({ ...f, id: newId() });
          setOpen(false);
          setF(initial());
        }}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
