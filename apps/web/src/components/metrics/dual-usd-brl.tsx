'use client'

const usdFmtTotal = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const usdFmtAvg = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})
const brlFmtTotal = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const brlFmtAvg = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

function brlFromUsd(usd: number, rate: number) {
  return usd * rate
}

type Mode = 'total' | 'avg'

export function DualUsdBrlPair({
  usd,
  rate,
  mode,
  className,
}: {
  usd: number
  rate: number
  mode: Mode
  className?: string
}) {
  const label = mode === 'total' ? 'total' : 'média/chamada'
  const usdF = mode === 'total' ? usdFmtTotal : usdFmtAvg
  const brlF = mode === 'total' ? brlFmtTotal : brlFmtAvg
  const brl = brlFromUsd(usd, rate)
  const usdLine =
    mode === 'total'
      ? 'block text-tag-medium font-semibold text-content-title'
      : 'block text-desc-regular font-semibold text-content-text'
  const brlLine =
    mode === 'total'
      ? 'block text-tag-medium font-semibold text-primary-dark'
      : 'block text-desc-regular font-semibold text-primary-dark'
  return (
    <span className={className ?? 'flex flex-col gap-0.5 leading-snug'}>
      <span className={usdLine}>
        {usdF.format(usd)} {label}
      </span>
      <span className={brlLine}>
        BRL {brlF.format(brl)} {label}
      </span>
    </span>
  )
}

export function DualUsdBrlInline({
  usd,
  rate,
  mode,
}: {
  usd: number
  rate: number
  mode: Mode
}) {
  const usdF = mode === 'total' ? usdFmtTotal : usdFmtAvg
  const brlF = mode === 'total' ? brlFmtTotal : brlFmtAvg
  const brl = brlFromUsd(usd, rate)
  return (
    <span>
      <span className="font-semibold text-content-title">{usdF.format(usd)}</span>
      {' · '}
      <span className="font-semibold text-primary-dark">BRL {brlF.format(brl)}</span>
    </span>
  )
}
