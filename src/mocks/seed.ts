import { addDays, formatISO, startOfMonth, subMonths } from "date-fns";
import type {
  AuditLog,
  Franchise,
  Indicator,
  IndicatorCategory,
  IndicatorEntry,
  IndicatorTarget,
  Notification,
  Profile,
  Sector,
  SystemSettings,
  UserFranchise,
  UserSector,
} from "./types";

const today = new Date();
const iso = (d: Date) => formatISO(d, { representation: "date" });

// ===== Profiles =====
export const seedProfiles: Profile[] = [
  { id: "u-super", full_name: "Alice Diretora", email: "alice@empresa.com", global_role: "superadmin", user_type: "interno", status: "ativo", created_at: iso(today) },
  { id: "u-admin", full_name: "Bruno Corporativo", email: "bruno@empresa.com", global_role: "admin_corporativo", user_type: "interno", status: "ativo", created_at: iso(today) },
  { id: "u-gest-com", full_name: "Carla Comercial", email: "carla@empresa.com", global_role: "gestor_setor", user_type: "interno", status: "ativo", created_at: iso(today) },
  { id: "u-gest-mkt", full_name: "Diego Marketing", email: "diego@empresa.com", global_role: "gestor_setor", user_type: "interno", status: "ativo", created_at: iso(today) },
  { id: "u-colab", full_name: "Eduarda Colaboradora", email: "edu@empresa.com", global_role: "colaborador", user_type: "interno", status: "ativo", created_at: iso(today) },
  { id: "u-gest-fr", full_name: "Felipe Gestor de Franquia", email: "felipe@empresa.com", global_role: "gestor_franquia", user_type: "interno", status: "ativo", created_at: iso(today) },
  { id: "u-fr-camp", full_name: "Gabriela Campinas", email: "gabi@franquia.com", global_role: "franqueado", user_type: "franqueado", status: "ativo", created_at: iso(today) },
  { id: "u-fr-bh", full_name: "Henrique BH", email: "henrique@franquia.com", global_role: "franqueado", user_type: "franqueado", status: "ativo", created_at: iso(today) },
  { id: "u-aud", full_name: "Ivone Auditora", email: "ivone@empresa.com", global_role: "auditor", user_type: "interno", status: "ativo", created_at: iso(today) },
];

// ===== Sectors =====
export const seedSectors: Sector[] = [
  { id: "s-com", name: "Comercial", code: "COM", color: "#2563eb", icon: "Briefcase", active: true, display_order: 1, created_at: iso(today), description: "Vendas e relacionamento com prospects" },
  { id: "s-mkt", name: "Marketing", code: "MKT", color: "#db2777", icon: "Megaphone", active: true, display_order: 2, created_at: iso(today), description: "Aquisição e branding" },
  { id: "s-ops", name: "Operações", code: "OPS", color: "#0d9488", icon: "Settings", active: true, display_order: 3, created_at: iso(today) },
  { id: "s-fin", name: "Financeiro", code: "FIN", color: "#16a34a", icon: "DollarSign", active: true, display_order: 4, created_at: iso(today) },
  { id: "s-sup", name: "Suporte ao Franqueado", code: "SUP", color: "#f59e0b", icon: "LifeBuoy", active: true, display_order: 5, created_at: iso(today) },
];

// ===== User <-> Sector =====
export const seedUserSectors: UserSector[] = [
  { id: "us1", user_id: "u-gest-com", sector_id: "s-com", sector_role: "gestor", active: true, joined_at: iso(today) },
  { id: "us2", user_id: "u-gest-com", sector_id: "s-mkt", sector_role: "membro", active: true, joined_at: iso(today) },
  { id: "us3", user_id: "u-gest-mkt", sector_id: "s-mkt", sector_role: "gestor", active: true, joined_at: iso(today) },
  { id: "us4", user_id: "u-colab", sector_id: "s-com", sector_role: "membro", active: true, joined_at: iso(today) },
  { id: "us5", user_id: "u-colab", sector_id: "s-ops", sector_role: "membro", active: true, joined_at: iso(today) },
  { id: "us6", user_id: "u-aud", sector_id: "s-fin", sector_role: "visualizador", active: true, joined_at: iso(today) },
  { id: "us7", user_id: "u-gest-fr", sector_id: "s-sup", sector_role: "gestor", active: true, joined_at: iso(today) },
];

// ===== Franchises =====
export const seedFranchises: Franchise[] = [
  { id: "f-camp", name: "Unidade Campinas", code: "CAMP", legal_name: "Franquia Campinas Ltda", document: "12.345.678/0001-00", city: "Campinas", state: "SP", region: "Sudeste", status: "ativa", start_date: iso(subMonths(today, 14)), manager_id: "u-gest-fr", created_at: iso(today) },
  { id: "f-bh", name: "Unidade Belo Horizonte", code: "BH", legal_name: "Franquia BH Ltda", document: "23.456.789/0001-00", city: "Belo Horizonte", state: "MG", region: "Sudeste", status: "ativa", start_date: iso(subMonths(today, 8)), manager_id: "u-gest-fr", created_at: iso(today) },
  { id: "f-poa", name: "Unidade Porto Alegre", code: "POA", legal_name: "Franquia POA Ltda", city: "Porto Alegre", state: "RS", region: "Sul", status: "ativa", start_date: iso(subMonths(today, 3)), created_at: iso(today) },
];

export const seedUserFranchises: UserFranchise[] = [
  { id: "uf1", user_id: "u-gest-fr", franchise_id: "f-camp", franchise_role: "gestor", active: true, joined_at: iso(today) },
  { id: "uf2", user_id: "u-gest-fr", franchise_id: "f-bh", franchise_role: "gestor", active: true, joined_at: iso(today) },
  { id: "uf3", user_id: "u-fr-camp", franchise_id: "f-camp", franchise_role: "franqueado", active: true, joined_at: iso(today) },
  { id: "uf4", user_id: "u-fr-bh", franchise_id: "f-bh", franchise_role: "franqueado", active: true, joined_at: iso(today) },
];

// ===== Categories =====
export const seedCategories: IndicatorCategory[] = [
  { id: "c-vendas", name: "Vendas", sector_id: "s-com", active: true },
  { id: "c-clientes", name: "Clientes", sector_id: "s-com", active: true },
  { id: "c-mkt", name: "Aquisição", sector_id: "s-mkt", active: true },
  { id: "c-ops", name: "Eficiência operacional", sector_id: "s-ops", active: true },
  { id: "c-fin", name: "Resultado", sector_id: "s-fin", active: true },
];

// ===== Indicators =====
export const seedIndicators: Indicator[] = [
  {
    id: "i-fat", name: "Faturamento mensal", code: "FAT-MES", description: "Soma de receitas no mês",
    objective: "Acompanhar resultado financeiro mensal", owner_sector_id: "s-fin", shared_sector_ids: ["s-com"],
    category_id: "c-fin", strategic_pillar: "Resultado", audience: "ambos", scope: "franquia",
    responsible_ids: ["u-fr-camp", "u-fr-bh"], value_type: "moeda", unit: "R$",
    frequency: "mensal", direction: "maior_melhor", input_method: "manual",
    default_target: 100000, weight: 3, allows_attachment: true,
    start_date: iso(subMonths(today, 6)), status: "ativo", created_by: "u-admin", created_at: iso(today),
  },
  {
    id: "i-novos", name: "Novos clientes", code: "NOV-CLI", owner_sector_id: "s-com", shared_sector_ids: [],
    category_id: "c-clientes", audience: "ambos", scope: "franquia", responsible_ids: ["u-fr-camp", "u-fr-bh"],
    value_type: "inteiro", frequency: "mensal", direction: "maior_melhor", input_method: "manual",
    default_target: 40, weight: 2, allows_attachment: false,
    start_date: iso(subMonths(today, 6)), status: "ativo", created_by: "u-gest-com", created_at: iso(today),
  },
  {
    id: "i-conv", name: "Taxa de conversão", code: "CONV", owner_sector_id: "s-com", shared_sector_ids: ["s-mkt"],
    audience: "interno", scope: "setor", responsible_ids: ["u-colab"], value_type: "percentual", unit: "%",
    frequency: "mensal", direction: "maior_melhor", input_method: "manual",
    default_target: 25, weight: 2, allows_attachment: false,
    start_date: iso(subMonths(today, 6)), status: "ativo", created_by: "u-gest-com", created_at: iso(today),
  },
  {
    id: "i-ticket", name: "Ticket médio", code: "TICKET", owner_sector_id: "s-com", shared_sector_ids: [],
    audience: "ambos", scope: "franquia", responsible_ids: ["u-fr-camp", "u-fr-bh"], value_type: "moeda", unit: "R$",
    frequency: "mensal", direction: "maior_melhor", input_method: "calculo",
    default_target: 850, weight: 1, allows_attachment: false,
    start_date: iso(subMonths(today, 6)), status: "ativo", created_by: "u-gest-com", created_at: iso(today),
  },
  {
    id: "i-nps", name: "Índice de satisfação (NPS)", code: "NPS", owner_sector_id: "s-sup", shared_sector_ids: [],
    audience: "ambos", scope: "franquia", responsible_ids: ["u-gest-fr"], value_type: "nota", unit: "pts",
    frequency: "mensal", direction: "maior_melhor", input_method: "integracao",
    default_target: 75, weight: 2, allows_attachment: true,
    start_date: iso(subMonths(today, 6)), status: "ativo", created_by: "u-admin", created_at: iso(today),
  },
  {
    id: "i-tma", name: "Tempo médio de atendimento", code: "TMA", owner_sector_id: "s-ops", shared_sector_ids: [],
    audience: "interno", scope: "setor", responsible_ids: ["u-colab"], value_type: "tempo", unit: "min",
    frequency: "semanal", direction: "menor_melhor", input_method: "integracao",
    default_target: 12, weight: 1, allows_attachment: false,
    start_date: iso(subMonths(today, 6)), status: "ativo", created_by: "u-admin", created_at: iso(today),
  },
  {
    id: "i-leads", name: "Leads gerados", code: "LEADS", owner_sector_id: "s-mkt", shared_sector_ids: ["s-com"],
    audience: "interno", scope: "setor", responsible_ids: ["u-gest-mkt"], value_type: "inteiro",
    frequency: "mensal", direction: "maior_melhor", input_method: "manual",
    default_target: 1200, weight: 2, allows_attachment: false,
    start_date: iso(subMonths(today, 6)), status: "ativo", created_by: "u-gest-mkt", created_at: iso(today),
  },
  {
    id: "i-renov", name: "Taxa de renovação", code: "RENOV", owner_sector_id: "s-com", shared_sector_ids: [],
    audience: "ambos", scope: "franquia", responsible_ids: ["u-fr-camp", "u-fr-bh"], value_type: "percentual", unit: "%",
    frequency: "trimestral", direction: "maior_melhor", input_method: "manual",
    default_target: 85, weight: 2, allows_attachment: false,
    start_date: iso(subMonths(today, 6)), status: "ativo", created_by: "u-gest-com", created_at: iso(today),
  },
  {
    id: "i-pdv", name: "Produtos por cliente", code: "PDV", owner_sector_id: "s-com", shared_sector_ids: [],
    audience: "franqueado", scope: "franquia", responsible_ids: ["u-fr-camp"], value_type: "decimal",
    frequency: "mensal", direction: "faixa_ideal", input_method: "manual", minimum_value: 3, maximum_value: 5, default_target: 4,
    weight: 1, allows_attachment: false,
    start_date: iso(subMonths(today, 6)), status: "ativo", created_by: "u-gest-com", created_at: iso(today),
  },
  {
    id: "i-pend", name: "Pendências operacionais", code: "PEND-OPS", owner_sector_id: "s-ops", shared_sector_ids: [],
    audience: "interno", scope: "setor", responsible_ids: ["u-colab"], value_type: "inteiro",
    frequency: "semanal", direction: "menor_melhor", input_method: "manual",
    default_target: 5, weight: 1, allows_attachment: false,
    start_date: iso(subMonths(today, 6)), status: "ativo", created_by: "u-admin", created_at: iso(today),
  },
];

// ===== Targets =====
export const seedTargets: IndicatorTarget[] = (() => {
  const out: IndicatorTarget[] = [];
  // Per-franchise targets for indicators with franchise scope
  const months = 6;
  for (let m = months - 1; m >= 0; m--) {
    const start = startOfMonth(subMonths(today, m));
    const end = addDays(startOfMonth(subMonths(today, m - 1)), -1);
    for (const ind of seedIndicators) {
      if (ind.scope === "franquia") {
        for (const fid of ["f-camp", "f-bh", "f-poa"]) {
          out.push({
            id: `t-${ind.id}-${fid}-${m}`,
            indicator_id: ind.id,
            scope_type: "franquia",
            franchise_id: fid,
            period_start: iso(start),
            period_end: iso(end),
            target_value: ind.default_target ?? 100,
            minimum_value: ind.minimum_value,
            maximum_value: ind.maximum_value,
            weight: ind.weight,
            created_by: "u-admin",
            created_at: iso(today),
          });
        }
      } else if (ind.scope === "setor") {
        out.push({
          id: `t-${ind.id}-${ind.owner_sector_id}-${m}`,
          indicator_id: ind.id,
          scope_type: "setor",
          sector_id: ind.owner_sector_id,
          period_start: iso(start),
          period_end: iso(end),
          target_value: ind.default_target ?? 100,
          weight: ind.weight,
          created_by: "u-admin",
          created_at: iso(today),
        });
      }
    }
  }
  return out;
})();

// ===== Entries =====
export const seedEntries: IndicatorEntry[] = (() => {
  const out: IndicatorEntry[] = [];
  const statuses: IndicatorEntry["status"][] = ["registrado", "registrado", "registrado", "registrado", "rascunho", "rascunho"];
  let seed = 1;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (const t of seedTargets) {
    const ind = seedIndicators.find((i) => i.id === t.indicator_id)!;
    const noise = 0.6 + rand() * 0.7; // 60% - 130%
    const actual = ind.direction === "menor_melhor"
      ? t.target_value / Math.max(noise, 0.4)
      : t.target_value * noise;
    const status = statuses[Math.floor(rand() * statuses.length)];
    out.push({
      id: `e-${t.id}`,
      indicator_id: t.indicator_id,
      target_id: t.id,
      user_id: t.franchise_id ? (t.franchise_id === "f-camp" ? "u-fr-camp" : "u-fr-bh") : "u-colab",
      sector_id: ind.owner_sector_id,
      franchise_id: t.franchise_id,
      period_start: t.period_start,
      period_end: t.period_end,
      actual_value: Math.round(actual),
      comment: undefined,
      status,
      submitted_at: status !== "rascunho" ? t.period_end : undefined,
      revision_number: 1,
      created_at: t.period_end,
      updated_at: t.period_end,
    });
  }
  return out;
})();

export const seedNotifications: Notification[] = [
  { id: "n1", user_id: "u-gest-com", title: "Lançamento pendente", message: "Faturamento mensal ainda não foi registrado", type: "warning", link: "/lancamentos", created_at: iso(today) },
  { id: "n2", user_id: "u-fr-camp", title: "Meta próxima do vencimento", message: "Você ainda não lançou Novos clientes deste mês", type: "info", link: "/lancamentos", created_at: iso(today) },
];

export const seedAuditLogs: AuditLog[] = [
  { id: "a1", user_id: "u-admin", action: "create", entity_type: "indicator", entity_id: "i-fat", created_at: iso(today) },
];

export const seedSettings: SystemSettings = {
  platform_name: "Gestão de Indicadores",
  achieved_threshold: 100,
  warning_threshold: 80,
};
