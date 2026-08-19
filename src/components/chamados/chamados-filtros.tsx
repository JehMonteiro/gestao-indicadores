import { useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Chamado, FiltrosChamados } from "@/types/chamados";
import { SITUACOES } from "@/types/chamados";

const TODOS = "__todos__";

function unicos(vals: (string | null | undefined)[]): string[] {
  return Array.from(new Set(vals.filter((v): v is string => !!v && v.trim() !== ""))).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

function SelectFiltro({
  label, value, options, onChange,
}: {
  label: string;
  value: string | null | undefined;
  options: string[];
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-1 min-w-[160px]">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value ?? TODOS} onValueChange={(v) => onChange(v === TODOS ? null : v)}>
        <SelectTrigger aria-label={label}><SelectValue placeholder="Todos" /></SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value={TODOS}>Todos</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ChamadosFiltros({
  todos, filtros, onChange, totalFiltrado,
}: {
  todos: Chamado[];
  filtros: FiltrosChamados;
  onChange: (f: FiltrosChamados) => void;
  totalFiltrado: number;
}) {
  const opcoes = useMemo(() => ({
    responsaveis: unicos(todos.map((c) => c.responsavel)),
    departamentos: unicos(todos.map((c) => c.departamento_recebimento)),
    unidades: unicos(todos.map((c) => c.unidade)),
    etiquetas: unicos(todos.flatMap((c) => c.etiquetas ?? [])),
    categorias: unicos(todos.map((c) => c.categoria ?? "Sem categoria")),
  }), [todos]);

  const set = (patch: Partial<FiltrosChamados>) => onChange({ ...filtros, ...patch });
  const situacoes = filtros.situacao ?? [];
  const toggleSituacao = (s: string) =>
    set({ situacao: situacoes.includes(s) ? situacoes.filter((x) => x !== s) : [...situacoes, s] });

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground" htmlFor="filtro-de">De</Label>
          <Input
            id="filtro-de"
            type="date"
            className="w-[150px]"
            value={filtros.de ? filtros.de.slice(0, 10) : ""}
            onChange={(e) => set({ de: e.target.value ? new Date(`${e.target.value}T00:00:00-03:00`).toISOString() : null })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground" htmlFor="filtro-ate">Até</Label>
          <Input
            id="filtro-ate"
            type="date"
            className="w-[150px]"
            value={filtros.ate ? filtros.ate.slice(0, 10) : ""}
            onChange={(e) => set({ ate: e.target.value ? new Date(`${e.target.value}T23:59:59-03:00`).toISOString() : null })}
          />
        </div>
        <SelectFiltro label="Responsável" value={filtros.responsavel} options={opcoes.responsaveis} onChange={(v) => set({ responsavel: v })} />
        <SelectFiltro label="Departamento" value={filtros.departamento} options={opcoes.departamentos} onChange={(v) => set({ departamento: v })} />
        <SelectFiltro label="Unidade" value={filtros.unidade} options={opcoes.unidades} onChange={(v) => set({ unidade: v })} />
        <SelectFiltro label="Etiqueta" value={filtros.etiqueta} options={opcoes.etiquetas} onChange={(v) => set({ etiqueta: v })} />
        <SelectFiltro label="Categoria" value={filtros.categoria} options={opcoes.categorias} onChange={(v) => set({ categoria: v })} />
        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="secondary">{totalFiltrado} registros</Badge>
          <Button variant="outline" size="sm" onClick={() => onChange({})} aria-label="Limpar filtros">
            <X className="size-4 mr-1" /> Limpar filtros
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SITUACOES.map((s) => (
          <button
            key={s}
            type="button"
            aria-label={`Filtrar por ${s}`}
            aria-pressed={situacoes.includes(s)}
            onClick={() => toggleSituacao(s)}
          >
            <Badge variant={situacoes.includes(s) ? "default" : "outline"} className="cursor-pointer">{s}</Badge>
          </button>
        ))}
      </div>
    </Card>
  );
}
