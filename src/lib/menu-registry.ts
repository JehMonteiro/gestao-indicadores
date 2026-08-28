import {
  LayoutDashboard, ListChecks, ClipboardEdit, ClipboardCheck, Building2,
  Store, Target, Flag, FlagTriangleRight, Network, FileBarChart, Users, History, Settings,
  Activity, Headphones, type LucideIcon,
} from "lucide-react";
import type { GlobalRole } from "@/mocks/types";

export type MenuKey =
  | "visao_geral" | "meu_painel" | "meus_indicadores" | "desempenho_franquias"
  | "lancamentos" | "lancamentos_franquia"
  | "indicadores" | "indicadores_franquia" | "metas" | "metas_franquia"
  | "setores" | "empresas_franquias" | "classificacao_escopo" | "usuarios"
  | "chamados"
  | "relatorios" | "auditoria" | "auditoria_dados" | "configuracoes";

export type MenuEntry = {
  key: MenuKey;
  label: string;
  to: string;
  group: string;
  icon: LucideIcon;
  /** Rotas filhas que devem manter este item como o item ativo. */
  matches?: string[];
  /** Marca o item como par "Franquia" do item anterior (divisória sutil acima). */
  pairTop?: boolean;
};

export const MENU_ENTRIES: MenuEntry[] = [
  { key: "visao_geral", label: "Visão geral", to: "/visao-geral", group: "Acompanhamento", icon: Activity },
  { key: "meu_painel", label: "Meu painel", to: "/meu-painel", group: "Acompanhamento", icon: LayoutDashboard },
  { key: "meus_indicadores", label: "Meus indicadores", to: "/meus-indicadores", group: "Acompanhamento", icon: ListChecks },
  { key: "desempenho_franquias", label: "Franquias", to: "/desempenho-franquias", group: "Acompanhamento", icon: Store },

  { key: "lancamentos", label: "Lançamentos", to: "/lancamentos", group: "Operação", icon: ClipboardEdit,
    matches: ["/lancamentos/novo", "/lancamentos/$id"] },
  { key: "lancamentos_franquia", label: "Lançamentos Franquia", to: "/lancamentos-franquia", group: "Operação", icon: ClipboardCheck,
    matches: ["/lancamentos-franquia/novo", "/lancamentos-franquia/$id"] },

  { key: "indicadores", label: "Indicadores", to: "/indicadores", group: "Estrutura", icon: Target,
    matches: ["/indicadores/novo", "/indicadores/$id", "/indicadores/$id/editar"] },
  { key: "indicadores_franquia", label: "Indicadores Franquia", to: "/indicadores-franquia", group: "Estrutura", icon: Target,
    matches: ["/franquias/$id/indicadores"] },
  { key: "metas", label: "Metas", to: "/metas", group: "Estrutura", icon: Flag },
  { key: "metas_franquia", label: "Metas Franquia", to: "/metas-franquia", group: "Estrutura", icon: FlagTriangleRight },
  { key: "setores", label: "Setores", to: "/setores", group: "Estrutura", icon: Building2,
    matches: ["/setores/$id"] },
  { key: "empresas_franquias", label: "Empresas / Franquias", to: "/franquias", group: "Estrutura", icon: Network,
    matches: ["/franquias/$id"] },
  { key: "classificacao_escopo", label: "Classificação de escopo", to: "/classificacao-escopo", group: "Estrutura", icon: Network },
  { key: "usuarios", label: "Usuários", to: "/usuarios", group: "Estrutura", icon: Users },

  { key: "chamados", label: "Chamados", to: "/chamados", group: "Atendimento", icon: Headphones },

  { key: "relatorios", label: "Relatórios", to: "/relatorios", group: "Sistema", icon: FileBarChart },
  { key: "auditoria", label: "Auditoria", to: "/auditoria", group: "Sistema", icon: History },
  { key: "auditoria_dados", label: "Auditoria de dados", to: "/auditoria-dados", group: "Sistema", icon: History },
  { key: "configuracoes", label: "Configurações", to: "/configuracoes", group: "Sistema", icon: Settings },
];

const ALL_KEYS: MenuKey[] = MENU_ENTRIES.map((e) => e.key);

function segments(path: string): string[] {
  return path.replace(/\/+$/, "").split("/").filter(Boolean);
}

/**
 * Resolve o item de menu correspondente a um pathname.
 * O padrão precisa ser prefixo do pathname (segmentos "$x" casam com qualquer
 * segmento). Vence o padrão com mais segmentos casados.
 */
export function resolveMenuKey(pathname: string): MenuKey | null {
  const parts = segments(pathname);
  let best: MenuKey | null = null;
  let bestScore = -1;

  for (const entry of MENU_ENTRIES) {
    const patterns = [entry.to, ...(entry.matches ?? [])];
    for (const pattern of patterns) {
      const pat = segments(pattern);
      if (pat.length === 0 || pat.length > parts.length) continue;
      let ok = true;
      for (let i = 0; i < pat.length; i++) {
        const p = pat[i]!;
        if (p.startsWith("$")) continue;
        if (p !== parts[i]) { ok = false; break; }
      }
      if (ok && pat.length > bestScore) {
        bestScore = pat.length;
        best = entry.key;
      }
    }
  }

  return best;
}

export const DEFAULT_ROLE_MENU: Record<GlobalRole, MenuKey[]> = {
  superadmin: ALL_KEYS,
  admin_corporativo: ALL_KEYS.filter((k) => k !== "auditoria_dados" && k !== "configuracoes"),
  gestor_setor: [
    "visao_geral", "meu_painel", "meus_indicadores", "desempenho_franquias",
    "lancamentos", "indicadores", "metas", "setores", "chamados", "relatorios",
  ],
  gestor_franquia: [
    "visao_geral", "meu_painel", "meus_indicadores", "desempenho_franquias",
    "lancamentos_franquia", "indicadores_franquia", "metas_franquia", "empresas_franquias",
    "chamados", "relatorios",
  ],
  analista: [
    "visao_geral", "meu_painel", "meus_indicadores", "desempenho_franquias",
    "lancamentos", "lancamentos_franquia", "indicadores", "indicadores_franquia",
    "metas", "metas_franquia", "chamados",
  ],
  colaborador: [
    "visao_geral", "meu_painel", "meus_indicadores", "desempenho_franquias",
    "lancamentos", "lancamentos_franquia", "indicadores", "indicadores_franquia",
    "metas", "metas_franquia", "chamados",
  ],
  auditor: [
    "visao_geral", "meu_painel", "meus_indicadores", "desempenho_franquias",
    "indicadores", "indicadores_franquia", "metas", "metas_franquia", "setores",
    "empresas_franquias", "relatorios", "auditoria",
  ],
  // Role legado — franquias são entidades medidas internamente, não usuários do sistema.
  franqueado: ["visao_geral", "meu_painel", "meus_indicadores"],
};
