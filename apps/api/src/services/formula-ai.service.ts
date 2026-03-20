import { prisma } from '../config/prisma'
import OpenAI from 'openai'
import { recordAiUsage } from './ai-usage.service'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface FormulaModificationInput {
  formula: { name: string; composition: string; instructions: string }
  userRequest: string
  userProfession: string
  patientContext: string
  /** Quem disparou a chamada (para métricas por usuário). */
  userId?: string
}

interface FormulaModificationResult {
  title: string
  composition: string
  instructions: string
}

function buildFormulaPrompt(input: FormulaModificationInput): string {
  return `Você é um farmacêutico magistral especialista em prescrições dermatológicas.

## Profissão do Prescritor
${input.userProfession}
${input.patientContext}

## Fórmula Base
**Nome:** ${input.formula.name}

**Composição:**
${input.formula.composition}

**Modo de Uso:**
${input.formula.instructions}

## Solicitação de Alteração
${input.userRequest}

## Instruções de Resposta
Modifique a fórmula base conforme a solicitação. Responda EXATAMENTE no formato JSON abaixo, sem nenhum texto adicional fora do JSON:
{
  "title": "Nome sugerido para a nova fórmula",
  "composition": "Composição completa ajustada com ativos, concentrações e base",
  "instructions": "Modo de uso ajustado"
}

Mantenha a fórmula segura, tecnicamente viável e adequada para manipulação magistral.`
}

function parseAiResponse(raw: string): FormulaModificationResult {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Resposta da IA não contém JSON válido')

  const parsed = JSON.parse(jsonMatch[0])
  if (!parsed.title || !parsed.composition || !parsed.instructions) {
    throw new Error('Resposta da IA incompleta')
  }
  return parsed
}

export async function processFormulaModification(
  input: FormulaModificationInput
): Promise<FormulaModificationResult> {
  const settings = await prisma.aiSettings.findFirst()
  if (!settings?.apiKey) {
    throw new Error('API Key não configurada. Peça ao administrador para configurar nas Configurações de IA.')
  }

  const prompt = buildFormulaPrompt(input)

  let raw: string

  switch (settings.provider) {
    case 'OPENAI': {
      const m = settings.model || 'gpt-4o-mini'
      const openai = new OpenAI({ apiKey: settings.apiKey })
      const res = await openai.chat.completions.create({
        model: m,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      })
      raw = res.choices[0]?.message?.content || ''
      const u = res.usage
      if (u) {
        recordAiUsage({
          provider: 'OPENAI',
          source: 'FORMULA_AI',
          model: m,
          promptTokens: u.prompt_tokens ?? 0,
          completionTokens: u.completion_tokens ?? 0,
          userId: input.userId,
        }).catch((err) => console.error('[ai-usage]', err))
      }
      break
    }
    case 'CLAUDE': {
      const anthropic = new Anthropic({ apiKey: settings.apiKey })
      const res = await anthropic.messages.create({
        model: settings.model || 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      })
      const block = res.content[0]
      raw = block.type === 'text' ? block.text : ''
      break
    }
    case 'GEMINI': {
      const genAI = new GoogleGenerativeAI(settings.apiKey)
      const model = genAI.getGenerativeModel({ model: settings.model || 'gemini-1.5-flash' })
      const result = await model.generateContent(prompt)
      raw = result.response.text()
      break
    }
    default:
      throw new Error(`Provedor ${settings.provider} não suportado`)
  }

  return parseAiResponse(raw)
}
