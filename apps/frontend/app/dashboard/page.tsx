import Link from 'next/link'

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-grid px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-2 text-slate-400">Overview of your detection activity.</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/history"
          className="btn-primary inline-flex items-center justify-center rounded-lg px-6 py-3 font-semibold no-underline"
        >
          History
        </Link>
        <Link
          href="/upload"
          className="btn-ghost inline-flex items-center justify-center rounded-lg border border-slate-600 px-6 py-3 font-semibold text-slate-200 no-underline hover:border-slate-500 hover:bg-slate-800/50"
        >
          New analysis
        </Link>
      </div>
    </main>
  )
}
