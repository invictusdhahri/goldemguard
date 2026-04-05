/** In-app docs sections — aligned with repository markdown under /docs. */
export const DOCS_NAV = [
  { id: 'repo-docs', label: 'Repository docs' },
  { id: 'why-golemguard', label: 'Why GolemGuard' },
  { id: 'features', label: 'Product features' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'tech-stack', label: 'Tech stack' },
  { id: 'installation', label: 'Installation' },
  { id: 'testing', label: 'Testing' },
  { id: 'api-reference', label: 'API reference' },
  { id: 'models', label: 'Models & pipelines' },
  { id: 'license', label: 'License' },
  { id: 'hackathon', label: 'Hackathon' },
  { id: 'acknowledgments', label: 'Acknowledgments' },
  { id: 'team', label: 'Team' },
] as const;

export type DocsNavId = (typeof DOCS_NAV)[number]['id'];
