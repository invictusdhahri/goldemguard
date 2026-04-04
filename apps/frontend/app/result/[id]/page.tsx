import dynamic from 'next/dynamic';

const ResultPageClient = dynamic(
  () => import('@/components/result/ResultPageClient').then((m) => m.ResultPageClient),
  {
    ssr: false,
    loading: () => (
      <main className="bg-grid-sm min-h-screen">
        <div className="mx-auto max-w-2xl px-4 py-20">
          <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-obsidian-300/60" />
          <div className="glass-card h-64 animate-pulse rounded-2xl bg-obsidian-200/40" />
        </div>
      </main>
    ),
  },
);

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultPageClient jobId={id} />;
}
