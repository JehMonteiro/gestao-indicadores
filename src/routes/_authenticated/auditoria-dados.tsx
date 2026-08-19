import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info, ShieldAlert } from "lucide-react";
import { useCurrentUser } from "@/mocks/store";
import { getDataAudit } from "@/lib/audit-data.functions";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/auditoria-dados")({
  head: () => ({
    meta: [
      { title: "Auditoria de dados | Gestão de Indicadores" },
      { name: "description", content: "Diagnóstico somente leitura de contagens brutas, indicadores sem escopo, lançamentos órfãos e histórico de alterações." },
      { property: "og:title", content: "Auditoria de dados" },
      { property: "og:description", content: "Diagnóstico somente leitura das tabelas de indicadores, metas e lançamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DataAuditPage,
});

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

function DataAuditPage() {
  const user = useCurrentUser();
  const isSuper = user?.global_role === "superadmin";
  const fetchAudit = useServerFn(getDataAudit);
  const { data, isLoading, error } = useQuery({
    queryKey: ["data-audit"],
    enabled: isSuper,
    queryFn: () => fetchAudit(),
  });

  if (!isSuper) {
    return (
      <div>
        <PageHeader title="Auditoria de dados" description="Diagnóstico somente leitura." />
        <Alert>
          <ShieldAlert className="size-4" />
          <AlertDescription>Acesso restrito ao Superadmin.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria de dados"
        description="Somente leitura. Nenhum dado é alterado, criado ou excluído nesta tela."
      />

      {isLoading && <p className="text-sm text-muted-foreground">Carregando diagnóstico…</p>}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>Não foi possível carregar o diagnóstico.</AlertDescription>
        </Alert>
      )}

      {data && (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">1. Contagens brutas</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Lançamentos (indicator_entries)" value={data.counts.entries} />
              <Metric label="Metas (targets)" value={data.counts.targets} />
              <Metric label="Indicadores" value={data.counts.indicators} />
              <Metric label="Indicadores sem escopo" value={data.counts.indicatorsNoScope} />
              <Metric label="Indicadores escopo Empresa" value={data.counts.indicatorsEmpresa} />
              <Metric label="Indicadores escopo Franquia" value={data.counts.indicatorsFranquia} />
            </div>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-2">Lançamentos por status</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.counts.entriesByStatus).map(([s, n]) => (
                  <Badge key={s} variant="outline" className="capitalize">{s}: {n}</Badge>
                ))}
                {Object.keys(data.counts.entriesByStatus).length === 0 && (
                  <span className="text-sm text-muted-foreground">Nenhum lançamento.</span>
                )}
              </div>
            </Card>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">2. Indicadores invisíveis</h2>
            <Alert>
              <Info className="size-4" />
              <AlertDescription>
                {data.hiddenEntryTotal} lançamentos estão ocultos por falta de classificação.
              </AlertDescription>
            </Alert>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicador</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Lançamentos</TableHead>
                    <TableHead className="text-right">Acumulado</TableHead>
                    <TableHead>Último lançamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.hidden.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>{h.name}</TableCell>
                      <TableCell className="font-mono text-xs">{h.code}</TableCell>
                      <TableCell className="text-right tabular-nums">{h.entryCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{Math.round(h.total)}</TableCell>
                      <TableCell>{h.lastEntry ? formatDate(h.lastEntry, "dd/MM/yyyy") : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {data.hidden.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum indicador sem escopo.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">3. Lançamentos órfãos</h2>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>indicator_id</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.orphans.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.indicator_id}</TableCell>
                      <TableCell>{formatDate(o.period_start, "dd/MM/yyyy")} – {formatDate(o.period_end, "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-right tabular-nums">{Math.round(o.actual_value)}</TableCell>
                    </TableRow>
                  ))}
                  {data.orphans.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhum lançamento órfão.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">4. Indicadores excluídos logicamente</h2>
            <Alert>
              <Info className="size-4" />
              <AlertDescription>
                A exclusão lógica não está implementada: a tabela de indicadores não possui a coluna
                <span className="font-mono"> deleted_at</span>. As exclusões são físicas e aparecem no histórico de auditoria abaixo.
              </AlertDescription>
            </Alert>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">5. Auditoria recente</h2>
            <p className="text-xs text-muted-foreground">
              Últimos 200 registros de alterações e exclusões. O estado anterior (previous_data) não é armazenado hoje —
              o expander mostra o payload registrado na ação.
            </p>
            <Card className="p-2">
              <Accordion type="multiple">
                {data.logs.map((l) => (
                  <AccordionItem key={l.id} value={l.id}>
                    <AccordionTrigger className="px-2">
                      <div className="grid w-full grid-cols-2 md:grid-cols-5 gap-2 text-left text-sm items-center">
                        <span>{formatDate(l.created_at, "dd/MM/yyyy HH:mm")}</span>
                        <span className="truncate">{l.user_name}</span>
                        <span><Badge variant="outline" className="capitalize">{l.action}</Badge></span>
                        <span>{l.entity_type}</span>
                        <span className="font-mono text-xs truncate">{l.entity_id ?? "—"}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto">{l.payload ?? "Sem payload registrado."}</pre>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {data.logs.length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">Sem registros de alteração ou exclusão.</p>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
