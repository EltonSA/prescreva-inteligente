import type { AIProvider, AiUsageSource } from '@prisma/client'
import { prisma } from '../config/prisma'
import { estimateOpenAiCostUsd } from './openai-pricing'

export async function recordAiUsage(params: {
  provider: AIProvider
  source: AiUsageSource
  model: string
  promptTokens: number
  completionTokens: number
  userId?: string | null
}): Promise<void> {
  const promptTokens = Math.max(0, Math.floor(params.promptTokens))
  const completionTokens = Math.max(0, Math.floor(params.completionTokens))
  if (promptTokens === 0 && completionTokens === 0) return

  const model = params.model || 'unknown'
  const uid = params.userId ?? null

  // INSERT via SQL: o Prisma Client local às vezes fica desatualizado (ex.: EPERM no `generate`)
  // e rejeita `userId` em create(). O banco já tem a coluna após `db push`.
  await prisma.$executeRaw`
    INSERT INTO ai_usage_logs (id, provider, source, model, "promptTokens", "completionTokens", "userId", "createdAt")
    VALUES (
      gen_random_uuid(),
      ${params.provider}::"AIProvider",
      ${params.source}::"AiUsageSource",
      ${model},
      ${promptTokens},
      ${completionTokens},
      ${uid},
      NOW()
    )
  `
}

/** Início do mês corrente em UTC (uso em agregações de consumo / ranking). */
export function startOfUtcMonth(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
}

export type OpenAiUserMonthAgg = {
  calls: number
  promptTokens: number
  completionTokens: number
  estimatedUsd: number
}

/** Agrega uso OpenAI do mês (UTC) por usuário (linhas com userId). */
export async function aggregateOpenAiByUserForUtcMonth(): Promise<Map<string, OpenAiUserMonthAgg>> {
  const start = startOfUtcMonth()
  const rows = await prisma.$queryRaw<
    Array<{
      userId: string
      model: string
      promptTokens: number | bigint
      completionTokens: number | bigint
    }>
  >`
    SELECT "userId", model, "promptTokens", "completionTokens"
    FROM ai_usage_logs
    WHERE "provider"::text = 'OPENAI'
      AND "userId" IS NOT NULL
      AND "createdAt" >= ${start}
  `

  const map = new Map<string, OpenAiUserMonthAgg>()
  for (const row of rows) {
    const uid = row.userId
    if (!uid) continue
    const pt = Number(row.promptTokens) || 0
    const ct = Number(row.completionTokens) || 0
    const prev = map.get(uid) ?? {
      calls: 0,
      promptTokens: 0,
      completionTokens: 0,
      estimatedUsd: 0,
    }
    prev.calls += 1
    prev.promptTokens += pt
    prev.completionTokens += ct
    prev.estimatedUsd += estimateOpenAiCostUsd(row.model, pt, ct)
    map.set(uid, prev)
  }

  for (const [id, agg] of map.entries()) {
    map.set(id, {
      ...agg,
      estimatedUsd: Math.round(agg.estimatedUsd * 10000) / 10000,
    })
  }

  return map
}

export async function getOpenAiUsageSummary(budgetUsd: number) {
  const start = startOfUtcMonth()
  const budget = budgetUsd > 0 ? budgetUsd : 20

  const logs = await prisma.aiUsageLog.findMany({
    where: {
      provider: 'OPENAI',
      createdAt: { gte: start },
    },
    select: {
      source: true,
      model: true,
      promptTokens: true,
      completionTokens: true,
    },
  })

  let promptTotal = 0
  let completionTotal = 0
  let estimatedUsd = 0

  const bySource: Record<
    string,
    { calls: number; promptTokens: number; completionTokens: number; estimatedUsd: number }
  > = {}

  for (const row of logs) {
    promptTotal += row.promptTokens
    completionTotal += row.completionTokens
    const rowUsd = estimateOpenAiCostUsd(row.model, row.promptTokens, row.completionTokens)
    estimatedUsd += rowUsd

    const key = row.source
    if (!bySource[key]) {
      bySource[key] = { calls: 0, promptTokens: 0, completionTokens: 0, estimatedUsd: 0 }
    }
    bySource[key].calls += 1
    bySource[key].promptTokens += row.promptTokens
    bySource[key].completionTokens += row.completionTokens
    bySource[key].estimatedUsd += rowUsd
  }

  const percentOfBudget = (estimatedUsd / budget) * 100

  return {
    period: {
      start: start.toISOString(),
    },
    budgetUsd: budget,
    totals: {
      calls: logs.length,
      promptTokens: promptTotal,
      completionTokens: completionTotal,
      estimatedUsd: Math.round(estimatedUsd * 10000) / 10000,
    },
    percentOfBudget: Math.round(percentOfBudget * 10) / 10,
    bySource,
  }
}
