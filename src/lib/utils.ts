export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatPercent(value: number): string {
  return `${formatNumber(value, 1)}%`
}

export function calcularTotalServico(qtd: number, preco: number): number {
  return qtd * preco
}

export function calcularTotalEtapa(servicos: { quantidade: number; preco_unitario: number }[]): number {
  return servicos.reduce((sum, s) => sum + s.quantidade * s.preco_unitario, 0)
}

export function calcularTotalObra(etapasTotais: number[]): number {
  return etapasTotais.reduce((sum, t) => sum + t, 0)
}

export function calcularBDI(custoDireto: number, bdiPercent: number): number {
  return custoDireto * (bdiPercent / 100)
}

export function calcularTotalComBDI(custoDireto: number, bdiPercent: number): number {
  return custoDireto * (1 + bdiPercent / 100)
}

export function gerarCodigo(): string {
  return Date.now().toString(36).toUpperCase()
}

export const STATUS_LABELS: Record<string, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  pausada: 'Pausada',
}

export const STATUS_COLORS: Record<string, string> = {
  planejamento: 'bg-blue-50 text-blue-800',
  em_andamento: 'bg-primary-50 text-primary-800',
  concluida: 'bg-gray-100 text-gray-700',
  pausada: 'bg-amber-50 text-amber-800',
}
