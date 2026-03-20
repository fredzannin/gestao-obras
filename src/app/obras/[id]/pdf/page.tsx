'use client'

import { useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, FileText, CheckCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ServicoExtrado {
  descricao: string; unidade: string; quantidade: number
  codigo: string; tipo_base: 'sinapi'|'sicro'|'propria'; selecionado: boolean
}
interface EtapaExtraida { nome: string; servicos: ServicoExtrado[]; selecionada: boolean }
interface ResultadoExtracao { titulo: string; etapas: EtapaExtraida[] }

export default function LeitorPDFPage() {
  const params = useParams()
  const obraId = params.id as string
  const inputRef = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File|null>(null)
  const [etapa, setEtapa] = useState<'upload'|'processando'|'revisao'|'importando'|'concluido'>('upload')
  const [resultado, setResultado] = useState<ResultadoExtracao|null>(null)
  const [erro, setErro] = useState('')

  const handleFile = (f: File) => {
    if (f.type !== 'application/pdf') { setErro('Envie apenas arquivos PDF.'); return }
    if (f.size > 20*1024*1024) { setErro('Arquivo muito grande. Máximo 20MB.'); return }
    setArquivo(f); setErro('')
  }

  const processar = async () => {
    if (!arquivo) return
    setEtapa('processando'); setErro('')
    try {
      const form = new FormData()
      form.append('pdf', arquivo)
      const res = await fetch('/api/extrair-pdf', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao processar')
      setResultado({ titulo: data.titulo, etapas: data.etapas.map((et: any) => ({
        ...et, selecionada: true, servicos: et.servicos.map((sv: any) => ({ ...sv, selecionado: true }))
      }))})
      setEtapa('revisao')
    } catch (e: any) { setErro(e.message); setEtapa('upload') }
  }

  const toggleEtapa = (i: number) => {
    if (!resultado) return
    const etapas = [...resultado.etapas]
    etapas[i].selecionada = !etapas[i].selecionada
    etapas[i].servicos = etapas[i].servicos.map(s => ({ ...s, selecionado: etapas[i].selecionada }))
    setResultado({ ...resultado, etapas })
  }

  const toggleServico = (ei: number, si: number) => {
    if (!resultado) return
    const etapas = [...resultado.etapas]
    etapas[ei].servicos[si].selecionado = !etapas[ei].servicos[si].selecionado
    setResultado({ ...resultado, etapas })
  }

  const updateServico = (ei: number, si: number, campo: string, valor: string|number) => {
    if (!resultado) return
    const etapas = [...resultado.etapas]
    ;(etapas[ei].servicos[si] as any)[campo] = valor
    setResultado({ ...resultado, etapas })
  }

  const importar = async () => {
    if (!resultado) return
    setEtapa('importando')
    try {
      const etapasSelecionadas = resultado.etapas.filter(e => e.selecionada && e.servicos.some(s => s.selecionado))
      const { data: existentes } = await supabase.from('etapas').select('ordem').eq('obra_id', obraId).order('ordem', { ascending: false }).limit(1)
      let ordemBase = existentes?.[0]?.ordem || 0
      for (const et of etapasSelecionadas) {
        ordemBase++
        const { data: etapaCriada } = await supabase.from('etapas').insert({ obra_id: obraId, nome: et.nome, ordem: ordemBase }).select().single()
        if (!etapaCriada) continue
        for (const sv of et.servicos.filter(s => s.selecionado)) {
          await supabase.from('servicos').insert({ etapa_id: etapaCriada.id, obra_id: obraId, codigo: sv.codigo||'', tipo_base: sv.tipo_base||'propria', descricao: sv.descricao, unidade: sv.unidade, quantidade: sv.quantidade||0, preco_unitario: 0 })
        }
      }
      setEtapa('concluido')
    } catch (e: any) { setErro(e.message); setEtapa('revisao') }
  }

  const totalSelecionados = resultado?.etapas.reduce((s,e) => s+e.servicos.filter(sv=>sv.selecionado).length, 0)||0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href={`/obras/${obraId}/orcamento`} className="btn btn-sm"><ArrowLeft size={14}/></Link>
          <div>
            <h1 className="font-semibold text-sm text-gray-900">Leitor de PDF com IA</h1>
            <p className="text-xs text-gray-400">Extração automática de quantitativos</p>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">

        {etapa==='upload' && (
          <div className="card p-8 text-center max-w-xl mx-auto">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 hover:border-primary-400 transition-colors cursor-pointer"
              onClick={()=>inputRef.current?.click()}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f)}}>
              <FileText size={40} className="mx-auto text-gray-300 mb-4"/>
              {arquivo ? (
                <div><p className="font-medium text-gray-900 mb-1">{arquivo.name}</p><p className="text-sm text-gray-400">{(arquivo.size/1024/1024).toFixed(2)} MB</p></div>
              ) : (
                <div><p className="font-medium text-gray-700 mb-1">Arraste o PDF aqui</p><p className="text-sm text-gray-400">ou clique para selecionar</p><p className="text-xs text-gray-300 mt-2">Plantas, memoriais, planilhas — até 20MB</p></div>
              )}
            </div>
            <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f)}}/>
            {erro && <p className="text-sm text-red-500 mt-3">{erro}</p>}
            {arquivo && <button className="btn btn-primary w-full mt-4" onClick={processar}><Upload size={14}/> Analisar com IA</button>}
          </div>
        )}

        {etapa==='processando' && (
          <div className="card p-12 text-center max-w-xl mx-auto">
            <Loader2 size={40} className="mx-auto text-primary-400 mb-4 animate-spin"/>
            <p className="font-medium text-gray-900 mb-2">Analisando documento...</p>
            <p className="text-sm text-gray-400">Pode levar 30–60 segundos</p>
          </div>
        )}

        {etapa==='revisao' && resultado && (
          <div>
            <div className="card p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
              <div><p className="font-medium text-gray-900">{resultado.titulo}</p><p className="text-sm text-gray-400">{totalSelecionados} serviços selecionados</p></div>
              <div className="flex gap-2">
                <button className="btn btn-sm" onClick={()=>{setEtapa('upload');setArquivo(null)}}>Novo PDF</button>
                <button className="btn btn-primary btn-sm" onClick={importar} disabled={totalSelecionados===0}>Importar {totalSelecionados} serviços</button>
              </div>
            </div>
            {erro && <p className="text-sm text-red-500 mb-3">{erro}</p>}
            <div className="space-y-3">
              {resultado.etapas.map((et,ei)=>(
                <div key={ei} className="card overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <input type="checkbox" checked={et.selecionada} onChange={()=>toggleEtapa(ei)} className="w-4 h-4 accent-primary-400"/>
                    <span className="font-medium text-sm flex-1">{et.nome}</span>
                    <span className="text-xs text-gray-400">{et.servicos.filter(s=>s.selecionado).length} serviços</span>
                  </div>
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-gray-50">
                      <th className="w-8 px-3 py-2"></th>
                      <th className="text-left px-3 py-2 text-gray-400 font-medium">Descrição</th>
                      <th className="text-left px-2 py-2 text-gray-400 font-medium w-16">Unid.</th>
                      <th className="text-right px-2 py-2 text-gray-400 font-medium w-24">Quantidade</th>
                      <th className="text-left px-2 py-2 text-gray-400 font-medium w-20">Base</th>
                      <th className="text-left px-2 py-2 text-gray-400 font-medium w-24">Código</th>
                    </tr></thead>
                    <tbody>
                      {et.servicos.map((sv,si)=>(
                        <tr key={si} className={`border-b border-gray-50 ${!sv.selecionado?'opacity-40':''}`}>
                          <td className="px-3 py-2"><input type="checkbox" checked={sv.selecionado} onChange={()=>toggleServico(ei,si)} className="w-3.5 h-3.5 accent-primary-400"/></td>
                          <td className="px-3 py-2"><input className="input text-xs py-1" value={sv.descricao} onChange={e=>updateServico(ei,si,'descricao',e.target.value)}/></td>
                          <td className="px-2 py-2"><input className="input text-xs py-1 text-center" value={sv.unidade} onChange={e=>updateServico(ei,si,'unidade',e.target.value)}/></td>
                          <td className="px-2 py-2"><input className="input text-xs py-1 text-right" type="number" value={sv.quantidade} onChange={e=>updateServico(ei,si,'quantidade',parseFloat(e.target.value)||0)}/></td>
                          <td className="px-2 py-2"><select className="input text-xs py-1" value={sv.tipo_base} onChange={e=>updateServico(ei,si,'tipo_base',e.target.value)}><option value="sinapi">SINAPI</option><option value="sicro">SICRO</option><option value="propria">Própria</option></select></td>
                          <td className="px-2 py-2"><input className="input text-xs py-1" value={sv.codigo} placeholder="opcional" onChange={e=>updateServico(ei,si,'codigo',e.target.value)}/></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {etapa==='importando' && (
          <div className="card p-12 text-center max-w-xl mx-auto">
            <Loader2 size={40} className="mx-auto text-primary-400 mb-4 animate-spin"/>
            <p className="font-medium text-gray-900">Importando serviços...</p>
          </div>
        )}

        {etapa==='concluido' && (
          <div className="card p-12 text-center max-w-xl mx-auto">
            <CheckCircle size={48} className="mx-auto text-primary-400 mb-4"/>
            <p className="font-semibold text-gray-900 text-lg mb-2">Importação concluída!</p>
            <p className="text-sm text-gray-400 mb-6">{totalSelecionados} serviços adicionados ao orçamento.</p>
            <div className="flex gap-3 justify-center">
              <button className="btn" onClick={()=>{setEtapa('upload');setArquivo(null);setResultado(null)}}>Importar outro PDF</button>
              <Link href={`/obras/${obraId}/orcamento`} className="btn btn-primary">Ver orçamento</Link>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}