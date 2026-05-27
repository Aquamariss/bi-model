'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Zap, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArtifactCard } from '@/components/projects/ArtifactCard'
import { createClient } from '@/lib/supabase/client'
import { DiagramType, Artifact, Project } from '@/lib/types'
import { cn } from '@/lib/utils'

const diagramTypes: { value: DiagramType; label: string; description: string }[] = [
  { value: 'auto',      label: 'Auto',         description: "L'IA choisit le type adapté" },
  { value: 'bpmn',      label: 'BPMN',         description: 'Processus métier avec couloirs' },
  { value: 'orgchart',  label: 'Organigramme', description: 'Structure hiérarchique' },
  { value: 'flowchart', label: 'Flowchart',    description: 'Flux et décisions' },
  { value: 'sequence',  label: 'Séquence',     description: 'Interactions entre acteurs' },
]

function NewTaskForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const supabase = createClient()

  const [project, setProject] = useState<Project | null>(null)
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [diagramType, setDiagramType] = useState<DiagramType>('auto')
  const [selectedArtifactIds, setSelectedArtifactIds] = useState<string[]>([])

  useEffect(() => {
    if (!projectId) { router.push('/projects'); return }
    async function load() {
      const [{ data: proj }, { data: arts }] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('artifacts').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      ])
      if (!proj) { router.push('/projects'); return }
      setProject(proj)
      setArtifacts(arts ?? [])
      setLoading(false)
    }
    load()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleArtifact = (id: string) =>
    setSelectedArtifactIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project) return
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Créer la tâche
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        project_id: project.id,
        user_id: user.id,
        title,
        description,
        diagram_type: diagramType,
        status: 'in_progress',
      })
      .select()
      .single()

    if (taskError || !task) {
      setError(taskError?.message ?? 'Erreur lors de la création de la tâche')
      setSaving(false)
      return
    }

    // Lier les artifacts sélectionnés
    if (selectedArtifactIds.length > 0) {
      const links = selectedArtifactIds.map((artifactId) => {
        const art = artifacts.find((a) => a.id === artifactId)
        return { task_id: task.id, artifact_id: artifactId, role: art?.role ?? 'context' }
      })
      await supabase.from('task_artifacts').insert(links)
    }

    router.push(`/tasks/${task.id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    )
  }

  if (!project) return null

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/projects/${project.id}`}>
          <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nouvelle tâche de modélisation</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Projet : <span className="text-violet-600 font-medium">{project.name}</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 mb-5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Description */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Ce que vous souhaitez modéliser</h2>
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-medium">Titre <span className="text-red-500">*</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex : Processus onboarding nouvelle recrue"
              className="border-slate-200"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-medium">Description détaillée <span className="text-red-500">*</span></Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez ce que vous souhaitez modéliser : acteurs, étapes clés, décisions importantes, exceptions..."
              className="border-slate-200 min-h-[110px]"
              style={{ resize: 'vertical' }}
              required
            />
          </div>
        </div>

        {/* Diagram type */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Type de diagramme</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {diagramTypes.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setDiagramType(t.value)}
                className={cn(
                  'p-3 rounded-lg text-left border transition-all',
                  diagramType === t.value
                    ? 'bg-violet-50 border-violet-300 text-violet-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs opacity-60 mt-0.5">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Artifacts */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div>
            <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Artifacts de référence</h2>
            <p className="text-xs text-slate-400 mt-1">
              Sélectionnez les artifacts à transmettre à l'IA pour cette tâche.
            </p>
          </div>
          {artifacts.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Aucun artifact dans ce projet. Facultatif.</p>
          ) : (
            <div className="space-y-2">
              {artifacts.map((artifact) => (
                <button
                  key={artifact.id}
                  type="button"
                  onClick={() => toggleArtifact(artifact.id)}
                  className={cn(
                    'w-full text-left rounded-lg border transition-all',
                    selectedArtifactIds.includes(artifact.id)
                      ? 'border-violet-300 bg-violet-50'
                      : 'border-transparent hover:border-slate-200'
                  )}
                >
                  <ArtifactCard artifact={artifact} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white gap-2 px-6">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {saving ? 'Création...' : 'Lancer la modélisation'}
          </Button>
          <Link href={`/projects/${project.id}`}>
            <Button variant="ghost" className="text-slate-500">Annuler</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}

export default function NewTaskPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>}>
      <NewTaskForm />
    </Suspense>
  )
}
