// Tipos espelham o schema final do banco (seção 13 do briefing).
// Quando a Fase 2 ativar o Lovable Cloud, estes tipos viram a base
// dos tipos gerados via Supabase.

export type GlobalRole =
  | "superadmin"
  | "admin_corporativo"
  | "gestor_setor"
  | "colaborador"
  | "gestor_franquia"
  | "franqueado"
  | "auditor";

export type UserType = "interno" | "franqueado";

export type SectorRole = "gestor" | "membro" | "visualizador";
export type FranchiseRole = "gestor" | "franqueado" | "colaborador" | "visualizador";

export type ValueType =
  | "inteiro"
  | "decimal"
  | "percentual"
  | "moeda"
  | "tempo"
  | "quantidade"
  | "boolean"
  | "nota"
  | "texto";

export type Frequency =
  | "diaria"
  | "semanal"
  | "quinzenal"
  | "mensal"
  | "trimestral"
  | "semestral"
  | "anual";

export type KpiGroup = "movimento" | "resultado" | "qualidade";

export type Direction = "maior_melhor" | "menor_melhor" | "faixa_ideal" | "meta_exata";
export type Scope = "corporativo" | "setor" | "franquia" | "usuario";
export type IndicatorStatus = "rascunho" | "ativo" | "pausado" | "arquivado";

export type EntryStatus = "rascunho" | "registrado" | "atrasado";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  global_role: GlobalRole;
  user_type: UserType;
  phone?: string;
  status: "ativo" | "inativo";
  created_at: string;
}

export interface Sector {
  id: string;
  name: string;
  code: string;
  description?: string;
  color: string; // tailwind-friendly token name or hex
  icon: string; // lucide icon name
  active: boolean;
  display_order: number;
  created_at: string;
}

export interface UserSector {
  id: string;
  user_id: string;
  sector_id: string;
  sector_role: SectorRole;
  active: boolean;
  joined_at: string;
}

export type EntityType = "grupo" | "empresa" | "franquia";
export type EntityScope = "empresa" | "franquia";

export interface Franchise {
  id: string;
  name: string;
  code: string;
  entity_type?: EntityType | null;
  parent_id?: string | null;
  legal_name?: string;
  trade_name?: string;
  document?: string; // CNPJ
  city: string;
  state: string;
  region: string;
  status: "ativa" | "inativa";
  start_date: string;
  manager_id?: string;
  notes?: string;
  created_at: string;
}

export interface UserFranchise {
  id: string;
  user_id: string;
  franchise_id: string;
  franchise_role: FranchiseRole;
  active: boolean;
  joined_at: string;
}

export interface IndicatorCategory {
  id: string;
  name: string;
  description?: string;
  sector_id?: string;
  active: boolean;
}

export interface Indicator {
  id: string;
  name: string;
  code: string;
  description?: string;
  objective?: string;
  owner_sector_id: string;
  shared_sector_ids: string[];
  franchise_id?: string;
  category_id?: string;
  strategic_pillar?: string;
  kpi_group: KpiGroup;
  scope: Scope;
  responsible_ids: string[];
  value_type: ValueType;
  frequency: Frequency;
  direction: Direction;
  default_target?: number;
  minimum_value?: number;
  maximum_value?: number;
  warning_threshold?: number; // percentual classificatório
  critical_threshold?: number;
  weight: number;
  instructions?: string;
  start_date: string;
  end_date?: string;
  status: IndicatorStatus;
  created_by: string;
  created_at: string;
}

export interface IndicatorTarget {
  id: string;
  indicator_id: string;
  scope_type: Scope;
  user_id?: string;
  sector_id?: string;
  franchise_id?: string;
  period_start: string;
  period_end: string;
  target_value: number;
  minimum_value?: number;
  maximum_value?: number;
  weight: number;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface IndicatorEntry {
  id: string;
  indicator_id: string;
  target_id?: string;
  user_id: string;
  sector_id?: string;
  franchise_id?: string;
  period_start: string;
  period_end: string;
  actual_value?: number;
  qualitative_value?: string;
  comment?: string;
  justification?: string;
  status: EntryStatus;
  submitted_at?: string;
  revision_number: number;
  previous_entry_id?: string;
  created_at: string;
  updated_at: string;
  attachments?: { name: string; size: number }[];
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_data?: unknown;
  new_data?: unknown;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  link?: string;
  read_at?: string;
  created_at: string;
}

export interface SystemSettings {
  platform_name: string;
  achieved_threshold: number; // >= verde
  warning_threshold: number; // >= amarelo
  // crítico = abaixo de warning_threshold
}
