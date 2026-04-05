import { DocsPage } from '@/components/docs/DocsPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation — GolemGuard',
  description:
    'GolemGuard: in-app docs aligned with docs/FEATURES.md, GOLEM_GUARD.md, TESTING.md, and DEPLOYMENT.md — architecture, APIs, pipelines, and setup.',
};

export default function DocsRoute() {
  return <DocsPage />;
}
