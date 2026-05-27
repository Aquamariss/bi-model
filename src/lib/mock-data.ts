import { Project, Artifact, Task, TaskResult, TaskMessage, CompanySettings } from './types'

export const mockCompanySettings: CompanySettings = {
  name: 'Acme Corp',
  description: "Acme Corp est une entreprise française de conseil en transformation digitale, fondée en 2010. Nous accompagnons des PME et ETI dans la modélisation, l'optimisation et la digitalisation de leurs processus métier. Nos équipes couvrent les domaines RH, finance, ventes, production et IT. Nos clients sont majoritairement dans les secteurs industrie, services B2B et distribution.",
  links: [
    { id: 'l1', label: 'Site web', url: 'https://www.acmecorp.fr' },
    { id: 'l2', label: 'LinkedIn', url: 'https://linkedin.com/company/acmecorp' },
    { id: 'l3', label: 'Documentation interne', url: 'https://confluence.acmecorp.fr' },
  ],
  ai_summary: "Acme Corp est un cabinet de conseil en transformation digitale (France, fondé 2010) spécialisé dans la modélisation et l'optimisation des processus métier pour PME/ETI. Secteurs couverts : RH, finance, ventes, production, IT. Clients : industrie, services B2B, distribution. Les modèles doivent refléter la rigueur méthodologique d'un cabinet de conseil et utiliser une terminologie professionnelle en français.",
  ai_summary_updated_at: '2026-05-20T10:00:00Z',
}

export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Ressources Humaines',
    description: "Modélisation des processus RH de l'entreprise : recrutement, onboarding, évaluation annuelle et offboarding.",
    scope: "Périmètre : toutes les entités françaises. Exclu : filiales étrangères.",
    rules_text: "- Toujours inclure le rôle Valideur RH dans les processus d'approbation\n- Utiliser les swim lanes par département\n- Les délais SLA doivent être indiqués sur chaque tâche critique\n- Notation en français uniquement",
    created_at: '2026-04-10T09:00:00Z',
    updated_at: '2026-05-18T14:30:00Z',
    artifact_count: 4,
    task_count: 7,
  },
  {
    id: '2',
    name: 'Ventes & CRM',
    description: "Processus de vente B2B : qualification des leads, cycle de vente, signature et suivi client.",
    scope: "Équipe commerciale France + Europe du Sud.",
    rules_text: "- Pipeline en 5 étapes : Lead → Qualifié → Proposition → Négociation → Signé\n- Inclure les points d'escalade manager\n- Chaque étape doit avoir un critère de sortie clair",
    created_at: '2026-03-22T10:00:00Z',
    updated_at: '2026-05-15T11:00:00Z',
    artifact_count: 6,
    task_count: 12,
  },
  {
    id: '3',
    name: 'Production & Qualité',
    description: "Modélisation des processus de fabrication et contrôle qualité pour les lignes de production.",
    scope: "Usines de Lyon et Bordeaux.",
    rules_text: "- Respecter la norme ISO 9001\n- Inclure les points de contrôle qualité obligatoires\n- Documenter les procédures d'exception",
    created_at: '2026-02-05T08:00:00Z',
    updated_at: '2026-05-10T16:00:00Z',
    artifact_count: 9,
    task_count: 5,
  },
]

export const mockArtifacts: Artifact[] = [
  {
    id: 'a1',
    project_id: '1',
    name: 'Processus recrutement CDI — v3 approuvée',
    description: 'Modèle BPMN du processus complet de recrutement CDI validé par la DRH en mars 2026. Sert de référence pour tous les nouveaux processus RH.',
    type: 'bpmn',
    role: 'example',
    source: 'generated',
    created_at: '2026-03-15T10:00:00Z',
    content_text: `flowchart TD\n  A[Besoin identifié] --> B[Validation DRH]\n  B --> C[Publication offre]\n  C --> D[Tri CVs]\n  D --> E{Présélection?}\n  E -->|Oui| F[Entretien RH]\n  E -->|Non| G[Refus automatique]\n  F --> H{Validé?}\n  H -->|Oui| I[Entretien manager]\n  H -->|Non| G\n  I --> J[Offre]\n  J --> K[Signature]`,
  },
  {
    id: 'a2',
    project_id: '1',
    name: 'Organigramme RH — structure 2026',
    description: 'Structure hiérarchique du département RH mise à jour en janvier 2026.',
    type: 'orgchart',
    role: 'context',
    source: 'user_upload',
    created_at: '2026-01-20T09:00:00Z',
  },
  {
    id: 'a3',
    project_id: '1',
    name: 'Charte de modélisation interne',
    description: 'Document texte définissant les conventions de nommage et de modélisation utilisées dans toute l\'entreprise.',
    type: 'text',
    role: 'context',
    source: 'user_upload',
    created_at: '2026-01-05T08:00:00Z',
    content_text: "Convention: utiliser le verbe à l'infinitif pour nommer les tâches. Exemple : 'Valider le document' et non 'Validation du document'.",
  },
  {
    id: 'a4',
    project_id: '1',
    name: "Référence Confluence — Politique RH",
    description: "Page Confluence avec la politique RH officielle de l'entreprise.",
    type: 'url',
    role: 'context',
    source: 'user_upload',
    created_at: '2026-02-10T11:00:00Z',
    content_text: 'https://confluence.internal/rh/politique-generale',
  },
]

export const mockTasks: Task[] = [
  {
    id: 't1',
    project_id: '1',
    title: 'Processus onboarding nouvelle recrue',
    description: "Modéliser le processus d'accueil d'un nouveau collaborateur depuis la signature jusqu'à la fin de la période d'essai (90 jours). Inclure les étapes IT, RH et manager.",
    diagram_type: 'bpmn',
    status: 'done',
    created_at: '2026-05-10T09:00:00Z',
  },
  {
    id: 't2',
    project_id: '1',
    title: 'Processus entretien annuel',
    description: "Cartographier le processus d'évaluation annuelle : préparation, entretien, validation N+2, et archivage RH.",
    diagram_type: 'flowchart',
    status: 'in_progress',
    created_at: '2026-05-18T14:00:00Z',
  },
  {
    id: 't3',
    project_id: '1',
    title: 'Organigramme équipe Data',
    description: "Représenter la structure de l'équipe Data (8 personnes) avec les rattachements hiérarchiques et fonctionnels.",
    diagram_type: 'orgchart',
    status: 'draft',
    created_at: '2026-05-20T10:00:00Z',
  },
]

export const mockTaskResult: TaskResult = {
  id: 'r1',
  task_id: 't2',
  diagram_type: 'flowchart',
  code_content: `flowchart TD
  A([Début — Octobre]) --> B[RH envoie les formulaires]
  B --> C[Collaborateur remplit l'auto-évaluation]
  C --> D[Manager prépare l'évaluation]
  D --> E[Entretien en face-à-face]
  E --> F{Accord sur l'évaluation?}
  F -->|Oui| G[Signature des deux parties]
  F -->|Non| H[Médiation RH]
  H --> E
  G --> I[Transmission à la DRH]
  I --> J{Validation N+2?}
  J -->|Validé| K[Archivage & Plan de développement]
  J -->|Refus| L[Révision]
  L --> G
  K --> M([Fin])`,
  version_number: 2,
  is_approved: false,
  created_at: '2026-05-18T15:30:00Z',
}

export const mockMessages: TaskMessage[] = [
  {
    id: 'm1',
    task_id: 't2',
    role: 'user',
    content: "Lance la modélisation du processus d'entretien annuel.",
    created_at: '2026-05-18T14:05:00Z',
  },
  {
    id: 'm2',
    task_id: 't2',
    role: 'assistant',
    content: "J'ai généré un diagramme flowchart pour le processus d'entretien annuel (v1). Il couvre les étapes de préparation, l'entretien, la validation N+2 et l'archivage. Souhaitez-vous des ajustements ?",
    created_at: '2026-05-18T14:05:30Z',
  },
  {
    id: 'm3',
    task_id: 't2',
    role: 'user',
    content: "Rajoute une étape de médiation RH si l'employé et le manager ne sont pas d'accord sur l'évaluation.",
    created_at: '2026-05-18T15:20:00Z',
  },
  {
    id: 'm4',
    task_id: 't2',
    role: 'assistant',
    content: "Mis à jour (v2) : ajout d'une branche de médiation RH après le désaccord, avec retour vers l'entretien après médiation.",
    created_at: '2026-05-18T15:30:00Z',
  },
]
