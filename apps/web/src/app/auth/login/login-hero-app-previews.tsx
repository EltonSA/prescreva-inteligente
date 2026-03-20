'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'dashboard' | 'ia' | 'formulas'

const SLIDES: { title: string; variant: Variant; label: string }[] = [
  { title: '…/dashboard', variant: 'dashboard', label: 'Dashboard' },
  { title: '…/ia', variant: 'ia', label: 'IA' },
  { title: '…/formulas', variant: 'formulas', label: 'Fórmulas' },
]

const INTERVAL_MS = 4200

function MockChrome({ title }: { title: string }) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-2.5 border-b border-base-border/90 bg-gradient-to-b from-base-white to-[#f7f7f7] px-3">
      <span className="flex gap-1.5" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] shadow-[inset_0_-1px_2px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.06]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e] shadow-[inset_0_-1px_2px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.06]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840] shadow-[inset_0_-1px_2px_rgba(0,0,0,0.1)] ring-1 ring-black/[0.06]" />
      </span>
      <div className="min-w-0 flex-1 rounded-md border border-base-border/50 bg-base-disable/40 px-2.5 py-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
        <span className="block truncate text-center text-[10px] font-medium tracking-tight text-content-text/65">
          {title}
        </span>
      </div>
    </div>
  )
}

function MockSidebar({ activeIndex = 0 }: { activeIndex?: number }) {
  const items = [0, 1, 2, 3, 4]
  return (
    <div className="flex w-[27%] shrink-0 flex-col gap-1 border-r border-base-border/90 bg-gradient-to-b from-base-white to-[#fafafa] px-2 py-2.5">
      <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-primary-medium/80 shadow-sm ring-1 ring-primary-medium/30">
        <span className="text-[7px] font-bold text-primary-dark/80">PI</span>
      </div>
      {items.map((i) => (
        <div
          key={i}
          className={cn(
            'mx-auto rounded-full transition-all',
            i === activeIndex
              ? 'h-2 w-[92%] bg-primary-accent shadow-sm'
              : 'h-1.5 w-[72%] bg-base-border/55',
          )}
        />
      ))}
    </div>
  )
}

function MockToolbar({ narrow }: { narrow?: boolean }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-1">
      <div className={cn('h-2 rounded-md bg-base-border/55', narrow ? 'w-1/3' : 'w-2/5')} />
      <div className="flex gap-1">
        <div className="h-2 w-2 rounded-sm bg-base-border/40" />
        <div className="h-2 w-2 rounded-sm bg-base-border/35" />
      </div>
    </div>
  )
}

function MockDashboardBody() {
  return (
    <div className="flex flex-1 flex-col bg-base-background p-2">
      <MockToolbar />
      <div className="grid flex-1 grid-cols-2 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col rounded-lg border border-base-border/55 bg-base-white p-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          >
            <div className="mb-1 flex items-center justify-between gap-1">
              <div className="h-1.5 w-1/2 rounded bg-primary-light" />
              <div className="h-1 w-4 rounded-full bg-primary-accent/25" />
            </div>
            <div className="mt-auto flex min-h-[18px] flex-1 items-end gap-0.5 pt-1">
              {[6, 11, 7, 14, 9, 16, 10].map((px, j) => (
                <div
                  key={j}
                  className="flex-1 rounded-sm bg-gradient-to-t from-primary-medium/55 to-primary-light/95"
                  style={{ height: `${px}px` }}
                />
              ))}
            </div>
            <div className="mt-1 h-1 w-full rounded bg-base-border/35" />
          </div>
        ))}
      </div>
    </div>
  )
}

function MockIaBody() {
  return (
    <div className="flex flex-1 flex-col gap-2 bg-base-background p-2">
      <MockToolbar narrow />
      <div className="ml-auto max-w-[80%] rounded-xl rounded-tr-md border border-primary-medium/40 bg-gradient-to-br from-primary-light to-primary-light/70 px-2 py-1.5 shadow-sm">
        <div className="h-1 w-full rounded bg-primary-accent/20" />
        <div className="mt-1 h-1 w-[88%] rounded bg-primary-accent/12" />
      </div>
      <div className="mr-auto max-w-[86%] rounded-xl rounded-tl-md border border-base-border/65 bg-base-white px-2 py-1.5 shadow-sm">
        <div className="h-1 w-full rounded bg-base-border/55" />
        <div className="mt-1 h-1 w-full rounded bg-base-border/38" />
        <div className="mt-1 h-1 w-[90%] rounded bg-base-border/32" />
        <div className="mt-1.5 flex gap-0.5 pl-0.5">
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              className="h-1 w-1 animate-pulse rounded-full bg-primary-accent/45"
              style={{ animationDelay: `${d * 0.2}s` }}
            />
          ))}
        </div>
      </div>
      <div className="mt-auto flex gap-1.5 pt-0.5">
        <div className="h-3.5 flex-1 rounded-lg border border-base-border/75 bg-base-white shadow-inner" />
        <div className="h-3.5 w-8 shrink-0 rounded-lg bg-gradient-to-b from-primary-accent to-primary-dark shadow-sm" />
      </div>
    </div>
  )
}

function MockFormulasBody() {
  return (
    <div className="flex flex-1 flex-col gap-1.5 bg-base-background p-2">
      <MockToolbar narrow />
      <div className="flex gap-1.5">
        <div className="h-3.5 flex-1 rounded-lg border border-base-border/70 bg-base-white shadow-sm" />
        <div className="h-3.5 w-9 shrink-0 rounded-lg bg-gradient-to-b from-primary-accent/90 to-primary-dark shadow-sm" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-lg border border-base-border/50 bg-base-white px-2 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-light/90 ring-1 ring-primary-medium/25">
            <div className="h-3 w-3 rounded-sm bg-primary-accent/35" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="h-1 w-[70%] rounded bg-base-border/65" />
            <div className="h-1 w-[45%] rounded bg-base-border/40" />
          </div>
          <div className="h-2 w-8 shrink-0 rounded-full bg-base-disable" />
        </div>
      ))}
    </div>
  )
}

function MiniWindow({
  title,
  variant,
  isFront,
  reducedMotion,
  className,
}: {
  title: string
  variant: Variant
  isFront: boolean
  reducedMotion: boolean
  className?: string
}) {
  const activeNav =
    variant === 'dashboard' ? 0 : variant === 'formulas' ? 3 : 4

  return (
    <div
      className={cn(
        'pointer-events-none relative flex w-[min(100%,332px)] flex-col overflow-hidden rounded-xl border-2 border-white/45 bg-base-white ring-1 ring-black/[0.07] sm:w-[360px] lg:w-[392px]',
        'aspect-[5/3.1] max-h-[min(58vh,320px)] min-h-[224px]',
        isFront && !reducedMotion && 'login-mock-front-glow',
        className,
      )}
    >
      {isFront && !reducedMotion && (
        <div
          className="pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-[10px]"
          aria-hidden
        >
          <div className="absolute -left-[35%] top-0 h-full w-[55%] bg-gradient-to-r from-transparent via-white/35 to-transparent animate-login-mock-shimmer" />
        </div>
      )}
      <MockChrome title={title} />
      <div className="relative z-[1] flex min-h-0 flex-1">
        <MockSidebar activeIndex={activeNav} />
        {variant === 'dashboard' && <MockDashboardBody />}
        {variant === 'ia' && <MockIaBody />}
        {variant === 'formulas' && <MockFormulasBody />}
      </div>
    </div>
  )
}

function depthMotion(
  depth: 0 | 1 | 2,
  reducedMotion: boolean,
): CSSProperties {
  if (reducedMotion) {
    return {
      transform: 'translateX(-50%) translateY(0) translateZ(0) scale(1) rotateX(0deg)',
      opacity: depth === 0 ? 1 : 0,
      zIndex: depth === 0 ? 30 : 0,
      filter: 'none',
    }
  }
  const y = depth === 0 ? 0 : depth === 1 ? 32 : 64
  const tz = depth === 0 ? 0 : depth === 1 ? -40 : -82
  const scale = depth === 0 ? 1 : depth === 1 ? 0.87 : 0.74
  const rotateX = depth === 0 ? 0 : depth === 1 ? 3 : 6.5
  const opacity = depth === 0 ? 1 : depth === 1 ? 0.74 : 0.5
  const z = depth === 0 ? 30 : depth === 1 ? 20 : 10
  const filter =
    depth === 0
      ? 'brightness(1) saturate(1)'
      : depth === 1
        ? 'brightness(0.93) saturate(0.92)'
        : 'brightness(0.84) saturate(0.88)'
  return {
    transform: `translateX(-50%) translateY(${y}px) translateZ(${tz}px) scale(${scale}) rotateX(${rotateX}deg)`,
    opacity,
    zIndex: z,
    filter,
  }
}

const STACK_TRANSITION =
  'transform 1.08s cubic-bezier(0.22, 1, 0.32, 1.06), opacity 0.58s ease-out, filter 0.72s ease-out'

/** Carrossel em pilha com mockup refinado e transições mais naturais. */
export function LoginHeroAppPreviews({ className }: { className?: string }) {
  const [active, setActive] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reducedMotion) return
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % SLIDES.length),
      INTERVAL_MS,
    )
    return () => window.clearInterval(id)
  }, [reducedMotion])

  const layers = [0, 1, 2]
    .map((i) => ({
      i,
      depth: ((i - active + SLIDES.length) % SLIDES.length) as 0 | 1 | 2,
    }))
    .sort((a, b) => b.depth - a.depth)

  return (
    <div
      className={cn('relative flex w-full flex-col items-center justify-center', className)}
      aria-hidden
    >
      <div
        className="relative mx-auto h-[min(388px,50vh)] w-full max-w-[min(96vw,404px)] [perspective:1180px] [perspective-origin:50%_100%] sm:h-[min(428px,52vh)] sm:max-w-[424px] lg:h-[min(456px,54vh)] lg:max-w-[448px] [transform-style:preserve-3d]"
      >
        {layers.map(({ i, depth }) => {
          const slide = SLIDES[i]
          const front = depth === 0
          const motion = depthMotion(depth, reducedMotion)
          return (
            <div
              key={slide.variant + i}
              className="absolute bottom-0 left-1/2 origin-bottom [transform-style:preserve-3d] will-change-transform"
              style={{
                ...motion,
                transition: reducedMotion ? undefined : STACK_TRANSITION,
              }}
            >
              <MiniWindow
                title={slide.title}
                variant={slide.variant}
                isFront={front}
                reducedMotion={reducedMotion}
                className={cn(
                  !front && 'shadow-[0_10px_28px_rgba(0,0,0,0.22)]',
                )}
              />
            </div>
          )
        })}
      </div>

      <div
        className="mt-8 w-full max-w-[200px] px-2"
        style={
          { ['--login-mock-interval' as string]: `${INTERVAL_MS}ms` } as CSSProperties
        }
      >
        {!reducedMotion && (
          <div
            key={active}
            className="mb-3 h-1 w-full overflow-hidden rounded-full bg-white/12"
            aria-hidden
          >
            <div className="login-mock-bar-fill h-full rounded-full bg-primary-light/75" />
          </div>
        )}
        <div className="flex justify-center gap-2.5">
          {SLIDES.map((slide, i) => (
            <div key={slide.variant} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  'h-2 rounded-full transition-all duration-500 ease-out',
                  i === active
                    ? 'w-8 bg-primary-light shadow-[0_0_12px_rgba(227,234,226,0.35)]'
                    : 'w-2 bg-white/30',
                )}
              />
              <span
                className={cn(
                  'mt-3.5 text-[9px] font-medium tracking-wide transition-colors duration-300',
                  i === active ? 'text-primary-light' : 'text-white/40',
                )}
              >
                {slide.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
