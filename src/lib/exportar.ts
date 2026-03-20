import type { EtapaComServicos, Obra } from '@/types/database'
import { formatCurrency, formatNumber, calcularTotalComBDI } from './utils'

export async function exportarExcel(obra: Obra, etapas: EtapaComServicos[]) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  // Aba: Resumo
  const custoDireto = etapas.reduce((s, e) => s + e.total, 0)
  const totalComBdi = calcularTotalComBDI(custoDireto, obra.bdi)
  const resumoData = [
    ['ORÇAMENTO DE OBRA', ''],
    ['Obra:', obra.nome],
    ['Local:', obra.local],
    ['Status:', obra.status],
    ['BDI:', `${obra.bdi}%`],
    ['', ''],
    ['Custo Direto (sem BDI):', formatCurrency(custoDireto)],
    [`BDI (${obra.bdi}%):`, formatCurrency(custoDireto * (obra.bdi / 100))],
    ['TOTAL COM BDI:', formatCurrency(totalComBdi)],
  ]
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData)
  wsResumo['!cols'] = [{ wch: 30 }, { wch: 25 }]
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

  // Aba: Orçamento Detalhado
  const header = ['Etapa', 'Código', 'Base', 'Descrição', 'Unid.', 'Quantidade', 'Preço Unit.', 'Total']
  const rows: (string | number)[][] = [header]
  etapas.forEach(et => {
    et.servicos.forEach(sv => {
      rows.push([
        et.nome,
        sv.codigo,
        sv.tipo_base.toUpperCase(),
        sv.descricao,
        sv.unidade,
        sv.quantidade,
        sv.preco_unitario,
        sv.quantidade * sv.preco_unitario,
      ])
    })
    rows.push(['', '', '', `SUBTOTAL — ${et.nome}`, '', '', '', et.total])
    rows.push(['', '', '', '', '', '', '', ''])
  })
  rows.push(['', '', '', 'CUSTO DIRETO TOTAL', '', '', '', custoDireto])
  rows.push(['', '', '', `BDI (${obra.bdi}%)`, '', '', '', custoDireto * (obra.bdi / 100)])
  rows.push(['', '', '', 'TOTAL COM BDI', '', '', '', totalComBdi])

  const wsOrc = XLSX.utils.aoa_to_sheet(rows)
  wsOrc['!cols'] = [
    { wch: 22 }, { wch: 12 }, { wch: 8 }, { wch: 40 },
    { wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 16 },
  ]
  XLSX.utils.book_append_sheet(wb, wsOrc, 'Orçamento Detalhado')

  XLSX.writeFile(wb, `Orcamento_${obra.nome.replace(/\s+/g, '_')}.xlsx`)
}

export async function exportarPDF(obra: Obra, etapas: EtapaComServicos[]) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const custoDireto = etapas.reduce((s, e) => s + e.total, 0)
  const totalComBdi = calcularTotalComBDI(custoDireto, obra.bdi)

  // Cabeçalho
  doc.setFontSize(16)
  doc.setTextColor(8, 80, 65)
  doc.text('Orçamento de Obra', 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text(`Obra: ${obra.nome}   |   Local: ${obra.local}   |   BDI: ${obra.bdi}%`, 14, 26)

  // Tabela
  const body: (string | number)[][] = []
  etapas.forEach(et => {
    et.servicos.forEach(sv => {
      body.push([
        et.nome,
        sv.codigo,
        sv.tipo_base.toUpperCase(),
        sv.descricao,
        sv.unidade,
        formatNumber(sv.quantidade),
        formatCurrency(sv.preco_unitario),
        formatCurrency(sv.quantidade * sv.preco_unitario),
      ])
    })
    body.push(['', '', '', `Subtotal — ${et.nome}`, '', '', '', formatCurrency(et.total)])
  })

  autoTable(doc, {
    startY: 32,
    head: [['Etapa', 'Código', 'Base', 'Descrição', 'Unid.', 'Qtd.', 'Preço Unit.', 'Total']],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [29, 158, 117], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 30 }, 1: { cellWidth: 20 }, 2: { cellWidth: 14 },
      3: { cellWidth: 70 }, 4: { cellWidth: 12 }, 5: { cellWidth: 20 },
      6: { cellWidth: 28 }, 7: { cellWidth: 28 },
    },
  })

  // Rodapé de totais
  const finalY = (doc as any).lastAutoTable.finalY + 6
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text(`Custo Direto: ${formatCurrency(custoDireto)}`, 14, finalY)
  doc.text(`BDI (${obra.bdi}%): ${formatCurrency(custoDireto * (obra.bdi / 100))}`, 100, finalY)
  doc.setFontSize(11)
  doc.setTextColor(8, 80, 65)
  doc.text(`TOTAL COM BDI: ${formatCurrency(totalComBdi)}`, 190, finalY)

  doc.save(`Orcamento_${obra.nome.replace(/\s+/g, '_')}.pdf`)
}
