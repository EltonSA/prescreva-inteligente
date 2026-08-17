/**
 * Manages token budgets for LLM API calls to prevent context overflow.
 *
 * Uses a heuristic of ~4 characters per token for mixed Portuguese/English text.
 * This is intentionally conservative to avoid hitting limits.
 */

const CHARS_PER_TOKEN = 3.5

export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/**
 * Model context limits (total input + output).
 * We subtract reservedForResponse to get the usable input budget.
 */
const MODEL_LIMITS: Record<string, number> = {
  'gpt-5.6-luna': 1050000,
  'gpt-5.6-terra': 1050000,
  'gpt-5.6-sol': 1050000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4-turbo': 128000,
  'gpt-3.5-turbo': 16385,
  'claude-opus-5': 1000000,
  'claude-sonnet-5': 1000000,
  'claude-haiku-4-5': 200000,
  'claude-fable-5': 1000000,
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-5-haiku-20241022': 200000,
  'gemini-2.5-flash': 1000000,
  'gemini-2.5-pro': 2000000,
  'gemini-3.1-pro-preview': 2000000,
  'gemini-3.7-flash': 1000000,
  'gemini-1.5-flash': 1000000,
  'gemini-1.5-pro': 2000000,
  'gemini-2.0-flash': 1000000,
}

export function getModelLimit(model: string): number {
  return MODEL_LIMITS[model] || 128000
}

/**
 * Trims conversation messages using a sliding window strategy:
 * 1. Always keeps the FIRST user message (original intent/context)
 * 2. Fills remaining budget with the most RECENT messages
 * 3. If even the last message doesn't fit, truncates its content
 */
export function trimMessagesToFitBudget<T extends { role: string; content: string }>(
  messages: T[],
  availableTokens: number,
): T[] {
  if (messages.length === 0) return []

  const firstMsg = messages[0]
  const firstMsgTokens = estimateTokens(firstMsg.content)

  if (messages.length === 1) {
    if (firstMsgTokens <= availableTokens) return [firstMsg]
    return [{ ...firstMsg, content: truncateText(firstMsg.content, availableTokens) }]
  }

  let budget = availableTokens

  if (firstMsgTokens > budget * 0.5) {
    const truncatedFirst = { ...firstMsg, content: truncateText(firstMsg.content, Math.floor(budget * 0.3)) }
    budget -= estimateTokens(truncatedFirst.content)
    const recent = fitRecentMessages(messages.slice(1), budget)
    return [truncatedFirst, ...recent]
  }

  budget -= firstMsgTokens
  const recent = fitRecentMessages(messages.slice(1), budget)

  if (recent.length === 0 && messages.length > 1) {
    const lastMsg = messages[messages.length - 1]
    return [firstMsg, { ...lastMsg, content: truncateText(lastMsg.content, budget) }]
  }

  return [firstMsg, ...recent]
}

function fitRecentMessages<T extends { role: string; content: string }>(
  messages: T[],
  budget: number,
): T[] {
  const result: T[] = []
  let usedTokens = 0

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    const msgTokens = estimateTokens(msg.content)

    if (usedTokens + msgTokens <= budget) {
      result.unshift(msg)
      usedTokens += msgTokens
    } else {
      break
    }
  }

  return result
}

/**
 * Truncates text to fit within a token budget, preserving beginning content.
 */
function truncateText(text: string, maxTokens: number): string {
  const maxChars = Math.floor(maxTokens * CHARS_PER_TOKEN)
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + '\n\n[... conteúdo truncado para caber no limite de contexto ...]'
}

/**
 * Trims RAG context (ativos data) to fit within a token budget.
 * Each ativo block is separated by double newlines.
 * Keeps as many complete ativo blocks as possible.
 */
export function trimRagContext(context: string, maxTokens: number): string {
  if (!context) return ''
  if (estimateTokens(context) <= maxTokens) return context

  const pdfSeparator = '\n\n## Detalhes adicionais dos PDFs\n'
  let mainContext = context
  let pdfSection = ''

  const pdfIdx = context.indexOf(pdfSeparator)
  if (pdfIdx !== -1) {
    mainContext = context.slice(0, pdfIdx)
    pdfSection = context.slice(pdfIdx)
  }

  if (estimateTokens(mainContext) <= maxTokens) {
    const remaining = maxTokens - estimateTokens(mainContext)
    if (pdfSection && remaining > 200) {
      return mainContext + truncateText(pdfSection, remaining)
    }
    return mainContext
  }

  const blocks = mainContext.split('\n\n').filter(Boolean)
  const result: string[] = []
  let usedTokens = 0
  const notice = '\n\n[... alguns ativos omitidos para otimizar o contexto ...]'
  const noticeTokens = estimateTokens(notice)

  for (const block of blocks) {
    const blockTokens = estimateTokens(block)
    if (usedTokens + blockTokens + noticeTokens <= maxTokens) {
      result.push(block)
      usedTokens += blockTokens
    } else {
      break
    }
  }

  if (result.length < blocks.length) {
    return result.join('\n\n') + notice
  }

  return result.join('\n\n')
}

