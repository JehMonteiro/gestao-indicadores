import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatarDataHora, formatarHoras } from "@/lib/chamados-utils";
import type { Chamado } from "@/types/chamados";
import { CORES_SITUACAO } from "@/types/chamados";

function Linha({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h4 className="text-xs font-semibold uppercase text-muted-foreground">{titulo}</h4>
      {children}
    </section>
  );
}

export function ChamadosDetalhesSheet({
  chamado, onClose,
}: { chamado: Chamado | null; onClose: () => void }) {
  return (
    <Sheet open={!!chamado} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
        {chamado && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Badge variant="outline" className={CORES_SITUACAO[chamado.situacao]}>{chamado.situacao}</Badge>
              </SheetTitle>
              <SheetDescription>
                Lote {chamado.lote_id} · importado em {formatarDataHora(chamado.importado_em)}
              </SheetDescription>
            </SheetHeader>

            <div className="px-4 pb-6 space-y-5">
              <Secao titulo="Datas">
                <Linha label="Aberto em" value={formatarDataHora(chamado.aberto_em)} />
                <Linha label="Respondido em" value={formatarDataHora(chamado.respondido_em)} />
                <Linha label="Resolvido em" value={formatarDataHora(chamado.resolvido_em)} />
                <Linha label="Concluído em" value={formatarDataHora(chamado.concluido_em)} />
                <Linha label="Prazo planejado" value={formatarDataHora(chamado.prazo_planejado)} />
                <Linha label="Prazo estipulado" value={formatarDataHora(chamado.prazo_estipulado)} />
              </Secao>

              <Secao titulo="Métricas">
                <Linha label="TMA" value={formatarHoras(chamado.tma_horas)} />
                <Linha label="TMR" value={formatarHoras(chamado.tmr_horas)} />
                <Linha
                  label="No prazo"
                  value={chamado.no_prazo == null ? "—" : chamado.no_prazo ? "Sim" : "Não"}
                />
              </Secao>

              <Secao titulo="Pessoas">
                <Linha label="Solicitante" value={chamado.solicitante ?? "—"} />
                <Linha label="Responsável" value={chamado.responsavel ?? "—"} />
                <Linha label="Unidade" value={chamado.unidade ?? "—"} />
              </Secao>

              <Secao titulo="Departamentos">
                <Linha label="Recebimento" value={chamado.departamento_recebimento ?? "—"} />
                <Linha label="Envio" value={chamado.departamento_envio ?? "—"} />
              </Secao>

              <Secao titulo="Classificação">
                <Linha label="Assunto" value={chamado.assunto ?? "—"} />
                <Linha label="Categoria" value={chamado.categoria ?? "—"} />
                <Linha label="Subcategoria" value={chamado.subcategoria ?? "—"} />
                <Linha label="Qtd. interações" value={chamado.qtd_interacao} />
                <div className="flex flex-wrap gap-1 pt-1">
                  {(chamado.etiquetas ?? []).map((e) => (
                    <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>
                  ))}
                </div>
              </Secao>

              {chamado.satisfacao_nota != null && (
                <Secao titulo="Satisfação">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`size-4 ${i < Math.round(chamado.satisfacao_nota ?? 0) ? "fill-warning text-warning" : "text-muted-foreground/40"}`}
                      />
                    ))}
                    <span className="ml-2 text-sm font-medium">{chamado.satisfacao_nota.toFixed(1)}</span>
                  </div>
                </Secao>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
