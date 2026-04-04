export const DOCS_NAV = [
  { id: 'features', label: 'Features' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'tech-stack', label: 'Tech Stack' },
  { id: 'installation', label: 'Installation' },
  { id: 'testing', label: 'Testing' },
  { id: 'models', label: 'Models Used' },
  { id: 'license', label: 'License' },
  { id: 'hackathon', label: 'Hackathon' },
  { id: 'acknowledgments', label: 'Acknowledgments' },
  { id: 'team', label: 'Team' },
] as const;

export type DocsNavId = (typeof DOCS_NAV)[number]['id'];
