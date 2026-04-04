import { DocsPage } from '@/components/docs/DocsPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation — VeritasAI',
  description:
    'VeritasAI documentation: architecture, installation, tech stack, models, and testing for the multimodal deepfake detection platform.',
};

export default function DocsRoute() {
  return <DocsPage />;
}
