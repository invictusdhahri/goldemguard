import Link from 'next/link'
import { Upload, MessageSquare, Clock, FlaskConical } from 'lucide-react'

const ACTIONS = [
  {
    href:    '/chat',
    icon:    MessageSquare,
    label:   'Chat Analysis',
    desc:    'Verify a claim against an image or video',
    color:   '#00d4ff',
    primary: true,
  },
  {
    href:    '/upload',
    icon:    Upload,
    label:   'File Scanner',
    desc:    'Deep-scan any media file for AI generation',
    color:   '#8b5cf6',
    primary: false,
  },
  {
    href:    '/extension-test',
    icon:    FlaskConical,
    label:   'Extension test',
    desc:    'Sample feed for the browser extension',
    color:   '#22d3ee',
    primary: false,
  },
  {
    href:    '/history',
    icon:    Clock,
    label:   'History',
    desc:    'Browse your previous analyses',
    color:   '#64748b',
    primary: false,
  },
]

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-grid px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-2 text-slate-400">Overview of your detection activity.</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {ACTIONS.map(({ href, icon: Icon, label, desc, color, primary }) => (
          <Link
            key={href}
            href={href}
            className="group inline-flex flex-col items-center gap-2 rounded-xl px-7 py-5 text-center no-underline transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: primary ? `${color}14` : 'rgba(255,255,255,0.03)',
              border:     `1px solid ${primary ? `${color}33` : 'rgba(255,255,255,0.08)'}`,
              minWidth:   '180px',
            }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5 max-w-[140px]">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
