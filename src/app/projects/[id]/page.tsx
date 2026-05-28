'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Edit, Plus, FileText, CheckSquare,
  Clock, CheckCircle2, Circle, Zap, Loader2, Check, X, Trash2, Share2
} from 'lucide-react'
import { ArtifactCard } from '@/components/projects/ArtifactCard'
import { ArtifactModal } from '@/components/projects/ArtifactModal'
import { ShareModal } from '@/components/projects/ShareModal'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { RichTextViewer } from '@/components/ui/RichTextViewer'
import { createClient } from '@/lib/supabase/client'
import { Project, Artifact, Task, TaskStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const statusConfig: Record<TaskStatus, { label: string; icon: React.ElementType; color: string }> = {
  draft:       { label: 'Brouillon', icon: Circle,       color: 'text-slate-400' },
  in_progress: { label: 'En cours',  icon: Clock,        color: 'text-amber-500' },
  done:        { label: 'Terminé',   icon: CheckCircle2, color: 'text-emerald-500' },
}

const diagramTypeLabel: Record<string, string> = {
  bpmn: 'BPMN', orgchart: 'Organigramme', sequence: 'Séquence', flowchart: 'Flowchart', auto: 'Auto',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

type Tab = 'apercu' | 'artifacts' | 'taches'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [project, setProject] = useState<Project | null>(null)
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [tab, setTab] = useState<Tab>('apercu')
  const [showCreateArtifact, setShowCreateArtifact] = useState(false)
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null)
  const [artifactImages, setArtifactImages] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(null)
  const [deletingTaskId, setDeletingTaskId]   = useState<string | null>(null)
  const [showShareModal, setShowShareModal]   = useState(false)
  const [currentUserId, setCurrentUserId]     = useState<string | null>(null)
  const [isOwner, setIsOwner]                 = useState(false)

  // Édition inline de la description
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState('')
  const [savingDesc, setSavingDesc] = useState(false)

  /* Charge les URLs signées pour les images de tous les artifacts */
  const loadImages = async (arts: Artifact[]) => {
    if (arts.length === 0) return
    const { data: versions } = await supabase
      .from('artifact_versions')
      .select('artifact_id, image_storage_path')
      .in('artifact_id', arts.map((a) => a.id))
      .not('image_storage_path', 'is', null)
      .order('version_number', { ascending: false })

    if (!versions?.length) return

    /* Garder uniquement la version la plus récente par artifact */
    const latestPaths: Record<string, string> = {}
    for (const v of versions) {
      if (!latestPaths[v.artifact_id] && v.image_storage_path)
        latestPaths[v.artifact_id] = v.image_storage_path
    }

    const paths = Object.values(latestPaths)
    if (!paths.length) return

    const { data: signedUrls } = await supabase.storage
      .from('artifacts')
      .createSignedUrls(paths, 3600)
    if (!signedUrls) return

    /* path → artifactId */
    const pathToAid: Record<string, string> = {}
    for (const [aid, path] of Object.entries(latestPaths)) pathToAid[path] = aid

    const urlMap: Record<string, string> = {}
    for (const su of signedUrls) {
      if (!su.signedUrl || !su.path) continue
      const aid = pathToAid[su.path]
      if (aid) urlMap[aid] = su.signedUrl
    }
    setArtifactImages(urlMap)
  }

  useEffect(() => {
    async function load() {
      const [{ data: { user } }, { data: proj }, { data: arts }, { data: tsks }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('projects').select('*').eq('id', id).single(),
        supabase.from('artifacts').select('*').eq('project_id', id).order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      ])
      if (!proj) { router.push('/projects'); return }
      setProject(proj)
      setDescDraft(proj.description ?? '')
      setArtifacts(arts ?? [])
      setTasks(tsks ?? [])
      setCurrentUserId(user?.id ?? null)
      setIsOwner(user?.id === proj.user_id)
      setLoading(false)
      loadImages(arts ?? [])
    }
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveDesc = async () => {
    if (!project) return
    setSavingDesc(true)
    await supabase.from('projects').update({ description: descDraft }).eq('id', project.id)
    setProject((p) => p ? { ...p, description: descDraft } : p)
    setEditingDesc(false)
    setSavingDesc(false)
  }

  const handleCancelDesc = () => {
    setDescDraft(project?.description ?? '')
    setEditingDesc(false)
  }

  const handleDeleteArtifact = async (artifactId: string) => {
    await supabase.from('artifacts').delete().eq('id', artifactId)
    setArtifacts((prev) => {
      const next = prev.filter((a) => a.id !== artifactId)
      return next
    })
    setArtifactImages((prev) => {
      const next = { ...prev }
      delete next[artifactId]
      return next
    })
  }

  const handleSaveArtifact = (updated: Artifact) => {
    setArtifacts((prev) => {
      const next = prev.map((a) => a.id === updated.id ? { ...a, ...updated } : a)
      loadImages(next)
      return next
    })
  }

  const handleDeleteTask = async (taskId: string) => {
    if (confirmDeleteTaskId !== taskId) {
      // Premier clic → demande confirmation
      setConfirmDeleteTaskId(taskId)
      setTimeout(() => setConfirmDeleteTaskId(null), 3000)
      return
    }
    // Deuxième clic → suppression effective
    setDeletingTaskId(taskId)
    setConfirmDeleteTaskId(null)
    await Promise.all([
      supabase.from('task_results').delete().eq('task_id', taskId),
      supabase.from('task_messages').delete().eq('task_id', taskId),
      supabase.from('task_artifacts').delete().eq('task_id', taskId),
    ])
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    setDeletingTaskId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    )
  }

  if (!project) return null

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'apercu', label: 'Aperçu' },
    { key: 'artifacts', label: 'Artifacts', count: artifacts.length },
    { key: 'taches', label: 'Tâches', count: tasks.length },
  ]

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/projects">
          <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
        </div>
        {/* Bouton Partager — owner uniquement */}
        {isOwner && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-slate-600"
            onClick={() => setShowShareModal(true)}
          >
            <Share2 className="w-3.5 h-3.5" /> Partager
          </Button>
        )}
        {/* Badge "Partagé" — affiché si l'utilisateur n'est pas owner */}
        {!isOwner && (
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 border border-violet-200 font-medium">
            <Share2 className="w-3 h-3" /> Partagé
          </span>
        )}
        {isOwner && (
          <Link href={`/projects/${project.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-slate-600">
              <Edit className="w-3.5 h-3.5" /> Modifier
            </Button>
          </Link>
        )}
        <Link href={`/tasks/new?projectId=${project.id}`}>
          <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white">
            <Zap className="w-3.5 h-3.5" /> Nouvelle tâche
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6 mt-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === t.key
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn('ml-2 text-xs px-1.5 py-0.5 rounded-full',
                tab === t.key ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500')}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Aperçu */}
      {tab === 'apercu' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            {/* Description — éditable inline */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Description</p>
                {!editingDesc ? (
                  <button
                    onClick={() => setEditingDesc(true)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-600 transition-colors"
                  >
                    <Edit className="w-3 h-3" /> Modifier
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleSaveDesc}
                      disabled={savingDesc}
                      className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> {savingDesc ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                    <button
                      onClick={handleCancelDesc}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Annuler
                    </button>
                  </div>
                )}
              </div>

              {editingDesc ? (
                <RichTextEditor
                  value={descDraft}
                  onChange={setDescDraft}
                  placeholder="Décrivez l'objectif et le contexte de ce projet..."
                  minHeight="100px"
                />
              ) : project.description ? (
                <RichTextViewer html={project.description} />
              ) : (
                <p className="text-sm text-slate-400 italic">
                  Aucune description.{' '}
                  <button onClick={() => setEditingDesc(true)} className="text-violet-500 hover:underline">
                    Ajouter une description
                  </button>
                </p>
              )}
            </div>

            {project.scope && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Périmètre</p>
                <p className="text-sm text-slate-700">{project.scope}</p>
              </div>
            )}
          </div>
          {project.rules_text && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Règles de modélisation</p>
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{project.rules_text}</pre>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-violet-600">{artifacts.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Artifacts</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-teal-600">{tasks.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Tâches</p>
            </div>
          </div>
        </div>
      )}

      {/* Artifacts */}
      {tab === 'artifacts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''}</p>
            <Button size="sm" onClick={() => setShowCreateArtifact(true)} className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white">
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </Button>
          </div>
          {artifacts.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun artifact pour ce projet.</p>
              <p className="text-xs mt-1">Ajoutez des exemples et du contexte pour améliorer la génération.</p>
            </div>
          )}
          {artifacts.map((a) => (
            <ArtifactCard
              key={a.id}
              artifact={a}
              imageUrl={artifactImages[a.id]}
              onEdit={setEditingArtifact}
              onDelete={handleDeleteArtifact}
            />
          ))}
        </div>
      )}

      {/* Tâches */}
      {tab === 'taches' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{tasks.length} tâche{tasks.length !== 1 ? 's' : ''}</p>
            <Link href={`/tasks/new?projectId=${project.id}`}>
              <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white">
                <Plus className="w-3.5 h-3.5" /> Nouvelle tâche
              </Button>
            </Link>
          </div>
          {tasks.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune tâche pour ce projet.</p>
            </div>
          )}
          {tasks.map((task) => {
            const conf = statusConfig[task.status]
            const Icon = conf.icon
            const isConfirming = confirmDeleteTaskId === task.id
            const isDeleting   = deletingTaskId === task.id
            return (
              <div key={task.id} className="relative group mt-2">
                {/* Zone cliquable → éditeur */}
                <div
                  onClick={() => router.push(`/tasks/${task.id}`)}
                  className="flex items-start gap-3 p-4 pr-10 bg-white rounded-xl border border-slate-200 hover:border-violet-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', conf.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{task.title || 'Sans titre'}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        {diagramTypeLabel[task.diagram_type]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>
                  </div>
                  <span className={cn('text-xs font-medium flex-shrink-0', conf.color)}>{conf.label}</span>
                </div>

                {/* Bouton supprimer (visible au survol) */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id) }}
                  disabled={isDeleting}
                  title={isConfirming ? 'Cliquez pour confirmer' : 'Supprimer la tâche'}
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 right-3 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all',
                    isConfirming
                      ? 'opacity-100 bg-red-50 text-red-600 border border-red-200'
                      : 'opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 hover:bg-red-50'
                  )}
                >
                  {isDeleting
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                  {isConfirming && 'Confirmer ?'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showCreateArtifact && (
        <ArtifactModal
          mode="create"
          projectId={project.id}
          onClose={() => setShowCreateArtifact(false)}
          onDone={(art) => {
            setArtifacts((prev) => {
              const next = [art, ...prev]
              loadImages(next)
              return next
            })
            setShowCreateArtifact(false)
          }}
        />
      )}

      {editingArtifact && (
        <ArtifactModal
          mode="edit"
          artifact={editingArtifact}
          projectId={project.id}
          onClose={() => setEditingArtifact(null)}
          onDone={handleSaveArtifact}
        />
      )}

      {showShareModal && currentUserId && (
        <ShareModal
          projectId={project.id}
          projectName={project.name}
          currentUserId={currentUserId}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}
