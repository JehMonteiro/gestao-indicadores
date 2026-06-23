import { newId } from "@/lib/ids";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { useStore, useCurrentUser } from "@/mocks/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil } from "lucide-react";
import type { Sector } from "@/mocks/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/setores/")({
  head: () => ({ meta: [{ title: "Setores" }] }),
  component: SectorsPage,
});

function SectorsPage() {
  const sectors = useStore((s) => s.sectors);
  const userSectors = useStore((s) => s.userSectors);
  const profiles = useStore((s) => s.profiles);
  const upsert = useStore((s) => s.upsertSector);
  const remove = useStore((s) => s.deleteSector);
  const log = useStore((s) => s.logAudit);
  const user = useCurrentUser();
  const canEdit = user?.global_role === "superadmin" || user?.global_role === "admin_corporativo";

  return (
    <div>
      <PageHeader title="Setores" description="Áreas da empresa que organizam indicadores e responsáveis."
        actions={canEdit && <SectorDialog onSave={(s) => { upsert(s); log({ user_id: user!.id, action: "create", entity_type: "sector", entity_id: s.id }); }} />}
      />
      <Card><Table>
        <TableHeader><TableRow><TableHead>Setor</TableHead><TableHead>Código</TableHead><TableHead>Gestores</TableHead><TableHead>Membros</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {sectors.map((s) => {
            const managers = userSectors.filter((us) => us.sector_id === s.id && us.sector_role === "gestor").map((us) => profiles.find((p) => p.id === us.user_id)?.full_name).filter(Boolean);
            const members = userSectors.filter((us) => us.sector_id === s.id).length;
            return (
              <TableRow key={s.id}>
                <TableCell className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: s.color }} /> <span className="font-medium">{s.name}</span></TableCell>
                <TableCell className="font-mono text-xs">{s.code}</TableCell>
                <TableCell className="text-sm">{managers.join(", ") || "—"}</TableCell>
                <TableCell>{members}</TableCell>
                <TableCell><Badge variant={s.active ? "secondary" : "outline"}>{s.active ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell className="text-right">
                  {canEdit && <SectorDialog initial={s} onSave={(ss) => { upsert(ss); toast.success("Setor atualizado"); }} onDelete={() => { remove(s.id); toast.success("Setor removido"); }} />}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table></Card>
    </div>
  );
}

function SectorDialog({ initial, onSave, onDelete }: { initial?: Sector; onSave: (s: Sector) => void; onDelete?: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Sector>(initial ?? {
    id: newId(), name: "", code: "", color: "#2563eb", icon: "Briefcase",
    active: true, requires_approval: true, display_order: 99, created_at: new Date().toISOString(),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={initial ? "ghost" : "default"} size={initial ? "icon" : "default"}>
          {initial ? <Pencil className="size-4" /> : <><Plus className="size-4" />Novo setor</>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Editar setor" : "Novo setor"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Código</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></div>
            <div><Label>Cor</Label><Input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} /></div>
          </div>
          <div><Label>Descrição</Label><Input value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="flex items-center justify-between border rounded-md p-3">
            <div><p className="text-sm font-medium">Setor ativo</p></div>
            <Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} />
          </div>
          <div className="flex items-center justify-between border rounded-md p-3">
            <div><p className="text-sm font-medium">Exige aprovação de lançamentos</p></div>
            <Switch checked={f.requires_approval} onCheckedChange={(v) => setF({ ...f, requires_approval: v })} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {onDelete && <Button variant="destructive" onClick={() => { onDelete(); setOpen(false); }}>Excluir</Button>}
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => { onSave(f); setOpen(false); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
