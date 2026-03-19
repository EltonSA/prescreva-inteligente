import { prisma } from '../config/prisma'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatContext {
  patientId: string
  userId: string
  messages: ChatMessage[]
}

interface ReferencedAtivo {
  id: string
  name: string
  fileName?: string | null
}

interface ChatResult {
  response: string
  referencedAtivos: ReferencedAtivo[]
}

async function getAiSettings() {
  let settings = await prisma.aiSettings.findFirst()
  if (!settings) {
    settings = await prisma.aiSettings.create({ data: {} })
  }
  return settings
}

function buildSystemPrompt(
  basePrompt: string,
  profession: string,
  patient: any,
  ragContext: string
): string {
  return `${basePrompt}

## Profissão do Prescriptor
${profession || 'Não informada'}

## Dados do Paciente
- Nome: ${patient.name}
- Idade: ${patient.age} anos
- Sexo: ${patient.sex}
- Tipo de pele: ${patient.skinType || 'Não informado'}
- Fototipo: ${patient.phototype || 'Não informado'}
- Objetivo do tratamento: ${patient.treatmentGoal || 'Não informado'}
- Informações adicionais: ${patient.additionalInfo || 'Nenhuma'}

## Base de Conhecimento (Ativos Disponíveis)
${ragContext || 'Nenhum ativo disponível na base de conhecimento.'}

## Instruções de Resposta
Ao gerar uma fórmula, estruture-a EXATAMENTE neste formato:

### Nome da Formulação

Liste cada ativo em uma lista não ordenada (bullet points), um por linha:
- Ativo 1 e concentração
- Ativo 2 e concentração
- Ativo 3 e concentração
- Base/Veículo q.s.p. quantidade

Modo de uso: instruções claras de aplicação.

Observações: cuidados e contra-indicações, se houver.

IMPORTANTE:
- Sempre use bullet points (- ) para listar os ativos individualmente. Nunca liste em linha ou parágrafo corrido.
- NUNCA use asteriscos duplos (**) para negrito no texto. Escreva tudo em texto simples, sem formatação markdown como ** ou __.
- "Modo de uso:" e "Observações:" devem ser escritos em texto puro, sem ** ao redor.
- SEMPRE priorize e utilize os ativos disponíveis na "Base de Conhecimento" ao montar a fórmula. Eles são os ativos que o profissional tem disponíveis.
- NÃO inclua referências ou menções à base de conhecimento no texto da resposta. As referências serão tratadas automaticamente pelo sistema.

REGRAS CRÍTICAS SOBRE ATIVOS:
- RESPEITE a "Via de uso" de cada ativo. NUNCA use um ativo de uso "Oral" em uma formulação tópica (creme, gel, sérum) e vice-versa.
- RESPEITE as "Formas compatíveis" de cada ativo. Só use o ativo em formas farmacêuticas listadas como compatíveis.
- RESPEITE a faixa de "Concentração usual" de cada ativo. Nunca sugira concentrações fora da faixa indicada.
- VERIFIQUE as "Contraindicações" do ativo contra os dados do paciente (idade, condições, pele sensível, etc).
- OBSERVE as "Notas técnicas" (pH, incompatibilidades) para não combinar ativos incompatíveis na mesma fórmula.`
}

async function getAllAtivos(): Promise<ReferencedAtivo[]> {
  const ativos = await prisma.ativo.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  return ativos
}

async function searchRelevantContext(query: string): Promise<{ context: string; ativos: ReferencedAtivo[] }> {
  const ativos = await prisma.ativo.findMany({
    select: {
      id: true, name: true, description: true, fileName: true,
      usageType: true, compatibleForms: true, category: true,
      concentrationMin: true, concentrationMax: true,
      contraindications: true, technicalNotes: true,
    },
  })

  if (ativos.length === 0) return { context: '', ativos: [] }

  const ativoLines = ativos.map((a) => {
    const parts = [`### ${a.name}`]
    if (a.description) parts.push(`Descrição: ${a.description}`)
    if (a.usageType) parts.push(`Via de uso: ${a.usageType}`)
    if (a.compatibleForms) parts.push(`Formas compatíveis: ${a.compatibleForms}`)
    if (a.category) parts.push(`Categoria: ${a.category}`)
    if (a.concentrationMin || a.concentrationMax) {
      const range = [a.concentrationMin, a.concentrationMax].filter(Boolean).join(' a ')
      parts.push(`Concentração usual: ${range}`)
    }
    if (a.contraindications && a.contraindications !== 'Não informado') {
      parts.push(`Contraindicações: ${a.contraindications}`)
    }
    if (a.technicalNotes && a.technicalNotes !== 'Não informado') {
      parts.push(`Notas técnicas: ${a.technicalNotes}`)
    }
    return parts.join('\n')
  })

  const embeddings = await prisma.embedding.findMany({
    include: { ativo: { select: { id: true, name: true } } },
    take: 10,
  })

  let context = ativoLines.join('\n\n')

  if (embeddings.length > 0) {
    context += '\n\n## Detalhes adicionais dos PDFs\n'
    context += embeddings
      .map((e) => `[${e.ativo.name}]: ${e.content}`)
      .join('\n\n')
  }

  return {
    context,
    ativos: ativos.map(a => ({ id: a.id, name: a.name, fileName: a.fileName })),
  }
}

function matchReferencedAtivos(responseText: string, allAtivos: ReferencedAtivo[]): ReferencedAtivo[] {
  const lower = responseText.toLowerCase()
  return allAtivos.filter(ativo => {
    const name = ativo.name.toLowerCase()
    if (name.length < 3) return false
    return lower.includes(name)
  })
}

async function chatWithOpenAI(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string,
  model: string
): Promise<string> {
  const openai = new OpenAI({ apiKey })
  const response = await openai.chat.completions.create({
    model: model || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ],
    temperature: 0.7,
    max_tokens: 2000,
  })
  return response.choices[0]?.message?.content || 'Sem resposta da IA.'
}

async function chatWithClaude(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string,
  model: string
): Promise<string> {
  const anthropic = new Anthropic({ apiKey })
  const response = await anthropic.messages.create({
    model: model || 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  })
  const block = response.content[0]
  return block.type === 'text' ? block.text : 'Sem resposta da IA.'
}

async function chatWithGemini(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string,
  model: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const geminiModel = genAI.getGenerativeModel({ model: model || 'gemini-1.5-flash' })

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: m.content }],
  }))

  const chat = geminiModel.startChat({
    history,
    systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] },
  })

  const lastMessage = messages[messages.length - 1]
  const result = await chat.sendMessage(lastMessage.content)
  return result.response.text()
}

export async function processChat(context: ChatContext): Promise<ChatResult> {
  const settings = await getAiSettings()

  if (!settings.apiKey) {
    throw new Error('API Key não configurada. Peça ao administrador para configurar nas Configurações de IA.')
  }

  const user = await prisma.user.findUnique({ where: { id: context.userId } })
  const patient = await prisma.patient.findUnique({ where: { id: context.patientId } })

  if (!user || !patient) throw new Error('Usuário ou paciente não encontrado')

  const { context: ragContext, ativos } = await searchRelevantContext(
    context.messages[context.messages.length - 1].content
  )

  const systemPrompt = buildSystemPrompt(
    settings.systemPrompt,
    user.profession || '',
    patient,
    ragContext
  )

  let responseText: string

  switch (settings.provider) {
    case 'OPENAI':
      responseText = await chatWithOpenAI(systemPrompt, context.messages, settings.apiKey, settings.model)
      break
    case 'CLAUDE':
      responseText = await chatWithClaude(systemPrompt, context.messages, settings.apiKey, settings.model)
      break
    case 'GEMINI':
      responseText = await chatWithGemini(systemPrompt, context.messages, settings.apiKey, settings.model)
      break
    default:
      throw new Error(`Provedor ${settings.provider} não suportado`)
  }

  const referencedAtivos = matchReferencedAtivos(responseText, ativos)

  return { response: responseText, referencedAtivos }
}
