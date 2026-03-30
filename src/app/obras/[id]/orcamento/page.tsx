'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight,
  Building2, Calculator, FileText, Layers, Upload,
  CheckSquare, Square, Loader2, AlertCircle, X, FileUp
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Obra, Etapa, Servico } from '@/types/database'

interface ServicoExtraido {
  descricao: string
  unidade: string
  quantidade: number
  etapa_sugerida: string
  observacao?: string | null
  selecionado?: boolean
  etapa_id_destino?: string
}

export default function OrcamentoPage() {
  const params = useParams()
  const router = useRouter()
  const obraId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [obra, setObra] = useState<Obra | null>(null)
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [etapasAbertas, setEtapasAbertas] = useState<Record<string, boolean>>({})

  // Forms etapa/serviço
  const [showNovaEtapa, setShowNovaEtapa] = useState(false)
  const [nomeEtapa, setNomeEtapa] = useState('')
  const [savingEtapa, setSavingEtapa] = useState(false)
  const [showNovoServico, setShowNovoServico] = useState<string | null>(null)
  const [formServico, setFormServico] = useState({
    descricao: '', unidade: 'm²', quantidade: '', preco_unitario: '', codigo_sinapi: ''
  })
  const [savingServico, setSavingServico] = useState(false)

  // PDF
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [extraindo, setExtraindo] = useState(false)
  const [erroExtracao, setErroExtracao] = useState<string | null>(null)
  const [servicosExtraidos, setServicosExtraidos] = useState<ServicoExtraido[]>([])
  const [resumoExtracao, setResumoExtracao] = useState('')
  const [importando, setImportando] = useState(false)
  const [etapaDestinoPadrao, setEtapaDestinoPadrao] = useState('')

  useEffect(() => {
    if (obraId) carregarDados()
  }, [obraId])

  async function carregarDados() {
    setLoading(true)
    const [{ data: obraData }, { data: etapasData }, { data: servicosData }] = await Promise.all([
      supabase.from('obras').select('*').eq('id', obraId).single(),
      supabase.from('etapas').select('*').eq('obra_id', obraId).order('ordem', { ascending: true }),
      supabase.from('servicos').select('*').eq('obra_id', obraId).order('created_at', { ascending: true }),
    ])
    setObra(obraData)
    setEtapas(etapasData || [])
    setServicos(servicosData || [])
    if (etapasData) {
      const abertas: Record<string, boolean> = {}
      etapasData.forEach(e => { abertas[e.id] = true })
      setEtapasAbertas(abertas)
    }
    setLoading(false)
  }

  async function criarEtapa() {
    if (!nomeEtapa.trim()) return
    setSavingEtapa(true)
    await supabase.from('etapas').insert({ obra_id: obraId, nome: nomeEtapa, ordem: etapas.length + 1 })
    setNomeEtapa('')
    setShowNovaEtapa(false)
    setSavingEtapa(false)
    carregarDados()
  }

  async function excluirEtapa(etapaId: string) {
    if (!confirm('Excluir esta etapa e todos os seus serviços?')) return
    await supabase.from('servicos').delete().eq('etapa_id', etapaId)
    await supabase.from('etapas').delete().eq('id', etapaId)
    carregarDados()
  }

  async function criarServico(etapaId: string) {
    if (!formServico.descricao.trim()) return
    setSavingServico(true)
    const qtd = parseFloat(formServico.quantidade) || 0
    const pu = parseFloat(formServico.preco_unitario) || 0
    await supabase.from('servicos').insert({
      obra_id: obraId, etapa_id: etapaId,
      descricao: formServico.descricao, unidade: formServico.unidade,
      quantidade: qtd, preco_unitario: pu, preco_total: qtd * pu,
      codigo_sinapi: formServico.codigo_sinapi || null,
    })
    setFormServico({ descricao: '', unidade: 'm²', quantidade: '', preco_unitario: '', codigo_sinapi: '' })
    setShowNovoServico(null)
    setSavingServico(false)
    carregarDados()
  }

  async function excluirServico(servicoId: string) {
    await supabase.from('servicos').delete().eq('id', servicoId)
    carregarDados()
  }

  function toggleEtapa(etapaId: string) {
    setEtapasAbertas(prev => ({ ...prev, [etapaId]: !prev[etapaId] }))
  }

  // ── PDF ──────────────────────────────────────────────

  function abrirPdfModal() {
    setPdfFile(null)
    setServicosExtraidos([])
    setErroExtracao(null)
    setResumoExtracao('')
    setShowPdfModal(true)
  }

  async function extrairPdf() {
    if (!pdfFile) return
    setExtraindo(true)
    setErroExtracao(null)
    setServicosExtraidos([])

    try {
      const fd = new FormData()
      fd.append('pdf', pdfFile)
      const res = await fetch('/api/extrair-pdf', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Erro na extração')

      const comSelecao = (data.servicos || []).map((s: ServicoExtraido) => ({
        ...s,
        selecionado: true,
        etapa_id_destino: etapaDestinoPadrao || (etapas[0]?.id ?? ''),
      }))
      setServicosExtraidos(comSelecao)
      setResumoExtracao(data.resumo || '')
    } catch (err: unknown) {
      setErroExtracao(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setExtraindo(false)
    }
  }

  function toggleSelecao(idx: number) {
    setServicosExtraidos(prev => prev.map((s, i) => i === idx ? { ...s, selecionado: !s.selecionado } : s))
  }

  function toggleTodos(valor: boolean) {
    setServicosExtraidos(prev => prev.map(s => ({ ...s, selecionado: valor })))
  }

  function alterarEtapaDestino(idx: number, etapaId: string) {
    setServicosExtraidos(prev => prev.map((s, i) => i === idx ? { ...s, etapa_id_destino: etapaId } : s))
  }

  async function importarSelecionados() {
    const selecionados = servicosExtraidos.filter(s => s.selecionado && s.etapa_id_destino)
    if (selecionados.length === 0) return
    setImportando(true)

    const inserts = selecionados.map(s => ({
      obra_id: obraId,
      etapa_id: s.etapa_id_destino,
      descricao: s.descricao,
      unidade: s.unidade,
      quantidade: s.quantidade,
      preco_unitario: 0,
      preco_total: 0,
    }))

    await supabase.from('servicos').insert(inserts)
    setImportando(false)
    setShowPdfModal(false)
    carregarDados()
  }

  // ── Cálculos ──────────────────────────────────────────

  const bdi = obra ? obra.bdi / 100 : 0
  const totalSemBdi = servicos.reduce((acc, s) => acc + (s.preco_total || 0), 0)
  const totalComBdi = totalSemBdi * (1 + bdi)

  function totalEtapa(etapaId: string) {
    return servicos.filter(s => s.etapa_id === etapaId).reduce((acc, s) => acc + (s.preco_total || 0), 0)
  }

  function fmt(valor: number) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Carregando orçamento...</p>
      </div>
    )
  }

  if (!obra) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Obra não encontrada.</p>
        <button className="btn btn-primary" onClick={() => router.push('/')}>
          <ArrowLeft size={14} /> Voltar ao início
        </button>
      </div>
    )
  }

  const selecionadosCount = servicosExtraidos.filter(s => s.selecionado).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="btn btn-sm">
              <ArrowLeft size={14} />
            </button>
            <div className="w-8 h-8 rounded-lg bg-primary-400 flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">{obra.nome}</h1>
              <p className="text-xs text-gray-400">{obra.local} · BDI {obra.bdi}%</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={abrirPdfModal} className="btn btn-sm gap-1.5">
              <FileUp size={14} /> Importar PDF
            </button>
            <button onClick={() => setShowNovaEtapa(true)} className="btn btn-primary">
              <Plus size={14} /> Nova etapa
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Resumo financeiro */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Etapas', value: etapas.length, icon: <Layers size={16} className="text-primary-600" /> },
            { label: 'Serviços', value: servicos.length, icon: <FileText size={16} className="text-primary-600" /> },
            { label: 'Subtotal (s/ BDI)', value: fmt(totalSemBdi), icon: <Calculator size={16} className="text-primary-600" /> },
            { label: `Total (c/ BDI ${obra.bdi}%)`, value: fmt(totalComBdi), icon: <Calculator size={16} className="text-green-600" />, destaque: true },
          ].map((s, i) => (
            <div key={i} className={`card p-4 ${s.destaque ? 'border-green-200 bg-green-50' : ''}`}>
              <div className="flex items-center gap-2 mb-1">{s.icon}<p className="text-xs text-gray-400">{s.label}</p></div>
              <p className={`text-lg font-semibold ${s.destaque ? 'text-green-700' : 'text-gray-900'}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Modal nova etapa */}
        {showNovaEtapa && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Nova etapa</h2>
              <input className="input mb-4" placeholder="Ex: 01 - Serviços Preliminares"
                value={nomeEtapa} onChange={e => setNomeEtapa(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && criarEtapa()} autoFocus />
              <div className="flex gap-2">
                <button className="btn flex-1" onClick={() => setShowNovaEtapa(false)}>Cancelar</button>
                <button className="btn btn-primary flex-1" onClick={criarEtapa} disabled={savingEtapa}>
                  {savingEtapa ? 'Salvando...' : 'Criar etapa'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal PDF ── */}
        {showPdfModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">

              {/* Cabeçalho do modal */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                    <FileUp size={16} className="text-primary-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Importar quantitativos do PDF</h2>
                    <p className="text-xs text-gray-400">A IA vai analisar o projeto e extrair os serviços automaticamente</p>
                  </div>
                </div>
                <button onClick={() => setShowPdfModal(false)} className="btn btn-sm">
                  <X size={14} />
                </button>
              </div>

              <div className="p-6 space-y-5">

                {/* Upload do arquivo */}
                {servicosExtraidos.length === 0 && (
                  <>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                        ${pdfFile ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'}`}
                    >
                      <Upload size={32} className={`mx-auto mb-3 ${pdfFile ? 'text-primary-500' : 'text-gray-300'}`} />
                      {pdfFile ? (
                        <>
                          <p className="font-medium text-primary-700">{pdfFile.name}</p>
                          <p className="text-xs text-primary-500 mt-1">
                            {(pdfFile.size / 1024 / 1024).toFixed(2)} MB · clique para trocar
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-600 font-medium">Clique para selecionar o PDF</p>
                          <p className="text-xs text-gray-400 mt-1">Projeto arquitetônico, estrutural, hidráulico, elétrico · máx. 10MB</p>
                        </>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) setPdfFile(f) }} />

                    {etapas.length > 0 && (
                      <div>
                        <label className="label">Etapa de destino padrão (pode ajustar por item depois)</label>
                        <select className="input" value={etapaDestinoPadrao}
                          onChange={e => setEtapaDestinoPadrao(e.target.value)}>
                          <option value="">— Selecionar etapa —</option>
                          {etapas.map(et => <option key={et.id} value={et.id}>{et.nome}</option>)}
                        </select>
                      </div>
                    )}

                    {erroExtracao && (
                      <div className="flex items-start gap-2 text-red-600 bg-red-50 rounded-lg p-3 text-sm">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>{erroExtracao}</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button className="btn flex-1" onClick={() => setShowPdfModal(false)}>Cancelar</button>
                      <button className="btn btn-primary flex-1" onClick={extrairPdf}
                        disabled={!pdfFile || extraindo}>
                        {extraindo ? (
                          <><Loader2 size={14} className="animate-spin" /> Analisando PDF...</>
                        ) : (
                          <><Upload size={14} /> Analisar com IA</>
                        )}
                      </button>
                    </div>

                    {extraindo && (
                      <p className="text-xs text-center text-gray-400">
                        Isso pode levar até 30 segundos dependendo do tamanho do projeto...
                      </p>
                    )}
                  </>
                )}

                {/* Resultados da extração */}
                {servicosExtraidos.length > 0 && (
                  <>
                    {resumoExtracao && (
                      <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                        <strong>Resumo:</strong> {resumoExtracao}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">
                        {servicosExtraidos.length} itens encontrados · {selecionadosCount} selecionados
                      </p>
                      <div className="flex gap-2">
                        <button className="btn btn-sm text-xs" onClick={() => toggleTodos(true)}>Marcar todos</button>
                        <button className="btn btn-sm text-xs" onClick={() => toggleTodos(false)}>Desmarcar todos</button>
                      </div>
                    </div>

                    <div className="border border-gray-100 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide sticky top-0">
                          <tr>
                            <th className="w-8 px-3 py-2"></th>
                            <th className="text-left px-3 py-2">Descrição</th>
                            <th className="text-center px-2 py-2">Un.</th>
                            <th className="text-right px-2 py-2">Qtd</th>
                            <th className="text-left px-2 py-2 min-w-32">Etapa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {servicosExtraidos.map((s, idx) => (
                            <tr key={idx} className={`transition-colors ${s.selecionado ? 'bg-white' : 'bg-gray-50 opacity-50'}`}>
                              <td className="px-3 py-2.5">
                                <button onClick={() => toggleSelecao(idx)} className="text-primary-600">
                                  {s.selecionado ? <CheckSquare size={15} /> : <Square size={15} />}
                                </button>
                              </td>
                              <td className="px-3 py-2.5 text-gray-800">
                                <div>{s.descricao}</div>
                                {s.observacao && <div className="text-xs text-gray-400">{s.observacao}</div>}
                              </td>
                              <td className="px-2 py-2.5 text-center text-gray-500">{s.unidade}</td>
                              <td className="px-2 py-2.5 text-right text-gray-700">
                                {Number(s.quantidade).toLocaleString('pt-BR')}
                              </td>
                              <td className="px-2 py-2.5">
                                {etapas.length > 0 ? (
                                  <select
                                    className="input py-1 text-xs"
                                    value={s.etapa_id_destino || ''}
                                    onChange={e => alterarEtapaDestino(idx, e.target.value)}
                                  >
                                    <option value="">— selecionar —</option>
                                    {etapas.map(et => <option key={et.id} value={et.id}>{et.nome}</option>)}
                                  </select>
                                ) : (
                                  <span className="text-xs text-gray-400">{s.etapa_sugerida}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {etapas.length === 0 && (
                      <div className="flex items-start gap-2 text-amber-600 bg-amber-50 rounded-lg p-3 text-sm">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>Crie etapas no orçamento primeiro para poder importar os serviços.</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button className="btn flex-1" onClick={() => { setServicosExtraidos([]); setPdfFile(null) }}>
                        ← Trocar PDF
                      </button>
                      <button className="btn btn-primary flex-1" onClick={importarSelecionados}
                        disabled={selecionadosCount === 0 || etapas.length === 0 || importando}>
                        {importando ? (
                          <><Loader2 size={14} className="animate-spin" /> Importando...</>
                        ) : (
                          <>Importar {selecionadosCount} serviço{selecionadosCount !== 1 ? 's' : ''}</>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lista de etapas */}
        {etapas.length === 0 ? (
          <div className="text-center py-24">
            <Layers size={40} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 mb-2">Nenhuma etapa cadastrada ainda</p>
            <button className="btn btn-primary" onClick={() => setShowNovaEtapa(true)}>
              <Plus size={14} /> Criar primeira etapa
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {etapas.map((etapa, idx) => {
              const servicosEtapa = servicos.filter(s => s.etapa_id === etapa.id)
              const aberta = etapasAbertas[etapa.id] !== false
              const totalEt = totalEtapa(etapa.id)
              const pct = totalSemBdi > 0 ? ((totalEt / totalSemBdi) * 100).toFixed(1) : '0.0'

              return (
                <div key={etapa.id} className="card overflow-hidden">
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleEtapa(etapa.id)}>
                    <div className="flex items-center gap-3">
                      {aberta ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                      <span className="text-xs font-medium text-gray-400 w-6">{String(idx + 1).padStart(2, '0')}</span>
                      <h3 className="font-medium text-gray-900">{etapa.nome}</h3>
                      <span className="text-xs text-gray-400">{servicosEtapa.length} serviço{servicosEtapa.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-gray-900">{fmt(totalEt)}</p>
                        <p className="text-xs text-gray-400">{pct}% do total</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); excluirEtapa(etapa.id) }}
                        className="btn btn-sm btn-danger opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {aberta && (
                    <div className="border-t border-gray-100">
                      {servicosEtapa.length > 0 && (
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                            <tr>
                              <th className="text-left px-4 py-2">Descrição</th>
                              <th className="text-center px-2 py-2 hidden sm:table-cell">SINAPI</th>
                              <th className="text-center px-2 py-2">Un.</th>
                              <th className="text-right px-2 py-2">Qtd</th>
                              <th className="text-right px-2 py-2">P. Unit.</th>
                              <th className="text-right px-4 py-2">Total</th>
                              <th className="w-8"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {servicosEtapa.map(servico => (
                              <tr key={servico.id} className="hover:bg-gray-50 group">
                                <td className="px-4 py-3 text-gray-800">{servico.descricao}</td>
                                <td className="px-2 py-3 text-center text-gray-400 text-xs hidden sm:table-cell">
                                  {servico.codigo_sinapi || '—'}
                                </td>
                                <td className="px-2 py-3 text-center text-gray-500">{servico.unidade}</td>
                                <td className="px-2 py-3 text-right text-gray-700">
                                  {Number(servico.quantidade).toLocaleString('pt-BR')}
                                </td>
                                <td className="px-2 py-3 text-right text-gray-700">
                                  {Number(servico.preco_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-gray-900">
                                  {fmt(servico.preco_total || 0)}
                                </td>
                                <td className="pr-2">
                                  <button onClick={() => excluirServico(servico.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1">
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {showNovoServico === etapa.id ? (
                        <div className="p-4 bg-gray-50 border-t border-gray-100">
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-3">
                            <div className="col-span-2 md:col-span-2">
                              <label className="label">Descrição *</label>
                              <input className="input" placeholder="Descrição do serviço"
                                value={formServico.descricao}
                                onChange={e => setFormServico({ ...formServico, descricao: e.target.value })} autoFocus />
                            </div>
                            <div>
                              <label className="label">SINAPI</label>
                              <input className="input" placeholder="Opcional"
                                value={formServico.codigo_sinapi}
                                onChange={e => setFormServico({ ...formServico, codigo_sinapi: e.target.value })} />
                            </div>
                            <div>
                              <label className="label">Unidade</label>
                              <input className="input" placeholder="m²"
                                value={formServico.unidade}
                                onChange={e => setFormServico({ ...formServico, unidade: e.target.value })} />
                            </div>
                            <div>
                              <label className="label">Quantidade</label>
                              <input className="input" type="number" placeholder="0"
                                value={formServico.quantidade}
                                onChange={e => setFormServico({ ...formServico, quantidade: e.target.value })} />
                            </div>
                            <div>
                              <label className="label">Preço unit. (R$)</label>
                              <input className="input" type="number" placeholder="0,00"
                                value={formServico.preco_unitario}
                                onChange={e => setFormServico({ ...formServico, preco_unitario: e.target.value })} />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button className="btn btn-sm" onClick={() => setShowNovoServico(null)}>Cancelar</button>
                            <button className="btn btn-sm btn-primary" onClick={() => criarServico(etapa.id)} disabled={savingServico}>
                              {savingServico ? 'Salvando...' : 'Adicionar serviço'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 border-t border-gray-50">
                          <button
                            onClick={() => { setShowNovoServico(etapa.id); setFormServico({ descricao: '', unidade: 'm²', quantidade: '', preco_unitario: '', codigo_sinapi: '' }) }}
                            className="btn btn-sm w-full text-gray-400 hover:text-primary-600">
                            <Plus size={13} /> Adicionar serviço
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Rodapé com totais */}
            <div className="card p-5 bg-gray-900 text-white mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Resumo do orçamento</p>
                  <p className="text-sm text-gray-300">{obra.nome}</p>
                </div>
                <div className="flex gap-8 text-right">
                  <div>
                    <p className="text-xs text-gray-400">Subtotal</p>
                    <p className="font-semibold">{fmt(totalSemBdi)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">BDI ({obra.bdi}%)</p>
                    <p className="font-semibold">{fmt(totalComBdi - totalSemBdi)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-400">Total geral</p>
                    <p className="text-xl font-bold text-green-400">{fmt(totalComBdi)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}