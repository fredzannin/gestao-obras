'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Building2, MapPin, TrendingUp, Clock, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Obra } from '@/types/database'
import { formatCurrency, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'

export default function HomePage() {
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', local: '', descricao: '', bdi: '25' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { carregarObras() }, [])

  async function carregarObras() {
    setLoading(true)
    const { data } = await supabase.from('obras').select('*').order('created_at', { ascending: false })
    setObras(data || [])
    setLoading(false)
  }

  async function criarObra() {
    if (!form.nome.trim()) return
    setSaving(true)
    await supabase.from('obras').insert({
      nome: form.nome,
      local: form.local || 'Rio Branco/AC',
      descricao: form.descricao,
      bdi: parseFloat(form.bdi) || 25,
      status: 'planejamento',
    })
    setForm({ nome: '', local: '', descricao: '', bdi: '25' })
    setShowForm(false)
    setSaving(false)
    carregarObras()
  }

  async function excluirObra(id: string, nome: string) {
    if (!confirm(`Excluir a obra "${nome}" e todos os seus dados? Esta ação não pode ser desfeita.`)) return
    await supabase.from('servicos').delete().eq('obra_id', id)
    await supabase.from('etapas').delete().eq('obra_id', id)
    await supabase.from('obras').delete().eq('id', id)
    carregarObras()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-400 flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">Gestão de Obras</h1>
              <p className="text-xs text-gray-400">Sistema de orçamento</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus size={14} /> Nova obra
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total de obras', value: obras.length, icon: Building2 },
            { label: 'Em andamento', value: obras.filter(o => o.status === 'em_andamento').length, icon: TrendingUp },
            { label: 'Planejamento', value: obras.filter(o => o.status === 'planejamento').length, icon: Clock },
            { label: 'Concluídas', value: obras.filter(o => o.status === 'concluida').length, icon: Building2 },
          ].map((s, i) => (
            <div key={i} className="card p-4">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Nova obra</h2>
              <div className="space-y-3">
                <div>
                  <label className="label">Nome da obra *</label>
                  <input className="input" placeholder="Ex: Residência Unifamiliar - Bairro X"
                    value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div>
                  <label className="label">Local</label>
                  <input className="input" placeholder="Rio Branco/AC"
                    value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} />
                </div>
                <div>
                  <label className="label">Descrição (opcional)</label>
                  <textarea className="input h-20 resize-none" placeholder="Descrição breve da obra..."
                    value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
                </div>
                <div>
                  <label className="label">BDI global (%)</label>
                  <input className="input" type="number" min="0" max="100" step="0.5"
                    value={form.bdi} onChange={e => setForm({ ...form, bdi: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button className="btn flex-1" onClick={() => setShowForm(false)}>Cancelar</button>
                <button className="btn btn-primary flex-1" onClick={criarObra} disabled={saving}>
                  {saving ? 'Salvando...' : 'Criar obra'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-16">Carregando obras...</div>
        ) : obras.length === 0 ? (
          <div className="text-center py-24">
            <Building2 size={40} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 mb-2">Nenhuma obra cadastrada ainda</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Criar primeira obra
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {obras.map(obra => (
              <div key={obra.id} className="card p-5 hover:shadow-md transition-shadow relative group">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); excluirObra(obra.id, obra.nome) }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity btn btn-sm btn-danger z-10"
                  title="Excluir obra">
                  <Trash2 size={12} />
                </button>
                <Link href={`/obras/${obra.id}/orcamento`} className="block">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                      <Building2 size={18} className="text-primary-600" />
                    </div>
                    <span className={`badge ${STATUS_COLORS[obra.status]}`}>
                      {STATUS_LABELS[obra.status]}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{obra.nome}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                    <MapPin size={11} /> {obra.local}
                  </div>
                  <div className="border-t border-gray-50 pt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">BDI: {obra.bdi}%</span>
                    <span className="text-xs font-medium text-primary-600">Ver orçamento →</span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}




