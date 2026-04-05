import Link from 'next/link'
import { Upload, MessageSquare, Clock, FlaskConical, ArrowLeft } from 'lucide-react'

const ACTIONS = [
  {
    href:    '/chat',
    icon:    MessageSquare,
    label:   'Chat Analysis',
    desc:    'Verify a claim against an image or video',
    accentVar: '--color-cyan',
    primary: true,
  },
  {
    href:    '/upload',
    icon:    Upload,
    label:   'File Scanner',
    desc:    'Deep-scan any media file for AI generation',
    accentVar: '--color-purple',
    primary: false,
  },
  {
    href:    '/extension-test',
    icon:    FlaskConical,
    label:   'Extension test',
    desc:    'Sample feed for the browser extension',
    accentVar: '--color-cyan',
    primary: false,
  },
  {
    href:    '/history',
    icon:    Clock,
    label:   'History',
    desc:    'Browse your previous analyses',
    accentVar: '--muted-foreground',
    primary: false,
  },
]

export default function DashboardPage() {
  return (
    <main
      className="flex min-h-screen flex-col items-center gap-8 px-4 py-8"
      style={{ background: 'var(--background)' }}
    >
      <div className="w-full max-w-4xl flex justify-start">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to home
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 w-full">
      <div className="text-center">
        <h1
          className="text-3xl font-bold"
          style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}
        >
          Dashboard
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Overview of your detection activity.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {ACTIONS.map(({ href, icon: Icon, label, desc, accentVar, primary }) => (
          <Link
            key={href}
            href={href}
            className="liquid-glass-card group inline-flex flex-col items-center gap-3 rounded-2xl px-7 py-5 text-center no-underline transition-all duration-200"
            style={{ minWidth: '180px' }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
              style={{
                background: `color-mix(in srgb, var(${accentVar}) 14%, transparent)`,
                border: `1px solid color-mix(in srgb, var(${accentVar}) 22%, transparent)`,
              }}
            >
              <Icon size={18} style={{ color: `var(${accentVar})` }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{label}</p>
              <p className="text-xs mt-0.5 max-w-[140px]" style={{ color: 'var(--muted-foreground)' }}>{desc}</p>
            </div>
          </Link>
        ))}
      </div>
      </div>
    </main>
  )
}
