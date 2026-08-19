import * as XLSX from "xlsx";
import type { Chamado } from "@/types/chamados";

/** Formata horas para exibição amigável (ex.: "45min", "3.2h", "2d 5h"). */
export function formatarHoras(horas: number | null | undefined): string {
  if (horas == null || !Number.isFinite(horas)) return "—";
  if (horas < 1) return `${Math.round(horas * 60)}min`;
  if (horas < 24) return `${horas.toFixed(1)}h`;
  const dias = Math.floor(horas / 24);
  const h = Math.round(horas % 24);
  return h > 0 ? `${dias}d ${h}h` : `${dias}d`;
}

export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatarPercentual(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(1)}%`;
}

export function extrairCategoria(assunto: string | null | undefined): string {
  if (!assunto) return "Sem categoria";
  return (assunto.split(">")[0] ?? "").trim() || "Sem categoria";
}

/** Rótulo de mês curto usado nos gráficos ("Jan/26"). */
export function rotuloMes(iso: string): string {
  const d = new Date(iso);
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${meses[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}

export function truncar(texto: string | null | undefined, max: number): string {
  if (!texto) return "—";
  return texto.length > max ? `${texto.slice(0, max)}…` : texto;
}

export function exportarChamadosXLSX(chamados: Chamado[], nomeArquivo = "chamados-filtrados") {
  const dados = chamados.map((c) => ({
    "Situação": c.situacao,
    "Aberto em": formatarDataHora(c.aberto_em),
    "Respondido em": formatarDataHora(c.respondido_em),
    "Resolvido em": formatarDataHora(c.resolvido_em),
    "Concluído em": formatarDataHora(c.concluido_em),
    "Prazo Planejado": formatarDataHora(c.prazo_planejado),
    "Prazo Estipulado": formatarDataHora(c.prazo_estipulado),
    "No Prazo": c.no_prazo == null ? "—" : c.no_prazo ? "Sim" : "Não",
    "TMA (horas)": c.tma_horas?.toFixed(1) ?? "—",
    "TMR (horas)": c.tmr_horas?.toFixed(1) ?? "—",
    "Satisfação": c.satisfacao_nota?.toString() ?? "—",
    "Unidade": c.unidade ?? "",
    "Solicitante": c.solicitante ?? "",
    "Responsável": c.responsavel ?? "",
    "Dept. Recebimento": c.departamento_recebimento ?? "",
    "Dept. Envio": c.departamento_envio ?? "",
    "Assunto": c.assunto ?? "",
    "Categoria": c.categoria ?? "",
    "Subcategoria": c.subcategoria ?? "",
    "Qtd. Interações": c.qtd_interacao ?? 0,
    "Etiquetas": c.etiquetas?.join(", ") ?? "",
  }));
  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Chamados");
  XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
}

/** Converte "dd/mm/yyyy HH:MM:SS" (horário de Brasília) em ISO 8601. */
export function parseDataBR(valor: unknown): string | null {
  if (valor == null || valor === "") return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor.toISOString();
  const s = String(valor).trim();
  if (!s) return null;
  const match = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (match) {
    const [, d, m, y, h = "00", min = "00", sec = "00"] = match;
    const dt = new Date(`${y}-${m}-${d}T${h}:${min}:${sec}-03:00`);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

export function parseEtiquetas(valor: unknown): string[] {
  if (!valor) return [];
  return String(valor).split(",").map((e) => e.trim()).filter(Boolean);
}
