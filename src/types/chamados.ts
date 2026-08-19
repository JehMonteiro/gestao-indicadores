export interface Chamado {
  id: string;
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
  categoria: string | null;
  subcategoria: string | null;
  qtd_interacao: number;
  etiquetas: string[];
  tma_horas: number | null;
  tmr_horas: number | null;
  no_prazo: boolean | null;
  importado_em: string;
  importado_por: string | null;
  lote_id: string;
}

export interface LoteChamados {
  lote_id: string;
  importado_em: string;
  importado_por_nome: string;
  total_registros: number;
  periodo_inicio: string | null;
  periodo_fim: string | null;
}

export interface FiltrosChamados {
  de?: string | null;
  ate?: string | null;
  situacao?: string[];
  responsavel?: string | null;
  departamento?: string | null;
  unidade?: string | null;
  solicitante?: string | null;
  etiqueta?: string | null;
  categoria?: string | null;
}

export const SITUACOES = [
  "Concluído",
  "Resolvido",
  "Em Andamento",
  "Novo",
  "Aguardando Responsável",
  "Aguardando Solicitante",
] as const;

export const SITUACOES_ABERTAS = [
  "Novo",
  "Em Andamento",
  "Aguardando Responsável",
  "Aguardando Solicitante",
];

export const CORES_SITUACAO: Record<string, string> = {
  "Concluído": "bg-green-100 text-green-800 border-green-200",
  "Resolvido": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Em Andamento": "bg-blue-100 text-blue-800 border-blue-200",
  "Novo": "bg-slate-100 text-slate-700 border-slate-200",
  "Aguardando Responsável": "bg-amber-100 text-amber-800 border-amber-200",
  "Aguardando Solicitante": "bg-orange-100 text-orange-800 border-orange-200",
};

export const CORES_SITUACAO_HEX: Record<string, string> = {
  "Concluído": "#22c55e",
  "Resolvido": "#16a34a",
  "Em Andamento": "#3b82f6",
  "Novo": "#64748b",
  "Aguardando Responsável": "#f59e0b",
  "Aguardando Solicitante": "#f97316",
};
