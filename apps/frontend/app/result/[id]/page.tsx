export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Analysis Result</h1>
      <p className="mt-2 text-gray-600">Result for job: {id}</p>
    </main>
  );
}
