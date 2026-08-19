import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useStore, useCurrentUser } from "@/mocks/store";
import { ENTITY_SCOPES, unclassified, hasUnmappedSuffix, codeSuffix } from "@/lib/entity-scope";
import { isFranquia } from "@/lib/entity-kind";
import { loadAllFromSupabase } from "@/lib/supabase-data";
import type { EntityScope } from "@/mocks/types";

export const Route = createFileRoute("/_authenticated/classificacao-escopo")({
  head: () => ({
    meta: [
      { title: "Classificação de escopo | Gestão de Indicadores" },
      { name: "description", content: "Defina se cada indicador pendente pertence a uma Empresa do Grupo Nocta ou a uma Franquia." },
      { property: "og:title", content: "Classificação de escopo" },
      { property: "og:description", content: "Revisão de indicadores sem escopo definido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ScopeReviewPage,
});

function ScopeReviewPage() {
  const indicators = useStore((s) => s.indicators);
  const franchises = useStore((s) => s.franchises);
  const upsert = useStore((s) => s.upsertIndicator);
  const logAudit = useStore((s) => s.logAudit);
  const user = useCurrentUser();
  const isSuper = user?.global_role === "superadmin";

  const pending = useMemo(() => unclassified(indicators), [indicators]);
  const unidades = useMemo(() => franchises.filter(isFranquia), [franchises]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkScope, setBulkScope] = useState<EntityScope | "">("");
  const [bulkEntity, setBulkEntity] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  const refresh = async () => {
    if (user?.id) {
      const data = await loadAllFromSupabase(user.id);
      useStore.getState().hydrate(data);
    }
  };

  const apply = async (ids: string[], scope: EntityScope, entityId: string | null) => {
    setSaving(true);
    try {
      for (const id of ids) {
        const ind = indicators.find((i) => i.id === id);
        if (!ind) continue;
        await upsert({ ...ind, entity_scope: scope, entity_id: scope === "franquia" ? entityId : null });
        logAudit({ user_id: user?.id ?? "", action: "update", entity_type: "indicator", entity_id: id });
      }
      await refresh();
      setSelected({});
      toast.success(`${ids.length} indicador(es) classificado(s)`);
    } catch {
      toast.error("Não foi possível classificar");
    } finally {
      setSaving(false);
    }
  };

  if (!isSuper) {
    return (
      <div>
        <PageHeader title="Classificação de escopo" />
        <EmptyState title="Acesso restrito" description="Apenas o Superadmin pode classificar o escopo dos indicadores." icon={<ShieldAlert className="size-5" />} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Classificação de escopo"
        description="Defina se cada indicador pendente pertence a uma Empresa do Grupo Nocta ou a uma Franquia."
        actions={<Button asChild variant="outline"><Link to="/indicadores">Voltar</Link></Button>}
      />

      <Alert className="mb-4">
        <Info className="size-4" />
        <AlertDescription>
          Indicadores com sufixos sem empresa correspondente (ex.: <span className="font-mono">_CED</span>, <span className="font-mono">_CEO</span>) exigem decisão manual. Nenhum lançamento é alterado por esta tela.
        </AlertDescription>
      </Alert>

      {pending.length === 0 ? (
        <EmptyState title="Nenhuma pendência" description="Todos os indicadores já possuem escopo definido." icon={<Info className="size-5" />} />
      ) : (
        <>
          <Card className="mb-4 p-3 flex flex-wrap items-end gap-3">
            <div className="min-w-40">
              <p className="text-xs text-muted-foreground mb-1">Escopo em lote</p>
              <Select value={bulkScope} onValueChange={(v) => { setBulkScope(v as EntityScope); setBulkEntity(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{ENTITY_SCOPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {bulkScope === "franquia" && (
              <div className="min-w-48">
                <p className="text-xs text-muted-foreground mb-1">Unidade</p>
                <Select value={bulkEntity || "rede"} onValueChange={(v) => setBulkEntity(v === "rede" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rede">Toda a rede</SelectItem>
                    {unidades.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              disabled={saving || !bulkScope || selectedIds.length === 0}
              onClick={() => bulkScope && apply(selectedIds, bulkScope, bulkEntity || null)}
            >
              Aplicar a {selectedIds.length} selecionado(s)
            </Button>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.length === pending.length && pending.length > 0}
                      onCheckedChange={(v) =>
                        setSelected(v ? Object.fromEntries(pending.map((i) => [i.id, true])) : {})
                      }
                    />
                  </TableHead>
                  <TableHead>Indicador</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Sufixo</TableHead>
                  <TableHead className="text-right">Classificar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((i) => (
                  <TableRow key={i.id} className={hasUnmappedSuffix(i) ? "bg-destructive/5" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={!!selected[i.id]}
                        onCheckedChange={(v) => setSelected((p) => ({ ...p, [i.id]: !!v }))}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell className="font-mono text-xs">{i.code}</TableCell>
                    <TableCell>
                      {codeSuffix(i.code) ? (
                        <Badge variant={hasUnmappedSuffix(i) ? "destructive" : "secondary"}>{codeSuffix(i.code)}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" disabled={saving} onClick={() => apply([i.id], "empresa", null)}>Empresa</Button>
                        <Button size="sm" variant="outline" disabled={saving} onClick={() => apply([i.id], "franquia", null)}>Franquia</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
