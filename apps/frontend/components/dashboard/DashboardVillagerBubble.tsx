'use client'

import { useCallback, useState } from 'react'
import GuardVillager from '@/components/landing/GuardVillager'

const MESSAGES = [
  "I've seen forty-seven 'totally real' moons today. Zero passed.",
  'Your PNG is giving main-character energy. The models agree.',
  "They promised me a village. They gave me a dashboard. Still guarding.",
  'If your sunset looks like a Renaissance painting, we should talk.',
  "I don't sleep. I sample. It's different.",
  'Hot take: twelve hashtags usually means twelve reasons to scan.',
  "Trust issues? Good. That's basically the product.",
  "I'm not mad. I'm just… statistically skeptical.",
  'Deepfake? Deep hope. Either way, we check.',
  'I fold my arms so my confidence has a container.',
  "That file whispered 'trust me' — I don't whisper back; I verify.",
  'My nose is 3D so my takes can be too.',
  'If it loads faster than your conscience, run detection.',
  "GolemGuard isn't judging you. The ensemble is. I'm moral support.",
  'Square head, round opinions about JPEG artifacts.',
]

function pickMessage(): string {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)]!
}

export function DashboardVillagerBubble() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')

  const show = useCallback(() => {
    setMessage(pickMessage())
    setOpen(true)
  }, [])

  const hide = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <div
      className="relative mx-auto w-[min(280px,calc(100vw-2rem))] shrink-0 pb-2 pt-[124px] opacity-95 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
      style={{ animation: 'float 6s ease-in-out infinite' }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      aria-label="Guard villager — hover for a random tip"
    >
      <div
        className={`absolute left-1/2 -top-3 z-20 w-[min(260px,calc(100vw-2rem))] -translate-x-1/2 transition-all duration-200 ease-out ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'
        }`}
        role="tooltip"
        aria-hidden={!open}
      >
        <div className="relative text-center">
          <div className="liquid-glass-card !overflow-visible rounded-2xl px-3.5 py-2.5 shadow-lg">
            <p
              className="text-xs font-medium leading-snug"
              style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}
            >
              {message}
            </p>
          </div>
          <div
            className="pointer-events-none absolute -bottom-1.5 left-1/2 z-10 h-3 w-3 -translate-x-1/2 rotate-45 border border-[var(--glass-border-subtle)] border-t-0 border-l-0 bg-[var(--glass-bg)] shadow-[0_2px_8px_var(--glass-shadow)] backdrop-blur-[var(--glass-blur)]"
            aria-hidden
          />
        </div>
      </div>

      <div className="relative mx-auto flex h-[220px] w-[200px] items-end justify-center">
        <GuardVillager />
      </div>
    </div>
  )
}
