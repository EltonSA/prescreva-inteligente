import { prisma } from '../config/prisma'
import type { AtivoUsageGroup } from '@prisma/client'
import OpenAI from 'openai'
import { recordAiUsage } from './ai-usage.service'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'

interface AtivoAnalysis {
  description: string
  /** Escopo “pai” alinhado ao cadastro do sistema (quando a IA conseguir inferir). */
  usageScope?: AtivoUsageGroup
  /** Detalhe da via; deve ser coerente com usageScope quando este existir. */
  usageType: string
  compatibleForms: string
  concentrationMin: string
  concentrationMax: string
  contraindications: string
  technicalNotes: string
}

function normalizeUsageScopeFromAnalysis(raw: unknown): AtivoUsageGroup | undefined {
  if (raw == null) return undefined
  const t = String(raw).trim()
  if (!t || /^n[aã]o\s+informad/i.test(t)) return undefined
  const u = t.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (u === 'EXTERNO' || u === 'USO_EXTERNO' || u === 'USO EXTERNO') return 'EXTERNO'
  if (u === 'INTERNO' || u === 'USO_INTERNO' || u === 'USO INTERNO') return 'INTERNO'
  if (u === 'AMBOS' || u === 'EXTERNO_E_INTERNO' || u === 'INTERNO_E_EXTERNO') return 'AMBOS'
  if (u.includes('TOPICO') || u.includes('DERMATO') || u.includes('EXTERNA')) return 'EXTERNO'
  if (u.includes('ORAL') || u.includes('SISTEM') || u.includes('INJET')) return 'INTERNO'
  return undefined
}

const ANALYSIS_PROMPT = `Você é um farmacêutico especialista em ativos para formulações magistrais.
Analise o texto extraído de um PDF sobre um ativo farmacêutico e retorne APENAS um JSON válido (sem markdown, sem backticks) com os seguintes campos:

{
  "description": "Resumo conciso do ativo: o que é, para que serve, principais propriedades (máximo 3 frases)",
  "usageScope": "Classificação do escopo principal, EXATAMENTE uma destas strings: EXTERNO, INTERNO ou AMBOS. EXTERNO = uso tópico/dermocosmético/capilar externo ou outra via exclusivamente externa descrita no PDF. INTERNO = oral, injetável sistêmico, suplemento oral, uso que não seja predominantemente tópico externo. AMBOS = o documento deixa claro que o ativo se aplica a vias internas e externas. Se não for possível decidir com segurança, use Não informado",
  "usageType": "Via ou forma mais específica inferida do PDF (ex.: Tópico, Oral, Injetável, combinações como Tópico/Oral). Deve ser coerente com usageScope. Se não houver info, Não informado",
  "compatibleForms": "Formas farmacêuticas compatíveis separadas por vírgula. Ex: Creme, Gel, Sérum, Loção, Cápsula, Comprimido, Solução",
  "concentrationMin": "Concentração mínima usual (ex: 0.5%)",
  "concentrationMax": "Concentração máxima usual (ex: 5%)",
  "contraindications": "Contraindicações conhecidas (gestantes, pele sensível, etc). Se não houver info, escreva 'Não informado'",
  "technicalNotes": "Notas técnicas: pH ideal, incompatibilidades, estabilidade, fotossensibilidade, armazenamento. Se não houver info, escreva 'Não informado'"
}

REGRAS:
- Retorne SOMENTE o JSON, sem nenhum texto antes ou depois
- Não use markdown ou backticks
- Preencha com base APENAS nas informações do PDF
- Se não encontrar a informação, use "Não informado" (exceto usageScope: aí use Não informado só quando não der para classificar o escopo)
- Concentrações devem incluir o símbolo %`

async function getAiSettings() {
  let settings = await prisma.aiSettings.findFirst()
  if (!settings) {
    settings = await prisma.aiSettings.create({ data: {} })
  }
  return settings
}

async function analyzeWithOpenAI(
  text: string,
  apiKey: string,
  model: string,
  userId?: string | null
): Promise<string> {
  const m = model || 'gpt-4o-mini'
  const openai = new OpenAI({ apiKey })
  const response = await openai.chat.completions.create({
    model: m,
    messages: [
      { role: 'system', content: ANALYSIS_PROMPT },
      { role: 'user', content: `Analise este texto sobre um ativo farmacêutico:\n\n${text}` },
    ],
    temperature: 0.3,
    max_tokens: 1500,
  })
  const u = response.usage
  if (u) {
    recordAiUsage({
      provider: 'OPENAI',
      source: 'PDF_ANALYSIS',
      model: m,
      promptTokens: u.prompt_tokens ?? 0,
      completionTokens: u.completion_tokens ?? 0,
      userId,
    }).catch((err) => console.error('[ai-usage]', err))
  }
  return response.choices[0]?.message?.content || '{}'
}

async function analyzeWithClaude(text: string, apiKey: string, model: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey })
  const response = await anthropic.messages.create({
    model: model || 'claude-3-5-sonnet-20241022',
    max_tokens: 1500,
    system: ANALYSIS_PROMPT,
    messages: [{ role: 'user', content: `Analise este texto sobre um ativo farmacêutico:\n\n${text}` }],
  })
  const block = response.content[0]
  return block.type === 'text' ? block.text : '{}'
}

async function analyzeWithGemini(text: string, apiKey: string, model: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const geminiModel = genAI.getGenerativeModel({ model: model || 'gemini-1.5-flash' })
  const result = await geminiModel.generateContent(
    `${ANALYSIS_PROMPT}\n\nAnalise este texto sobre um ativo farmacêutico:\n\n${text}`
  )
  return result.response.text()
}

function parseAnalysisResponse(raw: string): AtivoAnalysis {
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  const defaults: AtivoAnalysis = {
    description: '',
    usageType: '',
    compatibleForms: '',
    concentrationMin: '',
    concentrationMax: '',
    contraindications: '',
    technicalNotes: '',
  }

  try {
    const parsed = JSON.parse(cleaned)
    const usageScope = normalizeUsageScopeFromAnalysis(parsed.usageScope)
    return {
      description: parsed.description || defaults.description,
      ...(usageScope !== undefined ? { usageScope } : {}),
      usageType: parsed.usageType || defaults.usageType,
      compatibleForms: parsed.compatibleForms || defaults.compatibleForms,
      concentrationMin: parsed.concentrationMin || defaults.concentrationMin,
      concentrationMax: parsed.concentrationMax || defaults.concentrationMax,
      contraindications: parsed.contraindications || defaults.contraindications,
      technicalNotes: parsed.technicalNotes || defaults.technicalNotes,
    }
  } catch {
    return defaults
  }
}

export async function analyzePdfBuffer(
  buffer: Buffer,
  userId?: string | null
): Promise<AtivoAnalysis | null> {
  const settings = await getAiSettings()
  if (!settings.apiKey) return null

  const pdfData = await pdfParse(buffer)
  const text = pdfData.text

  if (!text || text.trim().length === 0) return null

  const truncated = text.slice(0, 8000)

  let rawResponse: string

  switch (settings.provider) {
    case 'OPENAI':
      rawResponse = await analyzeWithOpenAI(truncated, settings.apiKey, settings.model, userId)
      break
    case 'CLAUDE':
      rawResponse = await analyzeWithClaude(truncated, settings.apiKey, settings.model)
      break
    case 'GEMINI':
      rawResponse = await analyzeWithGemini(truncated, settings.apiKey, settings.model)
      break
    default:
      return null
  }

  return parseAnalysisResponse(rawResponse)
}

export async function analyzePdfContent(
  ativoId: string,
  userId?: string | null
): Promise<AtivoAnalysis | null> {
  const settings = await getAiSettings()
  if (!settings.apiKey) return null

  const ativo = await prisma.ativo.findUnique({ where: { id: ativoId } })
  if (!ativo || !ativo.filePath) return null

  const fileName = ativo.filePath.split(/[/\\]/).pop() || ativo.filePath
  const PDFS_DIR = path.resolve('uploads', 'pdfs')
  const UPLOADS_DIR = path.resolve('uploads')
  let resolvedPath = path.join(PDFS_DIR, fileName)
  if (!fs.existsSync(resolvedPath)) {
    resolvedPath = path.join(UPLOADS_DIR, fileName)
  }
  if (!fs.existsSync(resolvedPath)) return null

  const fileBuffer = fs.readFileSync(resolvedPath)
  const pdfData = await pdfParse(fileBuffer)
  const text = pdfData.text

  if (!text || text.trim().length === 0) return null

  const truncated = text.slice(0, 8000)

  let rawResponse: string

  switch (settings.provider) {
    case 'OPENAI':
      rawResponse = await analyzeWithOpenAI(truncated, settings.apiKey, settings.model, userId)
      break
    case 'CLAUDE':
      rawResponse = await analyzeWithClaude(truncated, settings.apiKey, settings.model)
      break
    case 'GEMINI':
      rawResponse = await analyzeWithGemini(truncated, settings.apiKey, settings.model)
      break
    default:
      return null
  }

  const analysis = parseAnalysisResponse(rawResponse)

  await prisma.ativo.update({
    where: { id: ativoId },
    data: {
      description: analysis.description || ativo.description,
      usageType: analysis.usageType,
      compatibleForms: analysis.compatibleForms,
      concentrationMin: analysis.concentrationMin,
      concentrationMax: analysis.concentrationMax,
      contraindications: analysis.contraindications,
      technicalNotes: analysis.technicalNotes,
      ...(analysis.usageScope !== undefined
        ? { usageScope: analysis.usageScope, usageTypeItemId: null }
        : {}),
    },
  })

  return analysis
}
