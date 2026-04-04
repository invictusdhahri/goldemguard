'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  baseX: number
  baseY: number
  vx: number
  vy: number
  size: number
  opacity: number
}

export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Create particles
    const createParticles = () => {
      const particles: Particle[] = []
      const particleCount = Math.floor((canvas.width * canvas.height) / 15000)

      for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height
        particles.push({
          x,
          y,
          baseX: x,
          baseY: y,
          vx: 0,
          vy: 0,
          size: Math.random() * 2.5 + 1.5,
          opacity: Math.random() * 0.8 + 0.4,
        })
      }
      particlesRef.current = particles
    }
    createParticles()

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY,
      }
    }
    window.addEventListener('mousemove', handleMouseMove)

    // Animation loop
    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const mouse = mouseRef.current
      const particles = particlesRef.current

      particles.forEach((particle) => {
        // Calculate distance from mouse
        const dx = mouse.x - particle.x
        const dy = mouse.y - particle.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const maxDistance = 200

        if (distance < maxDistance) {
          // Push particles away from mouse
          const force = (maxDistance - distance) / maxDistance
          const angle = Math.atan2(dy, dx)
          particle.vx -= Math.cos(angle) * force * 2
          particle.vy -= Math.sin(angle) * force * 2
        }

        // Apply velocity
        particle.x += particle.vx
        particle.y += particle.vy

        // Return to base position
        particle.vx += (particle.baseX - particle.x) * 0.05
        particle.vy += (particle.baseY - particle.y) * 0.05

        // Damping
        particle.vx *= 0.95
        particle.vy *= 0.95

        // Draw particle
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 2
        )
        
        // Cyan to purple gradient based on position
        const colorMix = (particle.x / canvas.width)
        const r = Math.floor(0 + colorMix * 139)
        const g = Math.floor(212 - colorMix * 120)
        const b = Math.floor(255 - colorMix * 9)
        
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${particle.opacity})`)
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()

        // Draw connections to nearby particles
        particles.forEach((otherParticle) => {
          const dx2 = particle.x - otherParticle.x
          const dy2 = particle.y - otherParticle.y
          const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2)

          if (dist < 120) {
            ctx.strokeStyle = `rgba(0, 212, 255, ${0.4 * (1 - dist / 120)})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(otherParticle.x, otherParticle.y)
            ctx.stroke()
          }
        })
      })

      // Draw mouse glow
      if (mouse.x && mouse.y) {
        const glowGradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 200)
        glowGradient.addColorStop(0, 'rgba(0, 212, 255, 0.25)')
        glowGradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.15)')
        glowGradient.addColorStop(1, 'rgba(139, 92, 246, 0)')
        
        ctx.fillStyle = glowGradient
        ctx.beginPath()
        ctx.arc(mouse.x, mouse.y, 200, 0, Math.PI * 2)
        ctx.fill()
      }

      animationId = requestAnimationFrame(animate)
    }
    animate()

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.85 }}
    />
  )
}
