export const maxDuration = 60
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File

    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':  process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: `Você é um especialista em orçamento de obras. Analise este documento e extraia TODOS os serviços, quantitativos e especificações encontrados.\n\nRetorne APENAS um JSON válido, sem texto antes ou depois, neste formato exato:\n{\n  "titulo": "nome do projeto ou documento",\n  "etapas": [\n    {\n      "nome": "nome da etapa (ex: Fundações, Estrutura, Acabamento...)",\n      "servicos": [\n        {\n          "descricao": "descrição do serviço",\n          "unidade": "unidade de medida (m², m³, kg, m, un, vb...)",\n          "quantidade": 0.00,\n          "codigo": "código SINAPI ou SICRO se mencionado, senão vazio",\n          "tipo_base": "sinapi ou sicro ou propria"\n        }\n      ]\n    }\n  ]\n}\n\nRegras:\n- Agrupe os serviços por etapas lógicas de construção\n- Se não houver quantidade explícita, estime com base no contexto ou coloque 0\n- Extraia TODOS os itens encontrados, sem omitir nenhum\n- Se for memorial descritivo, crie os serviços baseado nas especificações\n- Unidades: use sempre abreviações padrão (m², m³, kg, m, un, vb, cj)` }
          ]
        }]
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      return NextResponse.json({ error: err.error?.message || 'Erro na API' }, { status: 500 })
    }

    const data = await response.json()
    const text = data.content[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Não foi possível extrair dados do PDF' }, { status: 500 })

    return NextResponse.json(JSON.parse(jsonMatch[0]))
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro interno' }, { status: 500 })
  }
}