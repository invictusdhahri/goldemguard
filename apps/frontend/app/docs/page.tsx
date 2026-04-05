import { DocsPage } from '@/components/docs/DocsPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation — GaulemGuard',
  description:
    'GaulemGuard documentation: architecture, installation, tech stack, models, and testing for the multimodal AI-generated content detection platform.',
};

export default function DocsRoute() {
  return <DocsPage />;
}
