import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { parseDataBR, parseEtiquetas, formatarDataHora, truncar } from "@/lib/chamados-utils";

const COLUNAS_UTILIZADAS =
  "SITUAÇÃO, ABERTO, RESPONDIDO, RESOLVIDO, CONCLUÍDO, PRAZO PLANEJADO, PRAZO ESTIPULADO, SATISFAÇÃO NOTA, UNIDADE, SOLICITANTE, RESPONSAVEL, DEPARTAMENTO RECEBIMENTO, DEPARTAMENTO ENVIO, ASSUNTO, QTD INTERACAO, ETIQUETAS";

type Registro = {
  situacao: string;
  aberto_em: string | null;
  respondido_em: string | null;
  resolvido_em: string | null;
  concluido_em: string | null;
  prazo_planejado: string | null;
  prazo_estipulado: string | null;
  satisfacao_nota: number | null;
  unidade: string | null;
  solicitante: string | null;
  responsavel: string | null;
  departamento_recebimento: string | null;
  departamento_envio: string | null;
  assunto: string | null;
  qtd_interacao: number;
  etiquetas: string[];
};

type LinhaParseada = { registro: Registro; erros: string[] };

const txt = (v: unknown) => String(v ?? "").trim() || null;

function parsearLinha(row: Record<string, unknown>, index: number): LinhaParseada {
  const erros: string[] = [];
  const linha = index + 2;
  const situacao = String(row["SITUAÇÃO"] ?? row["SITUACAO"] ?? "").trim();
  if (!situacao) erros.push(`Linha ${linha}: SITUAÇÃO obrigatória`);
  const aberto_em = parseDataBR(row["ABERTO"]);
  if (!aberto_em) erros.push(`Linha ${linha}: data ABERTO inválida`);
  const nota = row["SATISFAÇÃO NOTA"] ?? row["SATISFACAO NOTA"];
  const qtd = Number(row["QTD INTERACAO"]);

  return {
    registro: {
      situacao,
      aberto_em,
      respondido_em: parseDataBR(row["RESPONDIDO"]),
      resolvido_em: parseDataBR(row["RESOLVIDO"]),
      concluido_em: parseDataBR(row["CONCLUÍDO"] ?? row["CONCLUIDO"]),
      prazo_planejado: parseDataBR(row["PRAZO PLANEJADO"]),
      prazo_estipulado: parseDataBR(row["PRAZO ESTIPULADO"]),
      satisfacao_nota: nota != null && nota !== "" && Number.isFinite(Number(nota)) ? Number(nota) : null,
      unidade: txt(row["UNIDADE"]),
      solicitante: txt(row["SOLICITANTE"]),
      responsavel: txt(row["RESPONSAVEL"] ?? row["RESPONSÁVEL"]),
      departamento_recebimento: txt(row["DEPARTAMENTO RECEBIMENTO"]),
      departamento_envio: txt(row["DEPARTAMENTO ENVIO"]),
      assunto: txt(row["ASSUNTO"]),
      qtd_interacao: Number.isFinite(qtd) ? qtd : 0,
      etiquetas: parseEtiquetas(row["ETIQUETAS"]),
    },
    erros,
  };
}

export function ChamadosImportDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [linhas, setLinhas] = useState<LinhaParseada[] | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState<{ ok: number; ignorados: number; erros: string[] } | null>(null);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setLinhas(null);
    setNomeArquivo("");
    setResultado(null);
    setProgresso(0);
    setImportando(false);
  };

  const lerArquivo = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("Planilha vazia");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]!, { defval: null, raw: false });
      if (!rows.length) throw new Error("Nenhuma linha encontrada");
      setNomeArquivo(file.name);
      setLinhas(rows.map((r, i) => parsearLinha(r, i)));
      setResultado(null);
    } catch (e) {
      toast.error("Não foi possível ler o arquivo", { description: (e as Error).message });
    }
  };

  const validas = (linhas ?? []).filter((l) => l.erros.length === 0);
  const invalidas = (linhas ?? []).filter((l) => l.erros.length > 0);

  const confirmar = async () => {
    if (!validas.length) return;
    setImportando(true);
    setProgresso(0);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Sessão expirada. Faça login novamente.");
      const loteId = `lote_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const registros = validas.map((l) => ({ ...l.registro, lote_id: loteId, importado_por: userId }));

      let feitos = 0;
      for (let i = 0; i < registros.length; i += 100) {
        const chunk = registros.slice(i, i + 100);
        const { error } = await supabase.from("chamados").insert(chunk);
        if (error) throw error;
        feitos += chunk.length;
        setProgresso(Math.round((feitos / registros.length) * 100));
      }
      setResultado({
        ok: registros.length,
        ignorados: invalidas.length,
        erros: invalidas.flatMap((l) => l.erros),
      });
      await qc.invalidateQueries({ queryKey: ["chamados"] });
      toast.success(`${registros.length} chamados importados`);
    } catch (e) {
      toast.error("Falha na importação", { description: (e as Error).message });
    } finally {
      setImportando(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="w-full max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar Chamados</DialogTitle>
          <DialogDescription>Arquivo .xlsx exportado do sistema de help desk</DialogDescription>
        </DialogHeader>

        {resultado ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="size-10 mx-auto text-success" />
            <p className="font-medium">{resultado.ok} registros importados com sucesso</p>
            {resultado.ignorados > 0 && (
              <div className="text-sm text-muted-foreground">
                <p>{resultado.ignorados} linhas ignoradas</p>
                <details className="mt-2 text-left max-h-40 overflow-auto rounded-md bg-muted p-3">
                  <summary className="cursor-pointer">Ver erros</summary>
                  <ul className="mt-2 space-y-1 text-xs">
                    {resultado.erros.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              </div>
            )}
          </div>
        ) : importando ? (
          <div className="py-8 space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Importando… {progresso}% de {validas.length} registros
            </p>
            <Progress value={progresso} />
          </div>
        ) : linhas ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{linhas.length} registros encontrados</Badge>
              {invalidas.length > 0 && (
                <Badge className="bg-warning/15 text-warning border-warning/30">{invalidas.length} erros</Badge>
              )}
              <span className="text-xs text-muted-foreground">{nomeArquivo}</span>
            </div>
            <div className="max-h-72 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Situação</TableHead>
                    <TableHead scope="col">Aberto</TableHead>
                    <TableHead scope="col">Responsável</TableHead>
                    <TableHead scope="col">Departamento</TableHead>
                    <TableHead scope="col">Assunto</TableHead>
                    <TableHead scope="col">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.slice(0, 10).map((l, i) => (
                    <TableRow key={i} className={l.erros.length ? "bg-destructive/10" : undefined}>
                      <TableCell className="text-xs">{l.registro.situacao || "—"}</TableCell>
                      <TableCell className="text-xs">{formatarDataHora(l.registro.aberto_em)}</TableCell>
                      <TableCell className="text-xs">{l.registro.responsavel ?? "—"}</TableCell>
                      <TableCell className="text-xs">{truncar(l.registro.departamento_recebimento, 20)}</TableCell>
                      <TableCell className="text-xs">{truncar(l.registro.assunto, 30)}</TableCell>
                      <TableCell className="text-xs">
                        {l.erros.length ? <span className="text-destructive">{l.erros[0]}</span> : "OK"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              aria-label="Selecionar arquivo .xlsx"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void lerArquivo(f);
              }}
              className={`w-full rounded-lg border-2 border-dashed p-10 text-center transition-colors ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-muted/40"}`}
            >
              <FileSpreadsheet className="size-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Arraste o arquivo .xlsx aqui</p>
              <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
            </button>
            <p className="text-xs text-muted-foreground">Colunas utilizadas: {COLUNAS_UTILIZADAS}</p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void lerArquivo(f);
                e.target.value = "";
              }}
            />
          </div>
        )}

        <DialogFooter>
          {resultado ? (
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          ) : linhas && !importando ? (
            <>
              <Button variant="outline" onClick={reset}>Cancelar</Button>
              <Button onClick={() => void confirmar()} disabled={!validas.length}>
                <Upload className="size-4 mr-2" />
                Confirmar Importação ({validas.length} registros)
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
