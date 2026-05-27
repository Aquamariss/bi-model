export type DiagramType = 'bpmn' | 'orgchart' | 'sequence' | 'flowchart' | 'auto'

export interface CompanyLink {
  id: string
  label: string
  url: string
}

export interface CompanySettings {
  name: string
  description: string
  links: CompanyLink[]
  ai_summary: string       // reformulé par Claude, injecté dans les prompts agents
  ai_summary_updated_at: string | null
}
export type ArtifactType = 'bpmn' | 'orgchart' | 'sequence' | 'flowchart' | 'image' | 'url' | 'text' | 'other'
export type ArtifactRole = 'context' | 'example'
export type ArtifactSource = 'user_upload' | 'generated'
export type TaskStatus = 'draft' | 'in_progress' | 'done'

export interface Project {
  id: string
  name: string
  description: string
  scope: string
  rules_text: string
  created_at: string
  updated_at: string
  artifact_count?: number
  task_count?: number
}

export interface Artifact {
  id: string
  project_id: string
  name: string
  description?: string
  type: ArtifactType
  role: ArtifactRole
  source: ArtifactSource
  created_at: string
  content_text?: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string
  diagram_type: DiagramType
  status: TaskStatus
  created_at: string
}

export interface TaskResult {
  id: string
  task_id: string
  diagram_type: DiagramType
  code_content: string
  version_number: number
  is_approved: boolean
  created_at: string
}

export interface TaskMessage {
  id: string
  task_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}
