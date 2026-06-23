import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { useStore } from "@/mocks/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria" }] }),
  component: AuditPage,
});

function AuditPage() {
  const logs = useStore((s) => s.auditLogs);
  const profiles = useStore((s) => s.profiles);
  return (
    <div>
      <PageHeader title="Auditoria" description="Histórico imutável das ações executadas no sistema." />
      <Card><Table>
        <TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Usuário</TableHead><TableHead>Ação</TableHead><TableHead>Entidade</TableHead><TableHead>ID</TableHead></TableRow></TableHeader>
        <TableBody>
          {logs.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="text-sm">{formatDate(l.created_at, "dd/MM/yyyy HH:mm")}</TableCell>
              <TableCell>{profiles.find((p) => p.id === l.user_id)?.full_name ?? l.user_id}</TableCell>
              <TableCell><Badge variant="outline" className="capitalize">{l.action}</Badge></TableCell>
              <TableCell>{l.entity_type}</TableCell>
              <TableCell className="font-mono text-xs">{l.entity_id}</TableCell>
            </TableRow>
          ))}
          {logs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sem registros ainda.</TableCell></TableRow>}
        </TableBody>
      </Table></Card>
    </div>
  );
}
