import { prisma } from '../config/prisma'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'

interface AtivoAnalysis {
  description: string
  usageType: string
  compatibleForms: string
  category: string
  concentrationMin: string
  concentrationMax: string
  contraindications: string
  technicalNotes: string
}

const ANALYSIS_PROMPT = `Você é um farmacêutico especialista em ativos para formulações magistrais.
Analise o texto extraído de um PDF sobre um ativo farmacêutico e retorne APENAS um JSON válido (sem markdown, sem backticks) com os seguintes campos:

{
  "description": "Resumo conciso do ativo: o que é, para que serve, principais propriedades (máximo 3 frases)",
  "usageType": "Via de administração principal. Valores possíveis: Tópico, Oral, Injetável, Tópico/Oral, Tópico/Injetável, Oral/Injetável",
  "compatibleForms": "Formas farmacêuticas compatíveis separadas por vírgula. Ex: Creme, Gel, Sérum, Loção, Cápsula, Comprimido, Solução",
  "category": "Categoria principal do ativo. Ex: Despigmentante, Antioxidante, Hidratante, Anti-aging, Ácido, Vitamina, Peptídeo, Protetor Solar, Anti-inflamatório, Antimicrobiano, Cicatrizante, Tensor, Clareador, Esfoliante, Nutritivo",
  "concentrationMin": "Concentração mínima usual (ex: 0.5%)",
  "concentrationMax": "Concentração máxima usual (ex: 5%)",
  "contraindications": "Contraindicações conhecidas (gestantes, pele sensível, etc). Se não houver info, escreva 'Não informado'",
  "technicalNotes": "Notas técnicas: pH ideal, incompatibilidades, estabilidade, fotossensibilidade, armazenamento. Se não houver info, escreva 'Não informado'"
}

REGRAS:
- Retorne SOMENTE o JSON, sem nenhum texto antes ou depois
- Não use markdown ou backticks
- Preencha com base APENAS nas informações do PDF
- Se não encontrar a informação, use "Não informado"
- Concentrações devem incluir o símbolo %`

async function getAiSettings() {
  let settings = await prisma.aiSettings.findFirst()
  if (!settings) {
    settings = await prisma.aiSettings.create({ data: {} })
  }
  return settings
}

async function analyzeWithOpenAI(text: string, apiKey: string, model: string): Promise<string> {
  const openai = new OpenAI({ apiKey })
  const response = await openai.chat.completions.create({
    model: model || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: ANALYSIS_PROMPT },
      { role: 'user', content: `Analise este texto sobre um ativo farmacêutico:\n\n${text}` },
    ],
    temperature: 0.3,
    max_tokens: 1500,
  })
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
    category: '',
    concentrationMin: '',
    concentrationMax: '',
    contraindications: '',
    technicalNotes: '',
  }

  try {
    const parsed = JSON.parse(cleaned)
    return {
      description: parsed.description || defaults.description,
      usageType: parsed.usageType || defaults.usageType,
      compatibleForms: parsed.compatibleForms || defaults.compatibleForms,
      category: parsed.category || defaults.category,
      concentrationMin: parsed.concentrationMin || defaults.concentrationMin,
      concentrationMax: parsed.concentrationMax || defaults.concentrationMax,
      contraindications: parsed.contraindications || defaults.contraindications,
      technicalNotes: parsed.technicalNotes || defaults.technicalNotes,
    }
  } catch {
    return defaults
  }
}

export async function analyzePdfBuffer(buffer: Buffer): Promise<AtivoAnalysis | null> {
  const settings = await getAiSettings()
  if (!settings.apiKey) return null

  const pdfData = await pdfParse(buffer)
  const text = pdfData.text

  if (!text || text.trim().length === 0) return null

  const truncated = text.slice(0, 8000)

  let rawResponse: string

  switch (settings.provider) {
    case 'OPENAI':
      rawResponse = await analyzeWithOpenAI(truncated, settings.apiKey, settings.model)
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

export async function analyzePdfContent(ativoId: string): Promise<AtivoAnalysis | null> {
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
      rawResponse = await analyzeWithOpenAI(truncated, settings.apiKey, settings.model)
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
      category: analysis.category,
      concentrationMin: analysis.concentrationMin,
      concentrationMax: analysis.concentrationMax,
      contraindications: analysis.contraindications,
      technicalNotes: analysis.technicalNotes,
    },
  })

  return analysis
}
