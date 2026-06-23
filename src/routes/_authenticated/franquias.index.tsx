import { newId } from "@/lib/ids";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { useStore, useCurrentUser } from "@/mocks/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import type { Franchise } from "@/mocks/types";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/franquias/")({
  head: () => ({ meta: [{ title: "Franquias" }] }),
  component: FranchisesPage,
});

function FranchisesPage() {
  const franchises = useStore((s) => s.franchises);
  const upsert = useStore((s) => s.upsertFranchise);
  const remove = useStore((s) => s.deleteFranchise);
  const user = useCurrentUser();
  const canEdit = user?.global_role === "superadmin" || user?.global_role === "admin_corporativo";
  return (
    <div>
      <PageHeader title="Franquias" description="Unidades franqueadas e seus dados cadastrais."
        actions={canEdit && <FranchiseDialog onSave={upsert} />}
      />
      <Card><Table>
        <TableHeader><TableRow><TableHead>Unidade</TableHead><TableHead>Código</TableHead><TableHead>Cidade/UF</TableHead><TableHead>Região</TableHead><TableHead>Início</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {franchises.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="font-medium">{f.name}</TableCell>
              <TableCell className="font-mono text-xs">{f.code}</TableCell>
              <TableCell>{f.city}/{f.state}</TableCell>
              <TableCell>{f.region}</TableCell>
              <TableCell>{formatDate(f.start_date)}</TableCell>
              <TableCell><Badge variant={f.status === "ativa" ? "secondary" : "outline"} className="capitalize">{f.status}</Badge></TableCell>
              <TableCell className="text-right">{canEdit && <FranchiseDialog initial={f} onSave={(x) => { upsert(x); toast.success("Atualizado"); }} onDelete={() => { remove(f.id); toast.success("Removido"); }} />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></Card>
    </div>
  );
}

function FranchiseDialog({ initial, onSave, onDelete }: { initial?: Franchise; onSave: (f: Franchise) => void; onDelete?: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Franchise>(initial ?? {
    id: newId(), name: "", code: "", city: "", state: "", region: "", status: "ativa",
    start_date: new Date().toISOString().slice(0,10), created_at: new Date().toISOString(),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={initial ? "ghost" : "default"} size={initial ? "icon" : "default"}>
          {initial ? <Pencil className="size-4" /> : <><Plus className="size-4" />Nova franquia</>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Editar franquia" : "Nova franquia"}</DialogTitle></DialogHeader>
        <div className="space-y-3 grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><Label>Nome</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>Código</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></div>
          <div><Label>CNPJ (opcional)</Label><Input value={f.document ?? ""} onChange={(e) => setF({ ...f, document: e.target.value })} /></div>
          <div><Label>Razão social</Label><Input value={f.legal_name ?? ""} onChange={(e) => setF({ ...f, legal_name: e.target.value })} /></div>
          <div><Label>Nome fantasia</Label><Input value={f.trade_name ?? ""} onChange={(e) => setF({ ...f, trade_name: e.target.value })} /></div>
          <div><Label>Cidade</Label><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
          <div><Label>UF</Label><Input value={f.state} onChange={(e) => setF({ ...f, state: e.target.value.toUpperCase() })} maxLength={2} /></div>
          <div><Label>Região</Label><Input value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })} /></div>
          <div><Label>Início</Label><Input type="date" value={f.start_date.slice(0,10)} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></div>
        </div>
        <DialogFooter>
          {onDelete && <Button variant="destructive" onClick={() => { onDelete(); setOpen(false); }}>Excluir</Button>}
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => { onSave(f); setOpen(false); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
