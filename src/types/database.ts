export type TipoBase = 'sinapi' | 'sicro' | 'propria'

export interface Obra {
  id: string
  nome: string
  local: string
  descricao?: string
  data_inicio?: string
  data_fim_prevista?: string
  status: 'planejamento' | 'em_andamento' | 'concluida' | 'pausada'
  bdi: number
  created_at: string
  updated_at: string
}

export interface Etapa {
  id: string
  obra_id: string
  nome: string
  ordem: number
  created_at: string
}

export interface Servico {
  id: string
  etapa_id: string
  obra_id: string
  codigo?: string
  codigo_sinapi?: string
  tipo_base?: TipoBase
  descricao: string
  unidade: string
  quantidade: number
  preco_unitario: number
  preco_total: number
  created_at: string
  updated_at?: string
}


export interface ServicoComCalculo extends Servico {
  total: number
}

export interface EtapaComServicos extends Etapa {
  servicos: ServicoComCalculo[]
  total: number
}

export interface OrcamentoResumo {
  custo_direto: number
  bdi_valor: number
  total_com_bdi: number
  total_etapas: number
  total_servicos: number
}

export type Database = {
  public: {
    Tables: {
      obras: {
        Row: Obra
        Insert: Omit<Obra, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Obra, 'id' | 'created_at'>>
      }
      etapas: {
        Row: Etapa
        Insert: Omit<Etapa, 'id' | 'created_at'>
        Update: Partial<Omit<Etapa, 'id' | 'created_at'>>
      }
      servicos: {
        Row: Servico
        Insert: Omit<Servico, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Servico, 'id' | 'created_at'>>
      }
    }
  }
}
