import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { newId } from "@/lib/ids";
import { supabase } from "@/integrations/supabase/client";
import { loadAllFromSupabase } from "@/lib/supabase-data";
import { useStore, useCurrentUser } from "@/mocks/store";

const HEADERS = [
  "Nome Fantasia", "UF", "Municipio", "Inaugurada", "Grupos",
  "Data Criação Sistema", "Data Inativação", "Modelos de Franquia", "Tipo de Franquia",
] as const;

const EXAMPLE = [
  "FRANQUIA 1002 - EXEMPLO", "SP", "São Paulo", "05/07/2024", "Independente de suporte",
  "04/09/2025", "", "Home Based", "Franqueada",
];

type ParsedRow = {
  name: string;
  uf: string;
  city: string;
  inaugurated_at: string | null;
  support_group: string | null;
  created_in_system_at: string | null;
  deactivated_at: string | null;
  franchise_model: string | null;
  franchise_type: string | null;
};

const stripAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const txt = (v: unknown) => String(v ?? "").trim();
const nameKey = (v: string) => stripAccents(v).toLowerCase().replace(/\s+/g, " ").trim();

/** Converte DD/MM/YYYY, data nativa do Excel ou ISO para YYYY-MM-DD; inválido → null. */
function toISODate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = txt(v);
  if (!s) return null;
  const br = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (br) {
    const [, d, m, y] = br;
    const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    return isNaN(new Date(iso).getTime()) ? null : iso;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso && !isNaN(new Date(iso[0]).getTime())) return iso[0];
  return null;
}

const slug = (s: string) =>
  stripAccents(s).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24);

/** Lê apenas as colunas conhecidas; todas as demais são ignoradas silenciosamente. */
function pick(row: Record<string, unknown>, header: string): unknown {
  const want = nameKey(header).replace(/[^a-z0-9 ]/g, "");
  for (const k of Object.keys(row)) {
    if (nameKey(k).replace(/[^a-z0-9 ]/g, "") === want) return row[k];
  }
  return "";
}

export function ImportFranchisesDialog({ parentId }: { parentId?: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const franchises = useStore((s) => s.franchises);
  const user = useCurrentUser();

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([[...HEADERS], EXAMPLE]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Franquias");
    XLSX.writeFile(wb, "modelo-franquias.xlsx");
  };

  const reset = () => { setRows([]); setSkipped(0); setFileName(""); };

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      const parsed: ParsedRow[] = [];
      let skip = 0;
      for (const r of raw) {
        const name = txt(pick(r, "Nome Fantasia"));
        if (!name) { skip++; continue; }
        parsed.push({
          name,
          uf: txt(pick(r, "UF")).toUpperCase().slice(0, 2),
          city: txt(pick(r, "Municipio")),
          inaugurated_at: toISODate(pick(r, "Inaugurada")),
          support_group: txt(pick(r, "Grupos")) || null,
          created_in_system_at: toISODate(pick(r, "Data Criação Sistema")),
          deactivated_at: toISODate(pick(r, "Data Inativação")),
          franchise_model: txt(pick(r, "Modelos de Franquia")) || null,
          franchise_type: txt(pick(r, "Tipo de Franquia")) || null,
        });
      }
      setRows(parsed);
      setSkipped(skip);
      setFileName(file.name);
      if (parsed.length === 0) toast.error("Nenhuma linha válida encontrada na planilha.");
    } catch {
      toast.error("Não foi possível ler o arquivo.");
      reset();
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const byName = new Map(franchises.map((f) => [nameKey(f.name), f]));
      const usedCodes = new Set(franchises.map((f) => (f.code ?? "").toUpperCase()));
      let inserted = 0;
      let updated = 0;

      const payloads = rows.map((r) => {
        const existing = byName.get(nameKey(r.name));
        let code = existing?.code;
        if (!code) {
          const base = slug(r.name) || `FR_${Date.now().toString(36).toUpperCase()}`;
          code = base;
          let n = 2;
          while (usedCodes.has(code.toUpperCase())) code = `${base.slice(0, 20)}_${n++}`;
          usedCodes.add(code.toUpperCase());
        }
        if (existing) updated++; else inserted++;
        return {
          id: existing?.id ?? newId(),
          code,
          name: r.name,
          entity_type: (existing?.entity_type ?? "franquia") as "franquia",
          parent_id: existing?.parent_id ?? parentId ?? null,
          city: r.city || existing?.city || null,
          state: r.uf || existing?.state || null,
          opened_at: r.inaugurated_at ?? existing?.start_date ?? null,
          support_group: r.support_group,
          created_in_system_at: r.created_in_system_at,
          deactivated_at: r.deactivated_at,
          franchise_model: r.franchise_model,
          franchise_type: r.franchise_type,
          status: r.deactivated_at ? "inativo" : "ativo",
        };
      });

      const BATCH = 200;
      for (let i = 0; i < payloads.length; i += BATCH) {
        const { error } = await supabase.from("franchises").upsert(payloads.slice(i, i + BATCH));
        if (error) throw error;
      }

      if (user?.id) {
        // fetchAll — contorna limite 1000 do PostgREST
        const data = await loadAllFromSupabase(user.id);
        useStore.getState().hydrate(data);
      }

      toast.success(`${inserted} inserida(s), ${updated} atualizada(s)${skipped ? `, ${skipped} com erro` : ""}`);
      if (!skipped) { setOpen(false); reset(); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar franquias.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="size-4" />Importar Excel</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar franquias</DialogTitle>
          <DialogDescription>
            Baixe o modelo, preencha as linhas e envie o arquivo .xlsx. Apenas as colunas do modelo são lidas;
            as demais são ignoradas. Franquias com o mesmo Nome Fantasia são atualizadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button variant="outline" onClick={downloadTemplate} className="w-fit">
            <Download className="size-4" />Baixar modelo (.xlsx)
          </Button>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) void handleFile(f);
            }}
            className="border border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50"
          >
            <FileSpreadsheet className="size-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm">{fileName || "Arraste o arquivo .xlsx aqui ou clique para selecionar"}</p>
            <input
              ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
            />
          </div>

          {rows.length > 0 && (
            <Card className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>{HEADERS.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {/* Limite intencional: pré-visualização exibe apenas as primeiras linhas */}
                  {rows.slice(0, 5).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.uf || "—"}</TableCell>
                      <TableCell>{r.city || "—"}</TableCell>
                      <TableCell>{r.inaugurated_at ?? "—"}</TableCell>
                      <TableCell>{r.support_group ?? "—"}</TableCell>
                      <TableCell>{r.created_in_system_at ?? "—"}</TableCell>
                      <TableCell>{r.deactivated_at ?? "—"}</TableCell>
                      <TableCell>{r.franchise_model ?? "—"}</TableCell>
                      <TableCell>{r.franchise_type ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {(rows.length > 0 || skipped > 0) && (
            <p className="text-sm text-muted-foreground">
              {rows.length} linha(s) detectada(s){skipped ? ` · ${skipped} sem Nome Fantasia (serão ignoradas)` : ""}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={busy || rows.length === 0} onClick={() => void confirm()}>
            {busy ? "Importando..." : "Confirmar importação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
