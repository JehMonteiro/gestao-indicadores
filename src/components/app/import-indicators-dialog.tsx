import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { newId } from "@/lib/ids";
import { useStore, useCurrentUser } from "@/mocks/store";
import type {
  Audience, Direction, Frequency, Indicator, IndicatorStatus, InputMethod, ValueType,
} from "@/mocks/types";

const TEMPLATE_HEADERS = [
  "name", "objective", "owner_sector", "franchise", "audience",
  "responsible", "status", "value_type", "unit", "frequency",
  "direction", "input_method", "default_target", "warning_threshold",
  "critical_threshold", "start_date", "end_date",
  "requires_approval", "allows_attachment", "instructions", "data_source",
];

const TEMPLATE_EXAMPLE = [
  "Faturamento mensal", "Atingir meta de receita", "Comercial", "", "ambos",
  "", "ativo", "moeda", "R$", "mensal",
  "maior_melhor", "manual", 100000, 80,
  60, "2026-01-01", "",
  "sim", "nao", "Lançar até o dia 5", "ERP",
];

export function ImportIndicatorsDialog() {
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sectors = useStore((s) => s.sectors);
  const franchises = useStore((s) => s.franchises);
  const profiles = useStore((s) => s.profiles);
  const upsert = useStore((s) => s.upsertIndicator);
  const logAudit = useStore((s) => s.logAudit);
  const user = useCurrentUser();

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_EXAMPLE]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Indicadores");
    XLSX.writeFile(wb, "modelo-indicadores.xlsx");
  };

  const norm = (v: unknown) => {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v ?? "").trim();
  };
  const stripAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const lower = (v: unknown) => stripAccents(norm(v).toLowerCase());
  const toBool = (v: unknown) => {
    const s = lower(v);
    return s === "sim" || s === "true" || s === "1" || s === "yes" || s === "y";
  };
  const toNum = (v: unknown, def = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  };
  const toDate = (v: unknown): string | undefined => {
    if (!v) return undefined;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const s = String(v).trim();
    if (!s) return undefined;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return s;
  };
  const mapAudience = (v: unknown): Audience => {
    const s = lower(v);
    if (!s) return "ambos";
    if (s.includes("franq")) return "franqueado";
    if (s.includes("intern") || s.includes("colab")) return "interno";
    if (s === "interno" || s === "externo") return s === "interno" ? "interno" : "ambos";
    if (["interno", "franqueado", "ambos"].includes(s)) return s as Audience;
    return "ambos";
  };
  const mapInputMethod = (v: unknown): InputMethod => {
    const s = lower(v);
    if (s.startsWith("import")) return "importacao";
    if (s.startsWith("integ")) return "integracao";
    if (s.startsWith("calc")) return "calculo";
    return "manual";
  };

  const findSectorId = (v: string) => {
    const s = v.toLowerCase();
    return sectors.find((x) => x.name.toLowerCase() === s || x.code.toLowerCase() === s)?.id;
  };
  const findFranchiseId = (v: string) => {
    if (!v) return undefined;
    const s = v.toLowerCase();
    return franchises.find((x) => x.name.toLowerCase() === s || x.code.toLowerCase() === s)?.id;
  };
  const findProfileId = (v: string) => {
    if (!v) return undefined;
    const s = v.toLowerCase();
    return profiles.find((x) => x.full_name.toLowerCase() === s || x.email.toLowerCase() === s)?.id;
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });

      // skip fully-empty rows
      const dataRows = rows.filter((r) => Object.values(r).some((v) => norm(v) !== ""));

      if (dataRows.length === 0) {
        toast.error("Planilha vazia");
        return;
      }

      let ok = 0;
      const errors: string[] = [];

      for (const [i, row] of dataRows.entries()) {
        const line = i + 2;
        const name = norm(row.name);
        const ownerName = norm(row.owner_sector);
        if (!name) {
          errors.push(`Linha ${line}: nome vazio`);
          continue;
        }
        if (!ownerName) {
          errors.push(`Linha ${line}: setor obrigatório`);
          continue;
        }
        const owner_sector_id = findSectorId(ownerName);
        if (!owner_sector_id) {
          errors.push(`Linha ${line}: setor "${ownerName}" não encontrado`);
          continue;
        }

        const autoCode = name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24)
          || `IND_${Date.now().toString(36).toUpperCase()}`;

        const responsibleId = findProfileId(norm(row.responsible));
        const valueType = lower(row.value_type);
        const validValueTypes = ["inteiro", "decimal", "moeda", "percentual", "duracao", "data", "booleano"];
        const frequency = lower(row.frequency);
        const validFrequencies = ["diaria", "semanal", "quinzenal", "mensal", "bimestral", "trimestral", "semestral", "anual"];
        const direction = lower(row.direction);
        const validDirections = ["maior_melhor", "menor_melhor", "faixa_ideal", "meta_exata"];
        const status = lower(row.status);
        const validStatuses = ["rascunho", "ativo", "pausado", "arquivado"];

        const ind: Indicator = {
          id: newId(),
          name,
          code: autoCode,
          objective: norm(row.objective) || undefined,
          owner_sector_id,
          shared_sector_ids: [],
          franchise_id: findFranchiseId(norm(row.franchise)),
          audience: mapAudience(row.audience),
          scope: "setor",
          responsible_ids: responsibleId ? [responsibleId] : [],
          value_type: (validValueTypes.includes(valueType) ? valueType : "inteiro") as ValueType,
          unit: norm(row.unit) || undefined,
          frequency: (validFrequencies.includes(frequency) ? frequency : "mensal") as Frequency,
          direction: (validDirections.includes(direction) ? direction : "maior_melhor") as Direction,
          data_source: norm(row.data_source) || undefined,
          input_method: mapInputMethod(row.input_method),
          default_target: toNum(row.default_target, 0),
          warning_threshold: toNum(row.warning_threshold, 80),
          critical_threshold: toNum(row.critical_threshold, 60),
          weight: 1,
          requires_approval: toBool(row.requires_approval),
          allows_attachment: toBool(row.allows_attachment),
          instructions: norm(row.instructions) || undefined,
          start_date: toDate(row.start_date) || new Date().toISOString().slice(0, 10),
          end_date: toDate(row.end_date),
          status: (validStatuses.includes(status) ? status : "ativo") as IndicatorStatus,
          created_by: user?.id ?? "u-admin",
          created_at: new Date().toISOString(),
        };

        try {
          upsert(ind);
          logAudit({ user_id: user?.id ?? "", action: "create", entity_type: "indicator", entity_id: ind.id });
          ok++;
        } catch (e) {
          errors.push(`Linha ${line}: falha ao salvar`);
        }
      }

      if (ok > 0) toast.success(`${ok} indicador(es) importado(s)`);
      if (errors.length > 0) {
        toast.error(`${errors.length} erro(s)`, { description: errors.slice(0, 5).join(" • ") });
      }
      if (ok > 0) setOpen(false);
    } catch (e) {
      toast.error("Falha ao processar planilha", { description: (e as Error).message });
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="size-4" />Importar Excel</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar indicadores via Excel</DialogTitle>
          <DialogDescription>
            Baixe o modelo, preencha as linhas e envie o arquivo .xlsx. Setor é obrigatório e deve corresponder ao nome ou código já cadastrado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button type="button" variant="secondary" onClick={downloadTemplate} className="w-full">
            <Download className="size-4" />Baixar modelo (.xlsx)
          </Button>

          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-md p-6 cursor-pointer hover:bg-muted/50">
            <FileSpreadsheet className="size-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {parsing ? "Processando..." : "Clique para selecionar arquivo .xlsx"}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={parsing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>

          <p className="text-xs text-muted-foreground">
            Campos aceitos: name, objective, owner_sector, franchise, audience, responsible, status, value_type, unit, frequency, direction, input_method, default_target, warning_threshold, critical_threshold, start_date, end_date, requires_approval, allows_attachment, instructions, data_source.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
