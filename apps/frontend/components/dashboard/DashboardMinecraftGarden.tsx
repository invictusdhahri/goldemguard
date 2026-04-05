'use client'

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

const BLOCK_W = 28

/** Minecraft-style grass + dirt block faces */
const VARIANTS = [
  { grass: '#7CBD6B', grassHi: '#8FD47A', side: '#5A8C3F', dirt: '#6B5344', dirtDeep: '#4A3B2F' },
  { grass: '#73B565', grassHi: '#85C678', side: '#568838', dirt: '#65503F', dirtDeep: '#46382C' },
  { grass: '#78BA68', grassHi: '#8BCF7A', side: '#5C9142', dirt: '#685544', dirtDeep: '#483A30' },
] as const

type Layer = 'back' | 'mid' | 'front'

function GrassBlock({ variant, layer }: { variant: number; layer: Layer }) {
  const v = VARIANTS[variant % VARIANTS.length]!
  const layerShadow =
    layer === 'back'
      ? `0 3px 0 ${v.dirtDeep}, 0 5px 8px rgba(0,0,0,0.35)`
      : layer === 'mid'
        ? `0 4px 0 ${v.dirtDeep}, 0 7px 10px rgba(0,0,0,0.4)`
        : `0 5px 0 ${v.dirtDeep}, 0 8px 12px rgba(0,0,0,0.42), 0 12px 20px rgba(0,0,0,0.18)`

  return (
    <div
      className="relative shrink-0 select-none rounded-[1px]"
      style={{
        width: BLOCK_W,
        height: layer === 'back' ? 20 : layer === 'mid' ? 22 : 24,
        imageRendering: 'pixelated',
        background: `
          linear-gradient(90deg, ${v.side} 0%, ${v.side} 14%, transparent 14%),
          linear-gradient(270deg, ${v.side} 0%, ${v.side} 14%, transparent 14%),
          linear-gradient(180deg, ${v.grassHi} 0%, ${v.grass} 42%, ${v.side} 46%, ${v.dirt} 46%, ${v.dirtDeep} 100%)
        `,
        boxShadow: `
          inset 0 2px 0 rgba(255,255,255,0.12),
          inset 0 -1px 0 rgba(0,0,0,0.2),
          ${layerShadow}
        `,
        opacity: layer === 'back' ? 0.72 : layer === 'mid' ? 0.88 : 1,
        filter: layer === 'back' ? 'brightness(0.82) saturate(0.95)' : undefined,
      }}
      aria-hidden
    />
  )
}

function BlockRow({
  cols,
  layer,
  className,
  style,
}: {
  cols: number
  layer: Layer
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={className}
      style={{ imageRendering: 'pixelated', ...style }}
    >
      {Array.from({ length: cols }, (_, i) => (
        <GrassBlock key={`${layer}-${i}`} variant={i % 3} layer={layer} />
      ))}
    </div>
  )
}

/** Full-viewport decorative grass strip: fixed bottom, stacked rows, pointer-events none */
export function DashboardMinecraftGarden() {
  const shellRef = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(48)

  useLayoutEffect(() => {
    const el = shellRef.current
    if (!el) return

    const update = () => {
      const w = el.offsetWidth || window.innerWidth
      setCols(Math.max(36, Math.ceil(w / BLOCK_W) + 4))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div
      ref={shellRef}
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-[5] overflow-hidden"
      style={{
        height: 'clamp(96px, 15vh, 148px)',
      }}
      aria-hidden
    >
      {/* Ground wash + depth */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/[0.12] via-transparent to-transparent"
        style={{ bottom: -1 }}
      />
      <div
        className="absolute bottom-0 left-1/2 h-6 w-[min(120%,900px)] -translate-x-1/2 rounded-[100%]"
        style={{
          background:
            'radial-gradient(ellipse 100% 100% at 50% 100%, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.08) 45%, transparent 65%)',
          filter: 'blur(8px)',
        }}
      />

      <div className="relative mx-auto flex h-full w-full max-w-[100vw] flex-col justify-end">
        {/* Back row — “far” terrain */}
        <div
          className="relative z-[1] flex w-full min-w-0 justify-center px-0"
          style={{
            transform: 'translateY(22px) scale(0.94)',
            transformOrigin: '50% 100%',
          }}
        >
          <BlockRow
            cols={cols}
            layer="back"
            className="flex w-full min-w-0 justify-center"
            style={{ boxShadow: '0 -3px 14px rgba(0,0,0,0.18)' }}
          />
        </div>

        {/* Middle row */}
        <div
          className="relative z-[2] -mt-3 flex w-full min-w-0 justify-center"
          style={{ transform: 'translateY(10px)' }}
        >
          <BlockRow
            cols={cols}
            layer="mid"
            className="flex w-full min-w-0 justify-center"
            style={{ filter: 'drop-shadow(0 -4px 6px rgba(0,0,0,0.12))' }}
          />
        </div>

        {/* Front row — nearest */}
        <div className="relative z-[3] -mt-2 flex w-full min-w-0 justify-center pb-0.5">
          <BlockRow cols={cols} layer="front" className="flex w-full min-w-0 justify-center" />
        </div>
      </div>
    </div>
  )
}
