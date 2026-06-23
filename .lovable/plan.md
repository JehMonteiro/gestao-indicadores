
# Plano — Gestão de Indicadores (Fase 1: Frontend com dados mockados)

Foco desta fase: construir toda a interface navegável, responsiva e com aparência corporativa, usando dados mockados em TypeScript. Autenticação real, banco e RLS entram na Fase 2 (Lovable Cloud já será ativada ao iniciar a Fase 2). Toda a estrutura de tipos e mocks será montada espelhando o schema final, para a migração ser direta.

## Identidade visual

- Estética: corporativa minimalista, densidade média, cantos suaves (radius 0.5rem), tipografia clara.
- Fontes: Inter (UI) + JetBrains Mono (números/códigos) via `@fontsource`.
- Paleta (tokens semânticos em `src/styles.css`, oklch):
  - Primária azul corporativo profundo, secundária cinza-azulado, accent teal.
  - Status: verde (atingido), âmbar (atenção), vermelho (crítico), cinza (sem info), azul (informativo).
- Componentes shadcn já presentes; nada hardcoded de cor.

## Arquitetura de rotas (TanStack Start)

Layout protegido fake via `_authenticated/route.tsx` que lê um "usuário simulado" do contexto (trocável no topo). Sem chamadas Supabase ainda.

```
src/routes/
  __root.tsx                  (providers + toaster)
  index.tsx                   (redirect → /auth ou /visao-geral)
  auth.tsx                    (login mock + seletor de perfil de demo)
  _authenticated/
    route.tsx                 (AppShell: sidebar + header + seletor de contexto)
    visao-geral.tsx           (Dashboard executivo)
    meu-painel.tsx
    meus-indicadores.tsx
    lancamentos.index.tsx
    lancamentos.novo.tsx
    lancamentos.$id.tsx
    aprovacoes.tsx
    setores.index.tsx
    setores.$id.tsx
    franquias.index.tsx
    franquias.$id.tsx
    indicadores.index.tsx
    indicadores.novo.tsx
    indicadores.$id.tsx
    metas.tsx
    relatorios.tsx
    usuarios.tsx
    auditoria.tsx
    configuracoes.tsx
    perfil.tsx
```

Menu lateral filtrado pelo perfil global do usuário simulado. Itens sem permissão não aparecem.

## Camada de dados mockada

`src/mocks/` com tipos TypeScript espelhando o schema da seção 13 do briefing:

- `types.ts` — enums (GlobalRole, SectorRole, ValueType, Frequency, Direction, EntryStatus, etc.) e interfaces (Profile, Sector, Franchise, Indicator, IndicatorTarget, IndicatorEntry, AuditLog, Notification…).
- `seed.ts` — gera os dados de demonstração do briefing (5 setores, 3 franquias, 10 indicadores, ~8 usuários cobrindo todos os perfis, metas e ~60 lançamentos em diferentes status/períodos).
- `store.ts` — store Zustand persistida em `localStorage` com:
  - usuário atual + troca rápida ("Entrar como…" no header para demo).
  - CRUD em memória de setores, franquias, indicadores, metas, lançamentos, notificações, logs.
  - Ação "Resetar dados de demonstração" em Configurações.

> Importante: este store é apenas para a fase de UI. Na Fase 2 ele será substituído por server functions + Supabase com a mesma interface, mantendo as telas estáveis.

## Módulos / telas

1. **Autenticação (mock)**: tela de login com e-mail/senha (qualquer credencial entra) + cards "Entrar como" para cada perfil demo, recuperação de senha e primeiro acesso (UI apenas).
2. **AppShell**: sidebar recolhível com ícones, header com busca, notificações, avatar e seletor de contexto (setor/franquia ativa quando aplicável).
3. **Visão geral / Dashboards**: cards de KPIs, gráficos (Recharts — linha de evolução, barras por setor, rosca de status, ranking de franquias), listas de pendências/atrasos. Versões diferentes para executivo, setor, franquia e "Meu painel".
4. **Indicadores**: lista com filtros (setor, categoria, público, status, periodicidade), página de detalhe com aba de definição/metas/histórico, formulário de cadastro/edição com todos os campos da seção 5 e validação Zod.
5. **Metas**: lista e formulário com escopo (empresa/setor/franquia/usuário) e períodos.
6. **Lançamentos**: lista com filtros, formulário de lançamento (rascunho/envio), página de detalhe com revisões e anexos (mock de upload).
7. **Aprovações**: central com abas Pendentes/Aprovados/Rejeitados/Atrasados, ações aprovar/rejeitar (com motivo).
8. **Setores / Franquias / Usuários**: CRUD com tabelas paginadas, dialogs de criação/edição, gestão de vínculos (usuário ↔ setor com papel, usuário ↔ franquia com papel).
9. **Relatórios**: relatório detalhado por indicador + exportação CSV (cliente) e botão "PDF (em breve)".
10. **Auditoria**: tabela de logs filtrável (gerada a partir das ações do store).
11. **Configurações**: limites de classificação (atingido/atenção/crítico), nome da plataforma, cores principais, botão "Limpar dados de demonstração".
12. **Perfil do usuário**: dados básicos editáveis no mock.

## Cálculo de desempenho

Função pura `computeAchievement(entry, target, indicator)` cobrindo:
- maior-melhor, menor-melhor, faixa ideal, meta exata,
- proteção contra divisão por zero,
- classificação configurável (lê limites das configurações),
- índice consolidado ponderado por peso.

Coberta por testes unitários básicos com `vitest`.

## Estados de UX

- Skeletons em todas as listas/dashboards.
- Empty states ilustrados com orientação ("Nenhum indicador cadastrado neste setor — Criar indicador").
- Toasts (sonner) para sucesso/erro.
- Dialog de confirmação antes de arquivar/excluir.
- Mensagens de permissão amigáveis quando o perfil simulado não tem acesso.
- Datas em pt-BR (`Intl.DateTimeFormat`), moeda em BRL, números com separador local.

## Responsividade

Sidebar vira drawer no mobile; tabelas com scroll horizontal + cards alternativos em telas pequenas; gráficos responsivos.

## Detalhes técnicos

- Stack: React 19 + TanStack Start/Router/Query, Tailwind v4, shadcn/ui, Recharts, Zustand (persist), Zod + react-hook-form, date-fns (locale pt-BR), sonner.
- Instalar: `@fontsource/inter`, `@fontsource/jetbrains-mono`, `zustand`, `recharts`, `date-fns`.
- Sem Lovable Cloud ainda — todas as rotas são públicas em build, mas o AppShell exige "login simulado" via store (redireciona para `/auth` quando não há usuário).
- Tipos e mocks ficam isolados em `src/mocks/` para troca fácil por server functions na Fase 2.
- Cada rota define `head()` com title/description próprios.

## Fora desta fase (Fase 2, após aprovação visual)

- Ativar Lovable Cloud, criar migrações com todas as tabelas, enums, índices, soft delete.
- Funções `has_role`, `is_sector_manager`, `belongs_to_franchise`, etc.
- RLS por tabela conforme seção 14.
- Auth real (email/senha) + perfis + trigger de criação de profile.
- Server functions substituindo o store mockado (mesma interface).
- Storage para anexos com policies espelhando o lançamento.
- Notificações persistidas; auditoria escrita por triggers.
- Exportações PDF e melhorias de relatório.

## Critérios de aceite desta fase

- Navegação completa entre todas as páginas listadas, sem telas em branco.
- Troca de "usuário demo" altera menu, dashboards e permissões visuais.
- CRUD funcional em memória para setores, franquias, indicadores, metas, lançamentos.
- Fluxo de aprovação funciona ponta a ponta (rascunho → enviado → aprovado/rejeitado com revisão).
- Cálculo de atingimento e classificação corretos para os 4 tipos de regra.
- Layout responsivo em desktop/tablet/mobile, estados de loading/vazio/erro presentes.
- Botão de "Resetar dados de demonstração" funciona.
