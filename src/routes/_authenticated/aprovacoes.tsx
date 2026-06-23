import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { useStore, useCurrentUser } from "@/mocks/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatValue } from "@/lib/format";
import { toast } from "sonner";
import { CheckSquare } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/aprovacoes")({
  head: () => ({ meta: [{ title: "Aprovações" }] }),
  component: Approvals,
});

function Approvals() {
  const user = useCurrentUser();
  const entries = useStore((s) => s.entries);
  const indicators = useStore((s) => s.indicators);
  const userSectors = useStore((s) => s.userSectors);
  const setStatus = useStore((s) => s.setEntryStatus);
  const logAudit = useStore((s) => s.logAudit);

  const managedSectorIds = userSectors.filter((us) => us.user_id === user?.id && us.sector_role === "gestor").map((us) => us.sector_id);
  const isAdmin = user?.global_role === "superadmin" || user?.global_role === "admin_corporativo";

  const relevant = entries.filter((e) => {
    const ind = indicators.find((i) => i.id === e.indicator_id);
    if (!ind) return false;
    return isAdmin || managedSectorIds.includes(ind.owner_sector_id);
  });

  const byStatus = (s: string) => relevant.filter((e) => e.status === s);

  return (
    <div>
      <PageHeader title="Central de aprovações" description="Aprove ou rejeite lançamentos do seu escopo." />
      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes ({byStatus("enviado").length})</TabsTrigger>
          <TabsTrigger value="aprovados">Aprovados ({byStatus("aprovado").length})</TabsTrigger>
          <TabsTrigger value="rejeitados">Rejeitados ({byStatus("rejeitado").length})</TabsTrigger>
          <TabsTrigger value="atrasados">Atrasados</TabsTrigger>
        </TabsList>
        {(["enviado","aprovado","rejeitado","atrasado"] as const).map((st, idx) => {
          const tabValue = ["pendentes","aprovados","rejeitados","atrasados"][idx];
          const list = byStatus(st);
          return (
            <TabsContent key={st} value={tabValue}>
              {list.length === 0 ? (
                <EmptyState title="Nada por aqui" description="Sem lançamentos neste status." icon={<CheckSquare className="size-5" />} />
              ) : (
                <Card><Table>
                  <TableHeader><TableRow>
                    <TableHead>Indicador</TableHead><TableHead>Período</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {list.map((e) => {
                      const ind = indicators.find((i) => i.id === e.indicator_id);
                      return (
                        <TableRow key={e.id}>
                          <TableCell><Link to="/lancamentos/$id" params={{ id: e.id }} className="font-medium hover:underline">{ind?.name}</Link></TableCell>
                          <TableCell>{formatDate(e.period_start)} — {formatDate(e.period_end)}</TableCell>
                          <TableCell className="font-mono">{formatValue(e.actual_value, ind?.value_type ?? "inteiro", ind?.unit)}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{e.status}</Badge></TableCell>
                          <TableCell className="text-right">
                            {st === "enviado" && (
                              <div className="flex justify-end gap-2">
                                <Button size="sm" onClick={() => {
                                  setStatus(e.id, "aprovado", { approved_by: user?.id, approved_at: new Date().toISOString() });
                                  logAudit({ user_id: user?.id ?? "", action: "approve", entity_type: "entry", entity_id: e.id });
                                  toast.success("Aprovado");
                                }}>Aprovar</Button>
                                <RejectDialog onConfirm={(reason) => {
                                  setStatus(e.id, "rejeitado", { rejection_reason: reason });
                                  logAudit({ user_id: user?.id ?? "", action: "reject", entity_type: "entry", entity_id: e.id });
                                  toast.success("Rejeitado");
                                }} />
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table></Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function RejectDialog({ onConfirm }: { onConfirm: (reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [r, setR] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="destructive">Rejeitar</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Motivo da rejeição</DialogTitle></DialogHeader>
        <Textarea value={r} onChange={(e) => setR(e.target.value)} placeholder="Explique o motivo..." />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={() => { if (r) { onConfirm(r); setOpen(false); setR(""); } }}>Rejeitar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
