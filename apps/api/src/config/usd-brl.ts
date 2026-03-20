const AWESOME_USD_BRL = 'https://economia.awesomeapi.com.br/json/last/USD-BRL'
const CACHE_TTL_MS = 5 * 60 * 1000
const FETCH_TIMEOUT_MS = 8000

type AwesomeUsdBrlResponse = {
  USDBRL?: {
    bid?: string
  }
}

let cache: { rate: number; at: number } | null = null

function envFallbackRate(): number {
  const v = Number(process.env.USD_BRL_RATE)
  return Number.isFinite(v) && v > 0 ? v : 5.05
}

/**
 * Câmbio USD→BRL: consulta AwesomeAPI (`bid`) com cache de 5 min.
 * Se a API falhar, usa último valor em cache (se existir) ou `USD_BRL_RATE` no .env.
 */
export async function resolveUsdToBrlRate(): Promise<number> {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.rate
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(AWESOME_USD_BRL, { signal: controller.signal })
    clearTimeout(timer)

    if (!res.ok) throw new Error(`awesomeapi ${res.status}`)

    const data = (await res.json()) as AwesomeUsdBrlResponse
    const bid = data?.USDBRL?.bid
    const rate = parseFloat(String(bid))
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('invalid bid')

    cache = { rate, at: now }
    return rate
  } catch {
    if (cache) return cache.rate
    return envFallbackRate()
  }
}
