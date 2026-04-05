'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

/** Hardcoded “Minecraft + Matrix” flavor lines while uploads or analysis run. */
export const LOADING_FUN_MESSAGES = [
  // Minecraft-ish
  'Mining diamonds… I mean, mining pixels.',
  'Loading chunk—please do not fall into the void.',
  'Crafting table: assembling verdicts.',
  'Creeper behind you—kidding, it is only the neural net.',
  'Breaking blocks… of misinformation.',
  'Steve placed torches along your upload path.',
  'Achievement get: Started Analysis!',
  // Matrix-ish
  'There is no spoon—only tensors.',
  'Follow the white rabbit through the latent space.',
  'Red pill: still loading. Blue pill: also still loading.',
  'Mr. Anderson—we are decoding the Matrix.',
  'Deja vu—usually a glitch in the model. Checking.',
  'The Oracle says: maybe. Maybe not. Ask again in 0.3s.',
  'Tank: Wrong pipe. Wrong model. We will route you correctly.',
] as const

export function useRotatingLoadingMessage(active: boolean, intervalMs = 2600): string {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!active) return
    setIndex(0)
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_FUN_MESSAGES.length)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [active, intervalMs])

  return LOADING_FUN_MESSAGES[index] ?? LOADING_FUN_MESSAGES[0]
}

/** Indeterminate-ish progress for fetch calls that do not expose real bytes (e.g. chat analyze). Call `setProgress(100)` right before finishing. */
export function useFakeAnalysisProgress(active: boolean): readonly [
  progress: number,
  setProgress: Dispatch<SetStateAction<number>>,
] {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!active) {
      setProgress(0)
      return
    }
    setProgress(10)
    const id = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 88) return p
        return Math.min(88, p + 2 + Math.random() * 7)
      })
    }, 380)
    return () => window.clearInterval(id)
  }, [active])

  return [Math.round(progress), setProgress] as const
}
