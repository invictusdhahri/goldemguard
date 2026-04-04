import { ResultPageClient } from '@/components/result/ResultPageClient';

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultPageClient jobId={id} />;
}
