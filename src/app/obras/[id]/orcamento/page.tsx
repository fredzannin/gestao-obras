'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Plus, Trash2, Download,
  ArrowLeft, Building2, Save, FileSpreadsheet, FileText, FileSearch } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Obra, Etapa, Servico, EtapaComServicos, TipoBase } from '@/types/database'
import {
  formatCurrency, formatNumber, calcularTotalEtapa,
  calcularTotalComBDI, STATUS_LABELS, STATUS_COLORS
} from '@/lib/utils'

export default function OrcamentoPage() {
  const params = useParams()
  const router = useRouter()
  const obraId = params.id as string

  const [obra, setObra] = useState<Obra | null>(null)
  const [etapas, setEtapas] = useState<EtapaComServicos[]>([])
  const [loading, setLoading] = useState(true)
  const [bdi, setBdi] = useState(25)
  const [saving, setSaving] = useState(false)
  const [showExport, setShowExport] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: obraData }, { data: etapasData }, { data: servicosData }] = await Promise.all([
      supabase.from('obras').select('*').eq('id', obraId).single(),
      supabase.from('etapas').select('*').eq('obra_id', obraId).order('ordem'),
      supabase.from('servicos').select('*').eq('obra_id', obraId),
    ])
    if (!obraData) { router.push('/'); return }
    setObra(obraData)
    setBdi((obraData as any).bdi)
```
    const etapasComServicos: EtapaComServicos[] = (etapasData || []).map(et => {
      const svs = (servicosData || [])
        .filter(s => s.etapa_id === et.id)
        .map(s => ({ ...s, total: s.quantidade * s.preco_unitario }))
      return { ...et, servicos: svs, total: calcularTotalEtapa(svs) }
    })
    setEtapas(etapasComServicos)
    setLoading(false)
  }, [obraId, router])

  useEffect(() => { carregar() }, [carregar])

  // ── Etapas ──
  const addEtapa = async () => {
    const nome = prompt('Nome da nova etapa:')
    if (!nome) return
    const ordem = etapas.length + 1
    const { data } = await supabase.from('etapas').insert({ obra_id: obraId, nome, ordem }).select().single()
    if (data) setEtapas(prev => [...prev, { ...data, servicos: [], total: 0 }])
  }

  const deleteEtapa = async (etapaId: string) => {
    if (!confirm('Remover etapa e todos os seus serviços?')) return
    await supabase.from('servicos').delete().eq('etapa_id', etapaId)
    await supabase.from('etapas').delete().eq('id', etapaId)
    setEtapas(prev => prev.filter(e => e.id !== etapaId))
  }

  const toggleEtapa = (etapaId: string) => {
    setEtapas(prev => prev.map(e =>
      e.id === etapaId ? { ...e, _open: !(e as any)._open } : e
    ) as EtapaComServicos[])
  }

  // ── Serviços ──
  const addServico = async (etapaId: string) => {
    const { data } = await supabase.from('servicos').insert({
      etapa_id: etapaId, obra_id: obraId,
      codigo: '', tipo_base: 'sinapi', descricao: 'Novo serviço',
      unidade: 'm²', quantidade: 1, preco_unitario: 0,
    }).select().single()
    if (data) {
      setEtapas(prev => prev.map(e => e.id === etapaId ? {
        ...e,
        servicos: [...e.servicos, { ...data, total: 0 }],
        total: e.total,
      } : e))
    }
  }

  const updateServico = async (
    etapaId: string, servicoId: string,
    campo: keyof Servico, valor: string | number
  ) => {
    await supabase.from('servicos').update({ [campo]: valor }).eq('id', servicoId)
    setEtapas(prev => prev.map(e => {
      if (e.id !== etapaId) return e
      const svs = e.servicos.map(s => {
        if (s.id !== servicoId) return s
        const updated = { ...s, [campo]: valor }
        return { ...updated, total: updated.quantidade * updated.preco_unitario }
      })
      return { ...e, servicos: svs, total: calcularTotalEtapa(svs) }
    }))
  }

  const deleteServico = async (etapaId: string, servicoId: string) => {
    await supabase.from('servicos').delete().eq('id', servicoId)
    setEtapas(prev => prev.map(e => {
      if (e.id !== etapaId) return e
      const svs = e.servicos.filter(s => s.id !== servicoId)
      return { ...e, servicos: svs, total: calcularTotalEtapa(svs) }
    }))
  }

  // ── BDI ──
  const salvarBdi = async () => {
    setSaving(true)
    await supabase.from('obras').update({ bdi }).eq('id', obraId)
    setSaving(false)
  }

  // ── Cálculos ──
  const custoDireto = etapas.reduce((s, e) => s + e.total, 0)
  const totalComBdi = calcularTotalComBDI(custoDireto, bdi)

  // ── Exportação ──
  const handleExportExcel = async () => {
    if (!obra) return
    const { exportarExcel } = await import('@/lib/exportar')
    await exportarExcel(obra, etapas)
    setShowExport(false)
  }

  const handleExportPDF = async () => {
    if (!obra) return
    const { exportarPDF } = await import('@/lib/exportar')
    await exportarPDF(obra, etapas)
    setShowExport(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Carregando orçamento...</p>
    </div>
  )

  if (!obra) return null

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="btn btn-sm shrink-0"><ArrowLeft size={14} /></Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-gray-900 text-sm truncate">{obra.nome}</h1>
                <span className={`badge shrink-0 ${STATUS_COLORS[obra.status]}`}>
                  {STATUS_LABELS[obra.status]}
                </span>
              </div>
              <p className="text-xs text-gray-400">{obra.local} · Orçamento</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <button className="btn btn-sm" onClick={() => setShowExport(!showExport)}>
                <Download size={14} /> Exportar
              </button>
              {showExport && (
                <div className="absolute right-0 top-9 bg-white rounded-xl border border-gray-100 shadow-lg z-20 w-44 overflow-hidden">
                  <button onClick={handleExportExcel}
                    className="flex items-center gap-2 px-4 py-3 text-sm w-full hover:bg-gray-50 text-left">
                    <FileSpreadsheet size={14} className="text-green-600" /> Excel (.xlsx)
                  </button>
                  <button onClick={handleExportPDF}
                    className="flex items-center gap-2 px-4 py-3 text-sm w-full hover:bg-gray-50 text-left">
                    <FileText size={14} className="text-red-500" /> PDF
                  </button>
                </div>
              )}
            </div>
             <Link href={`/obras/${obraId}/pdf`} className="btn btn-sm">
              <FileSearch size={14} /> Leitor PDF
            </Link>
            <button onClick={addEtapa} className="btn btn-primary btn-sm">
              <Plus size={14} /> Etapa
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">

        {/* Cards resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-xs text-gray-400 mb-1">Custo direto</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(custoDireto)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 mb-1">BDI ({bdi}%)</p>
            <p className="text-lg font-semibold text-amber-600">{formatCurrency(custoDireto * bdi / 100)}</p>
          </div>
          <div className="card p-4 border-primary-200">
            <p className="text-xs text-gray-400 mb-1">Total com BDI</p>
            <p className="text-lg font-semibold text-primary-600">{formatCurrency(totalComBdi)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-400 mb-1">Etapas / Serviços</p>
            <p className="text-lg font-semibold text-gray-900">
              {etapas.length} / {etapas.reduce((s, e) => s + e.servicos.length, 0)}
            </p>
          </div>
        </div>

        {/* BDI */}
        <div className="card p-4 mb-4 flex items-center gap-4 flex-wrap">
          <span className="text-sm text-gray-500">BDI global da obra:</span>
          <input type="number" min="0" max="100" step="0.5" value={bdi}
            onChange={e => setBdi(parseFloat(e.target.value) || 0)}
            className="input w-24 text-center" />
          <span className="text-sm text-gray-400">%</span>
          <button onClick={salvarBdi} className="btn btn-sm btn-primary" disabled={saving}>
            <Save size={12} /> {saving ? 'Salvando...' : 'Salvar BDI'}
          </button>
          <span className="text-xs text-gray-300 ml-auto hidden md:block">
            Bonificações e Despesas Indiretas — aplicado sobre o custo direto total
          </span>
        </div>

        {/* Etapas */}
        {etapas.length === 0 ? (
         <div className="text-center py-16">
            <p className="text-gray-400 mb-3">Nenhuma etapa cadastrada</p>
            <button onClick={addEtapa} className="btn btn-primary">
              <Plus size={14} /> Adicionar primeira etapa
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {etapas.map(etapa => {
              const pct = custoDireto > 0 ? ((etapa.total / custoDireto) * 100).toFixed(1) : '0.0'
              const open = (etapa as any)._open !== false
              return (
                <div key={etapa.id} className="card overflow-hidden">
                  {/* Header da etapa */}
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleEtapa(etapa.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {open ? <ChevronDown size={14} className="text-gray-400 shrink-0" />
                             : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
                      <span className="font-medium text-sm text-gray-900">{etapa.nome}</span>
                      <span className="text-xs text-gray-400 hidden sm:block">{pct}% do total</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold text-sm text-primary-600">{formatCurrency(etapa.total)}</span>
                      <button onClick={e => { e.stopPropagation(); addServico(etapa.id) }}
                        className="btn btn-sm" title="Adicionar serviço">
                        <Plus size={12} /> Serviço
                      </button>
                      <button onClick={e => { e.stopPropagation(); deleteEtapa(etapa.id) }}
                        className="btn btn-sm btn-danger" title="Remover etapa">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Tabela de serviços */}
                  {open && (
                    <div className="overflow-x-auto">
                      {etapa.servicos.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-400">
                          Nenhum serviço. <button className="text-primary-600 hover:underline" onClick={() => addServico(etapa.id)}>Adicionar serviço</button>
                        </div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left px-4 py-2 text-gray-400 font-medium w-24">Código</th>
                              <th className="text-left px-2 py-2 text-gray-400 font-medium w-20">Base</th>
                              <th className="text-left px-2 py-2 text-gray-400 font-medium">Descrição</th>
                              <th className="text-left px-2 py-2 text-gray-400 font-medium w-16">Unid.</th>
                              <th className="text-right px-2 py-2 text-gray-400 font-medium w-24">Quantidade</th>
                              <th className="text-right px-2 py-2 text-gray-400 font-medium w-28">Preço unit.</th>
                              <th className="text-right px-4 py-2 text-gray-400 font-medium w-28">Total</th>
                              <th className="w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {etapa.servicos.map(sv => (
                              <tr key={sv.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="px-4 py-1.5">
                                  <input className="input text-xs py-1"
                                    value={sv.codigo}
                                    onChange={e => updateServico(etapa.id, sv.id, 'codigo', e.target.value)}
                                    placeholder="Código" />
                                </td>
                                <td className="px-2 py-1.5">
                                  <select className="input text-xs py-1"
                                    value={sv.tipo_base}
                                    onChange={e => updateServico(etapa.id, sv.id, 'tipo_base', e.target.value as TipoBase)}>
                                    <option value="sinapi">SINAPI</option>
                                    <option value="sicro">SICRO</option>
                                    <option value="propria">Própria</option>
                                  </select>
                                </td>
                                <td className="px-2 py-1.5">
                                  <input className="input text-xs py-1"
                                    value={sv.descricao}
                                    onChange={e => updateServico(etapa.id, sv.id, 'descricao', e.target.value)} />
                                </td>
                                <td className="px-2 py-1.5">
                                  <input className="input text-xs py-1 text-center"
                                    value={sv.unidade}
                                    onChange={e => updateServico(etapa.id, sv.id, 'unidade', e.target.value)} />
                                </td>
                                <td className="px-2 py-1.5">
                                  <input className="input text-xs py-1 text-right"
                                    type="number" min="0" step="0.01"
                                    value={sv.quantidade}
                                    onChange={e => updateServico(etapa.id, sv.id, 'quantidade', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="px-2 py-1.5">
                                  <input className="input text-xs py-1 text-right"
                                    type="number" min="0" step="0.01"
                                    value={sv.preco_unitario}
                                    onChange={e => updateServico(etapa.id, sv.id, 'preco_unitario', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="px-4 py-1.5 text-right font-semibold text-primary-600">
                                  {formatCurrency(sv.total)}
                                </td>
                                <td className="px-2 py-1.5">
                                  <button onClick={() => deleteServico(etapa.id, sv.id)}
                                    className="text-red-300 hover:text-red-500 transition-colors">
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50">
                              <td colSpan={6} className="px-4 py-2 text-right text-xs text-gray-500 font-medium">
                                Subtotal — {etapa.nome}
                              </td>
                              <td className="px-4 py-2 text-right text-sm font-bold text-primary-700">
                                {formatCurrency(etapa.total)}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Total final */}
        {etapas.length > 0 && (
          <div className="card p-5 mt-4 flex flex-wrap items-center justify-end gap-6">
            <div className="text-right">
              <p className="text-xs text-gray-400">Custo direto</p>
              <p className="font-semibold text-gray-900">{formatCurrency(custoDireto)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">BDI ({bdi}%)</p>
              <p className="font-semibold text-amber-600">{formatCurrency(custoDireto * bdi / 100)}</p>
            </div>
            <div className="w-px h-8 bg-gray-100" />
            <div className="text-right">
              <p className="text-xs text-gray-400">Total com BDI</p>
              <p className="text-xl font-bold text-primary-600">{formatCurrency(totalComBdi)}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
