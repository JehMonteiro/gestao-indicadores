import type { EntityKind } from "@/lib/entity-kind";
import { filterByScope, unclassified } from "@/lib/entity-scope";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { useStore } from "@/mocks/store";
import { useVisibleIndicators } from "@/lib/permissions";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { classify, classificationStyles, computeAchievement, formatValue, indicatorPeriodLabel, KPI_GROUPS, kpiGroupStyles } from "@/lib/format";
import { registeredEntriesForIndicator, resolveTargetForEntry, resolveTargetForIndicator } from "@/lib/metrics";
import { Plus, Search, Target, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useCurrentUser } from "@/mocks/store";
import { ImportIndicatorsDialog } from "@/components/app/import-indicators-dialog";

export function IndicadoresPage({ escopo = "empresa" }: { escopo?: EntityKind }) {
  const indicators = useVisibleIndicators();
  const { isAdmin } = useIsAdmin();
  const sectors = useStore((s) => s.sectors);
  const franchises = useStore((s) => s.franchises);
  const profiles = useStore((s) => s.profiles);
  const targets = useStore((s) => s.targets);
  const entries = useStore((s) => s.entries);
  const settings = useStore((s) => s.settings);
  const deleteIndicator = useStore((s) => s.deleteIndicator);
  const logAudit = useStore((s) => s.logAudit);
  const user = useCurrentUser();

  const [q, setQ] = useState("");
  const [sectorId, setSectorId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [kpiGroup, setKpiGroup] = useState<string>("all");
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);

  const scoped = filterByScope(indicators, escopo);
  const semEscopo = unclassified(indicators).length;

  const filtered = scoped.filter((i) =>
    (q === "" || i.name.toLowerCase().includes(q.toLowerCase()) || i.code.toLowerCase().includes(q.toLowerCase())) &&
    (sectorId === "all" || i.owner_sector_id === sectorId) &&
    (status === "all" || i.status === status) &&
    (kpiGroup === "all" || (i.kpi_group ?? "resultado") === kpiGroup)
  );

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteIndicator(toDelete.id);
    logAudit({ user_id: user?.id ?? "", action: "delete", entity_type: "indicator", entity_id: toDelete.id });
    toast.success(`Indicador "${toDelete.name}" excluído`);
    setToDelete(null);
  };

  return (
    <div>
      {semEscopo > 0 && (
        <Alert className="mb-4">
          <Info className="size-4" />
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>{semEscopo} indicador(es) ainda sem escopo definido e não aparecem nestas listas.</span>
            <Button asChild size="sm" variant="outline"><Link to="/classificacao-escopo">Classificar agora</Link></Button>
          </AlertDescription>
        </Alert>
      )}
      <PageHeader title={escopo === "franquia" ? "Indicadores Franquia" : "Indicadores"} description="Catálogo de indicadores por setor."
        actions={isAdmin ? (
          <div className="flex gap-2">
            <ImportIndicatorsDialog />
            <Button asChild><Link to="/indicadores/novo"><Plus className="size-4" />Novo indicador</Link></Button>
          </div>
        ) : null}
      />

      <Card className="mb-4">
        <CardContent className="p-3 grid sm:grid-cols-[1fr_auto_auto_auto] gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou código..." className="pl-8" />
          </div>
          <Select value={sectorId} onValueChange={setSectorId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Setor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={kpiGroup} onValueChange={setKpiGroup}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Grupo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {KPI_GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="pausado">Pausado</SelectItem>
              <SelectItem value="arquivado">Arquivado</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum indicador encontrado" description="Ajuste os filtros ou crie um novo indicador." icon={<Target className="size-5" />} />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Indicador</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Periodicidade</TableHead>
                <TableHead>Último resultado</TableHead>
                <TableHead>Atingimento</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="w-20 text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((i) => {
                const sector = sectors.find((s) => s.id === i.owner_sector_id);
                const franchise = i.franchise_id ? franchises.find((fr) => fr.id === i.franchise_id) : null;
                const responsibleNames = (i.responsible_ids ?? [])
                  .map((rid) => profiles.find((p) => p.id === rid)?.full_name)
                  .filter(Boolean)
                  .join(", ");
                const e = registeredEntriesForIndicator(i, entries).slice(-1)[0];
                const t = e ? resolveTargetForEntry(i, e, targets) : resolveTargetForIndicator(i, targets);
                const pct = computeAchievement(e, t, i.direction);
                const c = classify(pct, settings);
                const cs = classificationStyles(c);
                return (
                  <TableRow key={i.id} className="cursor-pointer">
                    <TableCell>
                      <Link to="/indicadores/$id" params={{ id: i.id }} className="hover:underline font-medium">{i.name}</Link>
                    </TableCell>
                    <TableCell>{(() => { const st = kpiGroupStyles(i.kpi_group ?? "resultado"); return <Badge variant="outline" className={st.className}>{st.label}</Badge>; })()}</TableCell>
                    <TableCell>{sector && <Badge variant="outline" style={{ borderColor: sector.color, color: sector.color }}>{sector.name}</Badge>}</TableCell>
                    <TableCell className="text-sm">{franchise ? franchise.name : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-sm">{responsibleNames || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-sm">{indicatorPeriodLabel(i)}</TableCell>
                    <TableCell className="font-mono text-sm">{e ? formatValue(e.actual_value, i.value_type) : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={cs.className}>{pct != null ? `${Math.round(pct)}% · ${cs.label}` : cs.label}</Badge></TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{i.status}</Badge></TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild size="icon" variant="ghost" title="Editar">
                            <Link to="/indicadores/$id/editar" params={{ id: i.id }}><Pencil className="size-4" /></Link>
                          </Button>
                          <Button size="icon" variant="ghost" title="Excluir" onClick={() => setToDelete({ id: i.id, name: i.name })}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir indicador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O indicador "{toDelete?.name}" e seus dados relacionados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
