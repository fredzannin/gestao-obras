-- =====================================================
-- GESTÃO DE OBRAS — Script de criação do banco
-- Execute este script no Supabase:
-- Dashboard → SQL Editor → New Query → Cole e Execute
-- =====================================================

-- Tabela de obras
CREATE TABLE IF NOT EXISTS obras (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        text NOT NULL,
  local       text NOT NULL DEFAULT 'Rio Branco/AC',
  descricao   text,
  status      text NOT NULL DEFAULT 'planejamento'
              CHECK (status IN ('planejamento','em_andamento','concluida','pausada')),
  bdi         numeric(5,2) NOT NULL DEFAULT 25.00,
  data_inicio date,
  data_fim_prevista date,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Tabela de etapas
CREATE TABLE IF NOT EXISTS etapas (
  id       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id  uuid NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  nome     text NOT NULL,
  ordem    integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Tabela de serviços
CREATE TABLE IF NOT EXISTS servicos (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa_id       uuid NOT NULL REFERENCES etapas(id) ON DELETE CASCADE,
  obra_id        uuid NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  codigo         text DEFAULT '',
  tipo_base      text NOT NULL DEFAULT 'sinapi'
                 CHECK (tipo_base IN ('sinapi','sicro','propria')),
  descricao      text NOT NULL,
  unidade        text NOT NULL DEFAULT 'm²',
  quantidade     numeric(15,4) NOT NULL DEFAULT 0,
  preco_unitario numeric(15,4) NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_etapas_obra_id  ON etapas(obra_id);
CREATE INDEX IF NOT EXISTS idx_servicos_etapa  ON servicos(etapa_id);
CREATE INDEX IF NOT EXISTS idx_servicos_obra   ON servicos(obra_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_obras_updated_at ON obras;
CREATE TRIGGER trg_obras_updated_at
  BEFORE UPDATE ON obras FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

DROP TRIGGER IF EXISTS trg_servicos_updated_at ON servicos;
CREATE TRIGGER trg_servicos_updated_at
  BEFORE UPDATE ON servicos FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();

-- =====================================================
-- RLS (Row Level Security) — Acesso liberado por ora
-- Para uso próprio/escritório pequeno, simplificamos.
-- Quando quiser multiusuário com login, avisar.
-- =====================================================
ALTER TABLE obras    ENABLE ROW LEVEL SECURITY;
ALTER TABLE etapas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;

-- Políticas abertas (acesso total via anon key)
CREATE POLICY "acesso_total_obras"    ON obras    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acesso_total_etapas"   ON etapas   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acesso_total_servicos" ON servicos FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- VERIFICAÇÃO — rode após o script para confirmar:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public';
-- =====================================================
