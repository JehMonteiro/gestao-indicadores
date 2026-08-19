import { useMemo, useState } from "react";
import { ArrowUpDown, Download, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChamadosDetalhesSheet } from "@/components/chamados/chamados-detalhes-sheet";
import { exportarChamadosXLSX, formatarData, formatarDataHora, formatarHoras, truncar } from "@/lib/chamados-utils";
import type { Chamado } from "@/types/chamados";
import { CORES_SITUACAO } from "@/types/chamados";

type SortKey = "aberto_em" | "situacao" | "solicitante" | "responsavel" | "departamento_recebimento" | "assunto" | "prazo_estipulado" | "tma_horas" | "satisfacao_nota";

const COLUNAS: { key: SortKey; label: string }[] = [
  { key: "aberto_em", label: "Aberto em" },
  { key: "situacao", label: "Situação" },
  { key: "solicitante", label: "Solicitante" },
  { key: "responsavel", label: "Responsável" },
  { key: "departamento_recebimento", label: "Departamento" },
  { key: "assunto", label: "Assunto" },
  { key: "prazo_estipulado", label: "Prazo" },
  { key: "tma_horas", label: "TMA" },
  { key: "satisfacao_nota", label: "Satisfação" },
];

export function ChamadosTabela({ chamados }: { chamados: Chamado[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "aberto_em", dir: "desc" });
  const [porPagina, setPorPagina] = useState(20);
  const [pagina, setPagina] = useState(1);
  const [detalhe, setDetalhe] = useState<Chamado | null>(null);

  const ordenados = useMemo(() => {
    const arr = [...chamados];
    arr.sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb), "pt-BR");
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [chamados, sort]);

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * porPagina;
  const visiveis = ordenados.slice(inicio, inicio + porPagina);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-muted-foreground">
          Exibindo {ordenados.length === 0 ? 0 : inicio + 1}–{Math.min(inicio + porPagina, ordenados.length)} de {ordenados.length} registros
        </p>
        <div className="flex items-center gap-2">
          <Select value={String(porPagina)} onValueChange={(v) => { setPorPagina(Number(v)); setPagina(1); }}>
            <SelectTrigger className="w-[110px]" aria-label="Itens por página"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[20, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n} / página</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            aria-label="Exportar chamados filtrados em xlsx"
            onClick={() => exportarChamadosXLSX(ordenados)}
          >
            <Download className="size-4 mr-1" /> Exportar Filtrados (.xlsx)
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUNAS.map((c) => (
                <TableHead key={c.key} scope="col">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    aria-label={`Ordenar por ${c.label}`}
                    onClick={() => toggleSort(c.key)}
                  >
                    {c.label}
                    <ArrowUpDown className="size-3 opacity-50" />
                  </button>
                </TableHead>
              ))}
              <TableHead scope="col">Etiquetas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => setDetalhe(c)}>
                <TableCell className="text-xs whitespace-nowrap">{formatarDataHora(c.aberto_em)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={CORES_SITUACAO[c.situacao]}>{c.situacao}</Badge>
                </TableCell>
                <TableCell className="text-sm">{c.solicitante ?? "—"}</TableCell>
                <TableCell className="text-sm">{c.responsavel ?? "—"}</TableCell>
                <TableCell className="text-sm" title={c.departamento_recebimento ?? ""}>{truncar(c.departamento_recebimento, 20)}</TableCell>
                <TableCell className="text-sm" title={c.assunto ?? ""}>{truncar(c.assunto, 30)}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {formatarData(c.prazo_estipulado)}
                  {c.no_prazo != null && (
                    <Badge
                      variant="outline"
                      className={`ml-1 ${c.no_prazo ? "bg-green-100 text-green-800 border-green-200" : "bg-destructive/10 text-destructive border-destructive/20"}`}
                    >
                      {c.no_prazo ? "No prazo" : "Atrasado"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs">{formatarHoras(c.tma_horas)}</TableCell>
                <TableCell>
                  {c.satisfacao_nota == null ? "—" : (
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Star className="size-3 fill-warning text-warning" />
                      {c.satisfacao_nota.toFixed(1)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(c.etiquetas ?? []).map((e) => (
                      <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {visiveis.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  Nenhum chamado para os filtros selecionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2 p-4">
        <Button variant="outline" size="sm" disabled={paginaAtual <= 1} onClick={() => setPagina(paginaAtual - 1)} aria-label="Página anterior">
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">{paginaAtual} / {totalPaginas}</span>
        <Button variant="outline" size="sm" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina(paginaAtual + 1)} aria-label="Próxima página">
          Próxima
        </Button>
      </div>

      <ChamadosDetalhesSheet chamado={detalhe} onClose={() => setDetalhe(null)} />
    </Card>
  );
}
