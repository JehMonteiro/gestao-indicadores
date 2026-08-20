import { newId } from "@/lib/ids";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { useStore, useCurrentUser } from "@/mocks/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Search, Network } from "lucide-react";
import type { Franchise } from "@/mocks/types";
import { isEmpresa, isFranquia, isGrupo, operatingTime } from "@/lib/entity-kind";
import { formatDate } from "@/lib/format";
import { ImportFranchisesDialog } from "@/components/app/import-franchises-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/franquias/")({
  head: () => ({
    meta: [
      { title: "Empresas / Franquias — Gestão de Indicadores" },
      { name: "description", content: "Entidades do Grupo Nocta e unidades franqueadas." },
      { property: "og:title", content: "Empresas / Franquias — Gestão de Indicadores" },
      { property: "og:description", content: "Entidades do Grupo Nocta e unidades franqueadas." },
    ],
  }),
  component: EntitiesPage,
});

const PAGE_SIZE = 20;

function EntitiesPage() {
  const [aba, setAba] = useState<"empresas" | "franquias">("empresas");
  const franchises = useStore((s) => s.franchises);
  const upsert = useStore((s) => s.upsertFranchise);
  const remove = useStore((s) => s.deleteFranchise);
  const user = useCurrentUser();
  const canEdit = user?.global_role === "superadmin" || user?.global_role === "admin_corporativo";

  const empresas = useMemo(
    () => franchises.filter(isEmpresa).sort((a, b) => (isGrupo(b) ? 1 : 0) - (isGrupo(a) ? 1 : 0) || a.name.localeCompare(b.name)),
    [franchises],
  );
  const unidades = useMemo(() => franchises.filter(isFranquia), [franchises]);
  const noctaFranquia = useMemo(
    () => franchises.find((f) => f.entity_type === "empresa" && f.name.toLowerCase().includes("nocta franquia")),
    [franchises],
  );

  return (
    <div>
      <PageHeader
        title="Empresas / Franquias"
        description="Entidades do Grupo Nocta e unidades franqueadas."
      />
      <Tabs value={aba} onValueChange={(v) => setAba(v as "empresas" | "franquias")}>
        <TabsList className="mb-4">
          <TabsTrigger value="empresas">Empresas ({empresas.length})</TabsTrigger>
          <TabsTrigger value="franquias">Franquias ({unidades.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="empresas">
          <CompaniesTab list={empresas} canEdit={canEdit} onSave={upsert} onDelete={remove} />
        </TabsContent>
        <TabsContent value="franquias">
          <UnitsTab list={unidades} canEdit={canEdit} onSave={upsert} onDelete={remove} parentId={noctaFranquia?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CompaniesTab({ list, canEdit, onSave, onDelete }: {
  list: Franchise[]; canEdit: boolean; onSave: (f: Franchise) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <EntityDialog kind="empresa" onSave={onSave} />
        </div>
      )}
      {list.length === 0 ? (
        <EmptyState title="Nenhuma empresa cadastrada." icon={<Network className="size-5" />} />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead><TableHead>Código</TableHead><TableHead>CNPJ</TableHead>
              <TableHead>Cidade/UF</TableHead><TableHead>Status</TableHead><TableHead className="w-20" />
            </TableRow></TableHeader>
            <TableBody>
              {list.map((f) => (
                <TableRow key={f.id} className={isGrupo(f) ? "bg-primary/5" : undefined}>
                  <TableCell className="font-medium">
                    {isGrupo(f) ? (
                      <span className="flex items-center gap-2">
                        {f.name}
                        <Badge variant="secondary">Grupo</Badge>
                      </span>
                    ) : (
                      <span className="pl-4">{f.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{f.code}</TableCell>
                  <TableCell className="text-sm">{f.document || "—"}</TableCell>
                  <TableCell className="text-sm">{[f.city, f.state].filter(Boolean).join("/") || "—"}</TableCell>
                  <TableCell><Badge variant={f.status === "ativa" ? "secondary" : "outline"} className="capitalize">{f.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <EntityDialog
                        kind="empresa" initial={f}
                        onSave={(x) => { onSave(x); toast.success("Atualizado"); }}
                        onDelete={() => { onDelete(f.id); toast.success("Removido"); }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function UnitsTab({ list, canEdit, onSave, onDelete, parentId }: {
  list: Franchise[]; canEdit: boolean; onSave: (f: Franchise) => void; onDelete: (id: string) => void; parentId?: string;
}) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const regions = useMemo(
    () => Array.from(new Set(list.map((f) => f.region).filter(Boolean))).sort(),
    [list],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return list.filter((f) =>
      (term === "" || f.name.toLowerCase().includes(term) || (f.code ?? "").toLowerCase().includes(term)) &&
      (region === "all" || f.region === region) &&
      (status === "all" || f.status === status));
  }, [list, q, region, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Buscar por nome ou código..." className="pl-8" />
        </div>
        <Select value={region} onValueChange={(v) => { setRegion(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Região" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as regiões</SelectItem>
            {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativa">Ativa</SelectItem>
            <SelectItem value="inativa">Inativa</SelectItem>
          </SelectContent>
        </Select>
        {canEdit && <ImportFranchisesDialog parentId={parentId} />}
        {canEdit && <EntityDialog kind="franquia" parentId={parentId} onSave={onSave} />}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhuma franquia cadastrada."
          description="As unidades franqueadas ficam vinculadas à Nocta Franquia."
          icon={<Network className="size-5" />}
        />
      ) : (
        <>
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Unidade</TableHead><TableHead>Código</TableHead><TableHead>Cidade/UF</TableHead>
                <TableHead>Região</TableHead><TableHead>Início</TableHead><TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">
                      <Link to="/franquias/$id" params={{ id: f.id }} className="hover:underline">{f.name}</Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{f.code}</TableCell>
                    <TableCell className="text-sm">{[f.city, f.state].filter(Boolean).join("/") || "—"}</TableCell>
                    <TableCell className="text-sm">{f.region || "—"}</TableCell>
                    <TableCell className="text-sm">
                      <div>{f.start_date ? formatDate(f.start_date) : "—"}</div>
                      <div className="text-xs text-muted-foreground">{operatingTime(f.start_date)}</div>
                    </TableCell>
                    <TableCell><Badge variant={f.status === "ativa" ? "secondary" : "outline"} className="capitalize">{f.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {canEdit && (
                        <EntityDialog
                          kind="franquia" initial={f} parentId={parentId}
                          onSave={(x) => { onSave(x); toast.success("Atualizado"); }}
                          onDelete={() => { onDelete(f.id); toast.success("Removido"); }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{filtered.length} unidades · página {current} de {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => setPage(current - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={current >= totalPages} onClick={() => setPage(current + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EntityDialog({ kind, initial, onSave, onDelete, parentId }: {
  kind: "empresa" | "franquia";
  initial?: Franchise;
  parentId?: string;
  onSave: (f: Franchise) => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const blank = (): Franchise => ({
    id: newId(), name: "", code: "", city: "", state: "", region: "", status: "ativa",
    start_date: new Date().toISOString().slice(0, 10), created_at: new Date().toISOString(),
  });
  const [f, setF] = useState<Franchise>(initial ?? blank);
  const label = kind === "franquia" ? "franquia" : "empresa";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={initial ? "ghost" : "default"} size={initial ? "icon" : "default"}>
          {initial ? <Pencil className="size-4" /> : <><Plus className="size-4" />Nova {label}</>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? `Editar ${label}` : `Nova ${label}`}</DialogTitle>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          {kind === "franquia" && (
            <>
              <div>
                <Label>Tipo de entidade</Label>
                <Input value="Franquia" readOnly disabled />
              </div>
              <div>
                <Label>Vinculada a</Label>
                <Input value="Nocta Franquia" readOnly disabled />
              </div>
            </>
          )}
          <div className="sm:col-span-2"><Label>Nome</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>Código</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></div>
          <div><Label>CNPJ (opcional)</Label><Input value={f.document ?? ""} onChange={(e) => setF({ ...f, document: e.target.value })} /></div>
          <div><Label>Razão social</Label><Input value={f.legal_name ?? ""} onChange={(e) => setF({ ...f, legal_name: e.target.value })} /></div>
          <div><Label>Nome fantasia</Label><Input value={f.trade_name ?? ""} onChange={(e) => setF({ ...f, trade_name: e.target.value })} /></div>
          <div><Label>Cidade</Label><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
          <div><Label>UF</Label><Input value={f.state} onChange={(e) => setF({ ...f, state: e.target.value.toUpperCase() })} /></div>
          {kind === "franquia" && (
            <>
              <div><Label>Região</Label><Input value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })} /></div>
              <div><Label>Início</Label><Input type="date" value={f.start_date?.slice(0, 10) ?? ""} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></div>
            </>
          )}
        </div>
        <DialogFooter>
          {onDelete && <Button variant="destructive" onClick={() => { onDelete(); setOpen(false); }}>Excluir</Button>}
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => {
            const base = initial ? f : { ...f, id: newId() };
            const payload: Franchise = kind === "franquia"
              ? { ...base, entity_type: "franquia", parent_id: parentId ?? base.parent_id ?? null }
              : { ...base, entity_type: base.entity_type ?? "empresa" };
            onSave(payload);
            setOpen(false);
            if (!initial) setF(blank());
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
