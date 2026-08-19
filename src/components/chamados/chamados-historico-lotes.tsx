import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatarData, formatarDataHora } from "@/lib/chamados-utils";
import type { LoteChamados } from "@/types/chamados";

export function ChamadosHistoricoLotes({
  lotes, podeExcluir,
}: { lotes: LoteChamados[]; podeExcluir: boolean }) {
  const qc = useQueryClient();
  const [alvo, setAlvo] = useState<LoteChamados | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const excluir = async () => {
    if (!alvo) return;
    setExcluindo(true);
    const { error } = await supabase.from("chamados").delete().eq("lote_id", alvo.lote_id);
    setExcluindo(false);
    setAlvo(null);
    if (error) {
      toast.error("Não foi possível excluir o lote", { description: error.message });
      return;
    }
    toast.success("Lote excluído");
    await qc.invalidateQueries({ queryKey: ["chamados"] });
  };

  return (
    <Card className="p-2">
      <Accordion type="single" collapsible>
        <AccordionItem value="lotes" className="border-none">
          <AccordionTrigger className="px-2">Histórico de Importações ({lotes.length} lotes)</AccordionTrigger>
          <AccordionContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Data import</TableHead>
                  <TableHead scope="col">Importado por</TableHead>
                  <TableHead scope="col" className="text-right">Registros</TableHead>
                  <TableHead scope="col">Período dos dados</TableHead>
                  <TableHead scope="col" className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotes.map((l) => (
                  <TableRow key={l.lote_id}>
                    <TableCell className="text-xs">{formatarDataHora(l.importado_em)}</TableCell>
                    <TableCell className="text-sm">{l.importado_por_nome}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.total_registros}</TableCell>
                    <TableCell className="text-xs">
                      {formatarData(l.periodo_inicio)} – {formatarData(l.periodo_fim)}
                    </TableCell>
                    <TableCell className="text-right">
                      {podeExcluir && (
                        <Button variant="ghost" size="sm" aria-label="Excluir lote" onClick={() => setAlvo(l)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {lotes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      Nenhuma importação registrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <AlertDialog open={!!alvo} onOpenChange={(v) => { if (!v) setAlvo(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lote de importação?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os {alvo?.total_registros ?? 0} chamados desse lote serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={excluindo} onClick={(e) => { e.preventDefault(); void excluir(); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
