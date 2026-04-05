'use client'

import { useMemo } from 'react'

export type MinecraftBurstVariant = 'positive' | 'negative'

interface MinecraftVerdictBurstProps {
  variant: MinecraftBurstVariant
  /** Bump when a new verdict should replay the burst */
  burstKey?: number
}

/** % positions — pinned on the card frame (corners + edge mids), not the content center */
const ANCHORS_POSITIVE = [
  { x: 8, y: 10 },
  { x: 50, y: 4 },
  { x: 92, y: 10 },
  { x: 96, y: 38 },
  { x: 96, y: 62 },
  { x: 92, y: 90 },
  { x: 50, y: 96 },
  { x: 8, y: 90 },
  { x: 4, y: 38 },
  { x: 4, y: 62 },
]

const ANCHORS_NEGATIVE = [
  { x: 6, y: 12 },
  { x: 50, y: 3 },
  { x: 94, y: 12 },
  { x: 98, y: 38 },
  { x: 98, y: 62 },
  { x: 94, y: 88 },
  { x: 50, y: 97 },
  { x: 6, y: 88 },
  { x: 2, y: 38 },
  { x: 2, y: 62 },
]

/** Flashes + TNT blocks sit on the same perimeter */
const TNT_FLASH = [
  { x: 14, y: 14, delay: 0 },
  { x: 86, y: 14, delay: 0.06 },
  { x: 50, y: 8, delay: 0.03 },
  { x: 6, y: 50, delay: 0.09 },
  { x: 94, y: 50, delay: 0.05 },
  { x: 14, y: 86, delay: 0.11 },
  { x: 86, y: 86, delay: 0.07 },
]

const TNT_CORES = [
  { x: 18, y: 18, delay: 0 },
  { x: 82, y: 18, delay: 0.08 },
  { x: 50, y: 10, delay: 0.04 },
  { x: 10, y: 50, delay: 0.12 },
  { x: 90, y: 50, delay: 0.06 },
  { x: 18, y: 82, delay: 0.14 },
  { x: 82, y: 82, delay: 0.1 },
]

/**
 * Short Minecraft-style feedback: green “experience” style pixels for a good verdict,
 * TNT-style flash + ember/smoke pixels for a risky / AI / fake verdict.
 */
export function MinecraftVerdictBurst({ variant, burstKey = 0 }: MinecraftVerdictBurstProps) {
  const particles = useMemo(() => {
    const count = variant === 'positive' ? 36 : 42
    const anchors = variant === 'positive' ? ANCHORS_POSITIVE : ANCHORS_NEGATIVE
    const colors =
      variant === 'positive'
        ? ['#16a34a', '#22c55e', '#4ade80', '#34d399', '#6ee7b7', '#2dd4bf', '#5eead4', '#86efac']
        : ['#7f1d1d', '#b91c1c', '#dc2626', '#ea580c', '#78716c', '#57534e', '#f97316', '#fbbf24', '#fde047']

    const cx = 50
    const cy = 50

    return Array.from({ length: count }, (_, i) => {
      const anchor = anchors[i % anchors.length]
      const slot = Math.floor(i / anchors.length)
      const slots = Math.ceil(count / anchors.length)
      /** Aim from each edge point toward the card middle, with a small fan + jitter */
      const inward = Math.atan2(cy - anchor.y, cx - anchor.x)
      const fan =
        slots <= 1 ? 0 : (slot / Math.max(slots - 1, 1) - 0.5) * 1.15
      const angle = inward + fan + (i % 6) * 0.09
      const base = variant === 'positive' ? 88 : 92
      const ring = (i % 7) * 30
      const wobble = Math.sin(i * 1.7) * 32
      const dist = base + ring + wobble
      const stagger = variant === 'negative' ? 0.072 : 0.062
      return {
        originXPct: anchor.x,
        originYPct: anchor.y,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        delay: (i % 10) * stagger + (i % 4) * 0.02 + (i % anchors.length) * 0.04,
        color: colors[i % colors.length],
        size: 4 + (i % 5),
        rot: (i * 41) % 360,
      }
    })
  }, [variant, burstKey])

  return (
    <div
      key={burstKey}
      className="pointer-events-none absolute inset-0 z-[5] overflow-visible"
      aria-hidden
    >
      {variant === 'negative' &&
        TNT_FLASH.map((f, i) => (
          <div
            key={`flash-${i}`}
            className="mc-tnt-burst-flash-patch rounded-[inherit]"
            style={{
              left: `${f.x}%`,
              top: `${f.y}%`,
              animationDelay: `${f.delay}s`,
            }}
          />
        ))}
      {variant === 'negative' &&
        TNT_CORES.map((c, i) => (
          <div
            key={`tnt-${i}`}
            className="mc-tnt-core"
            style={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              animationDelay: `${c.delay}s`,
            }}
          />
        ))}
      {particles.map((p, i) => (
        <span
          key={i}
          className={variant === 'positive' ? 'mc-pixel-burst-positive' : 'mc-pixel-burst-negative'}
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            left: `${p.originXPct}%`,
            top: `${p.originYPct}%`,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
            animationDelay: `${p.delay}s`,
            ['--mc-tx' as string]: `${p.tx}px`,
            ['--mc-ty' as string]: `${p.ty}px`,
            ['--mc-rot' as string]: `${p.rot}deg`,
            imageRendering: 'pixelated',
          }}
        />
      ))}
    </div>
  )
}
