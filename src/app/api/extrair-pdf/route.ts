import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60 // Vercel max timeout (segundos)

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Arquivo deve ser um PDF' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF muito grande (máx. 10MB)' }, { status: 400 })
    }

    // Converte para base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text: `Você é um engenheiro civil especialista em orçamentos de obras.

Analise este projeto arquitetônico ou complementar em PDF e extraia TODOS os quantitativos de serviços que conseguir identificar.

Para cada serviço identificado, retorne um objeto JSON com:
- descricao: nome do serviço (string)
- unidade: unidade de medida (m², m³, m, un, kg, vb, etc.)
- quantidade: valor numérico (number)
- etapa_sugerida: etapa da obra onde se encaixa (string, ex: "Fundação", "Alvenaria", "Cobertura", "Instalações Elétricas", "Instalações Hidráulicas", "Revestimentos", "Esquadrias", etc.)
- observacao: observação adicional se houver (string ou null)

Responda APENAS com um JSON válido, sem texto adicional, sem markdown, sem backticks:
{
  "servicos": [
    {
      "descricao": "string",
      "unidade": "string",
      "quantidade": number,
      "etapa_sugerida": "string",
      "observacao": "string ou null"
    }
  ],
  "resumo": "breve resumo do que foi encontrado no documento (string)"
}

Se não conseguir identificar quantitativos, retorne:
{"servicos": [], "resumo": "Documento não contém quantitativos identificáveis"}`,
            },
          ],
        },
      ],
    })

    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'Resposta inválida da IA' }, { status: 500 })
    }

    try {
      const resultado = JSON.parse(textContent.text)
      return NextResponse.json(resultado)
    } catch {
      // Tenta extrair JSON caso venha com texto extra
      const match = textContent.text.match(/\{[\s\S]*\}/)
      if (match) {
        const resultado = JSON.parse(match[0])
        return NextResponse.json(resultado)
      }
      return NextResponse.json({ error: 'Erro ao processar resposta da IA' }, { status: 500 })
    }
  } catch (error: unknown) {
    console.error('Erro na extração do PDF:', error)
    const msg = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}