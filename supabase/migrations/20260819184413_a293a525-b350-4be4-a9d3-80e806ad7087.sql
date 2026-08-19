CREATE TABLE public.chamados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  situacao text NOT NULL,
  aberto_em timestamptz,
  respondido_em timestamptz,
  resolvido_em timestamptz,
  concluido_em timestamptz,
  prazo_planejado timestamptz,
  prazo_estipulado timestamptz,
  satisfacao_nota numeric(3,1),
  unidade text,
  solicitante text,
  responsavel text,
  departamento_recebimento text,
  departamento_envio text,
  assunto text,
  categoria text GENERATED ALWAYS AS (btrim(split_part(assunto, '>', 1))) STORED,
  subcategoria text GENERATED ALWAYS AS (
    CASE WHEN strpos(coalesce(assunto,''), '>') > 0 THEN btrim(split_part(assunto, '>', 2)) ELSE NULL END
  ) STORED,
  qtd_interacao integer NOT NULL DEFAULT 0,
  etiquetas text[] NOT NULL DEFAULT '{}',
  tma_horas numeric(12,2) GENERATED ALWAYS AS (
    CASE WHEN concluido_em IS NOT NULL AND aberto_em IS NOT NULL
      THEN extract(epoch FROM (concluido_em - aberto_em)) / 3600.0 ELSE NULL END
  ) STORED,
  tmr_horas numeric(12,2) GENERATED ALWAYS AS (
    CASE WHEN respondido_em IS NOT NULL AND aberto_em IS NOT NULL
      THEN extract(epoch FROM (respondido_em - aberto_em)) / 3600.0 ELSE NULL END
  ) STORED,
  no_prazo boolean GENERATED ALWAYS AS (
    CASE WHEN concluido_em IS NOT NULL AND prazo_estipulado IS NOT NULL
      THEN concluido_em <= prazo_estipulado ELSE NULL END
  ) STORED,
  importado_em timestamptz NOT NULL DEFAULT now(),
  importado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lote_id text NOT NULL DEFAULT gen_random_uuid()::text
);

CREATE INDEX idx_chamados_situacao ON public.chamados(situacao);
CREATE INDEX idx_chamados_aberto_em ON public.chamados(aberto_em);
CREATE INDEX idx_chamados_responsavel ON public.chamados(responsavel);
CREATE INDEX idx_chamados_departamento_recebimento ON public.chamados(departamento_recebimento);
CREATE INDEX idx_chamados_unidade ON public.chamados(unidade);
CREATE INDEX idx_chamados_lote_id ON public.chamados(lote_id);

GRANT SELECT, INSERT, DELETE ON public.chamados TO authenticated;
GRANT ALL ON public.chamados TO service_role;

ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler chamados"
  ON public.chamados FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados podem inserir chamados"
  ON public.chamados FOR INSERT TO authenticated WITH CHECK (auth.uid() = importado_por);

CREATE POLICY "Admins podem excluir lotes de chamados"
  ON public.chamados FOR DELETE TO authenticated USING (
    private.has_role(auth.uid(), 'superadmin') OR private.has_role(auth.uid(), 'admin_corporativo')
  );