import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, FlaskConical, ImageIcon, Video, FileText, ExternalLink } from 'lucide-react'
import InteractiveBackground from '@/components/InteractiveBackground'

export const metadata: Metadata = {
  title: 'Extension test feed — VeritasAI',
  description:
    'Sample articles, images, videos, and document links for testing the VeritasAI browser extension scraper.',
}

/** Stable remote images (picsum ids do not change). */
const IMAGES = [
  {
    id: 'flood',
    src: 'https://picsum.photos/id/1062/1200/675',
    alt: 'Urban street with heavy rain and water on pavement',
    caption:
      'Sample caption for testing: "Devastating floods in Morocco 2024" — use Reveal to check if image matches the claim.',
  },
  {
    id: 'city',
    src: 'https://picsum.photos/id/348/1200/675',
    alt: 'City skyline at dusk',
    caption:
      'Another block: "WHO confirms vaccines cause autism" — pure text claim; extension can scrape text + nearby media.',
  },
  {
    id: 'nature',
    src: 'https://picsum.photos/id/28/900/600',
    alt: 'Mountain landscape',
    caption: 'Landscape photo with neutral description for generic image detection tests.',
  },
] as const

/** Public sample videos (HTTPS, CORS-friendly for many browsers). */
const VIDEOS = [
  {
    id: 'flower',
    title: 'Short clip (MDN sample)',
    src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    poster: 'https://picsum.photos/id/152/800/450',
    caption:
      'Video test: "Breaking: rare flower bloom filmed in Antarctica 2024" — verify caption vs. actual footage.',
  },
  {
    id: 'bbb',
    title: 'Longer sample (Big Buck Bunny)',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    poster: 'https://picsum.photos/id/575/800/450',
    caption: 'Classic test file; good for scrubbing timeline / key-frame style checks.',
  },
] as const

const DOCS = [
  {
    label: 'Sample PDF (university hosted)',
    href: 'https://www.africau.edu/images/default/sample.pdf',
  },
  {
    label: 'W3C accessibility PDF example',
    href: 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.pdf',
  },
  {
    label: 'Mozilla developer PDF (redirects to stable host)',
    href: 'https://developer.mozilla.org/en-US/pdf/Open_source_documentation.pdf',
  },
] as const

export default function ExtensionTestPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <InteractiveBackground />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'rgba(0,212,255,0.04)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl"
          style={{ background: 'rgba(139,92,246,0.04)' }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 relative z-10 pb-24">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>
        </div>

        <header className="mb-10 text-center space-y-3">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: 'rgba(0,212,255,0.08)',
              border: '1px solid rgba(0,212,255,0.2)',
              color: '#00d4ff',
            }}
          >
            <FlaskConical size={12} />
            Extension sandbox
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold gradient-text-cyan"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Extension test feed
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
            Dense page of <strong className="text-foreground/90">articles</strong>,{' '}
            <strong className="text-foreground/90">images</strong>,{' '}
            <strong className="text-foreground/90">videos</strong>, and{' '}
            <strong className="text-foreground/90">document links</strong> so you can open the VeritasAI
            extension, scan this tab, and tap <span className="text-cyan">Reveal</span> on each block.
            Media URLs are public HTTPS samples (picsum, MDN, Google sample bucket).
          </p>
        </header>

        {/* Standalone post-style block (mimics a social card) */}
        <section
          className="rounded-2xl p-6 mb-8 glass-card"
          style={{ border: '1px solid rgba(0,212,255,0.12)' }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Synthetic post (for scraper)
          </p>
          <p className="text-foreground text-sm leading-relaxed mb-4">
            Scientists confirm 5G towers caused unusual weather patterns in coastal cities last week.
            Officials deny the link. #breaking
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10">text-only</span>
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10">claim-like</span>
          </div>
        </section>

        {/* Articles with images */}
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <ImageIcon className="w-5 h-5 text-cyan" />
          Articles with images
        </h2>

        <div className="space-y-10 mb-14">
          {IMAGES.map((img) => (
            <article
              key={img.id}
              className="rounded-2xl overflow-hidden glass-card"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <figure className="bg-black/30">
                {/* eslint-disable-next-line @next/next/no-img-element -- test page uses third-party URLs */}
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-auto max-h-[420px] object-cover"
                  loading="lazy"
                  width={1200}
                  height={675}
                />
              </figure>
              <div className="p-5 space-y-2">
                <h3 className="text-base font-semibold text-foreground">{img.alt}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{img.caption}</p>
              </div>
            </article>
          ))}
        </div>

        {/* Videos */}
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Video className="w-5 h-5 text-purple-400" />
          Videos
        </h2>

        <div className="space-y-10 mb-14">
          {VIDEOS.map((v) => (
            <article
              key={v.id}
              className="rounded-2xl overflow-hidden glass-card"
              style={{ border: '1px solid rgba(139,92,246,0.15)' }}
            >
              <video
                className="w-full bg-black max-h-[360px]"
                controls
                playsInline
                preload="metadata"
                poster={v.poster}
              >
                <source src={v.src} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <div className="p-5 space-y-2">
                <h3 className="text-base font-semibold text-foreground">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.caption}</p>
              </div>
            </article>
          ))}
        </div>

        {/* Documents */}
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <FileText className="w-5 h-5 text-amber-500" />
          Document links
        </h2>

        <article
          className="rounded-2xl p-6 glass-card mb-10"
          style={{ border: '1px solid rgba(245,158,11,0.15)' }}
        >
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            The extension&apos;s generic scraper may surface these as activity items. Full PDF analysis still
            goes through the main app upload flow; this page is mainly for{' '}
            <span className="text-foreground/90">text + media + URL</span> patterns.
          </p>
          <ul className="space-y-3">
            {DOCS.map((d) => (
              <li key={d.href}>
                <a
                  href={d.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-cyan hover:underline"
                >
                  <ExternalLink size={14} />
                  {d.label}
                </a>
                <span className="block text-xs text-muted-foreground mt-0.5 truncate max-w-full">{d.href}</span>
              </li>
            ))}
          </ul>
        </article>

        <footer className="text-center text-xs text-muted-foreground border-t border-white/10 pt-8">
          <p>
            Open this page on{' '}
            <code className="text-cyan/90 bg-white/5 px-1.5 py-0.5 rounded">http://localhost:3001/extension-test</code>{' '}
            (or your deployed URL), then use the VeritasAI extension popup on this tab.
          </p>
        </footer>
      </div>
    </div>
  )
}
