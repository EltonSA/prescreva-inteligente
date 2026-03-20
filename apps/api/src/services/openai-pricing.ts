/**
 * Preços aproximados USD / 1M tokens (entrada / saída), alinhados à documentação pública OpenAI.
 * Atualize quando a OpenAI alterar a tabela — a fatura real pode diferir levemente.
 */
type TokenRates = { inputPerMillion: number; outputPerMillion: number }

const RATES: { test: (m: string) => boolean; rates: TokenRates }[] = [
  { test: (m) => m.includes('gpt-4o-mini'), rates: { inputPerMillion: 0.15, outputPerMillion: 0.6 } },
  { test: (m) => m.includes('gpt-4o'), rates: { inputPerMillion: 2.5, outputPerMillion: 10 } },
  { test: (m) => m.includes('gpt-4-turbo'), rates: { inputPerMillion: 10, outputPerMillion: 30 } },
  { test: (m) => m.includes('gpt-3.5-turbo'), rates: { inputPerMillion: 0.5, outputPerMillion: 1.5 } },
]

const FALLBACK: TokenRates = { inputPerMillion: 0.15, outputPerMillion: 0.6 }

export function openAiRatesForModel(model: string): TokenRates {
  const m = model.toLowerCase()
  for (const row of RATES) {
    if (row.test(m)) return row.rates
  }
  return FALLBACK
}

export function estimateOpenAiCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const { inputPerMillion, outputPerMillion } = openAiRatesForModel(model)
  return (
    (Math.max(0, promptTokens) / 1_000_000) * inputPerMillion +
    (Math.max(0, completionTokens) / 1_000_000) * outputPerMillion
  )
}
