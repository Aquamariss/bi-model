'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle2, ChevronDown, ChevronUp,
  Zap, Loader2, AlertCircle, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DiagramPreview } from '@/components/tasks/DiagramPreview'
import { ChatPanel } from '@/components/tasks/ChatPanel'
import { ArtifactCard } from '@/components/projects/ArtifactCard'
import { createClient } from '@/lib/supabase/client'
import { Task, Project, Artifact, TaskMessage, TaskResult } from '@/lib/types'
import { cn } from '@/lib/utils'

const diagramTypeLabel: Record<string, string> = {
  bpmn: 'BPMN', orgchart: 'Organigramme',
  sequence: 'Séquence', flowchart: 'Flowchart', auto: 'Auto',
}

/** Extrait le bloc de code Mermaid / XML / BPMN d'un texte brut */
function extractCode(text: string): string | null {
  const match = text.match(/```(?:mermaid|xml|bpmn)?\n([\s\S]*?)```/)
  return match ? match[1].trim() : null
}

/** Formate un message assistant (code → étiquette lisible) */
function formatAssistantContent(content: string, version?: number): string {
  if (content.includes('```')) {
    return version
      ? `📊 Diagramme v${version} généré — voir l'aperçu ci-contre.`
      : `📊 Diagramme généré — voir l'aperçu ci-contre.`
  }
  return content
}

export default function TaskEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const supabase = createClient()

  /* ── État principal ── */
  const [task,      setTask]      = useState<Task | null>(null)
  const [project,   setProject]   = useState<Project | null>(null)
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [messages,  setMessages]  = useState<TaskMessage[]>([])
  const [result,    setResult]    = useState<TaskResult | null>(null)

  /* ── État UI ── */
  const [currentCode,    setCurrentCode]    = useState('')
  const [isGenerating,   setIsGenerating]   = useState(false)
  const [isApproving,    setIsApproving]    = useState(false)
  const [showContext,    setShowContext]    = useState(false)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState<string | null>(null)
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [isDeleting,     setIsDeleting]     = useState(false)

  /* Version affichée dans la top bar (mis à jour après chaque génération) */
  const [displayVersion, setDisplayVersion] = useState(0)

  /* Messages affichés dans le chat (inclut les messages "en cours" pendant le stream) */
  const [displayMessages, setDisplayMessages] = useState<TaskMessage[]>([])

  /* ── Chargement initial ── */
  useEffect(() => {
    async function load() {
      const { data: t } = await supabase.from('tasks').select('*').eq('id', id).single()
      if (!t) { setLoading(false); return }
      setTask(t)

      const [{ data: proj }, { data: tas }, { data: msgs }, { data: res }] =
        await Promise.all([
          supabase.from('projects').select('*').eq('id', t.project_id).single(),
          supabase.from('task_artifacts').select('artifact_id').eq('task_id', id),
          supabase.from('task_messages').select('*').eq('task_id', id).order('created_at', { ascending: true }),
          supabase.from('task_results').select('*').eq('task_id', id).order('version_number', { ascending: false }).limit(1).single(),
        ])

      setProject(proj ?? null)
      setMessages(msgs ?? [])
      if (res) {
        setResult(res)
        setCurrentCode(res.code_content)
        setDisplayVersion(res.version_number)
      }

      // Charger les artifacts liés
      if (tas?.length) {
        const { data: arts } = await supabase
          .from('artifacts').select('*')
          .in('id', tas.map((ta: { artifact_id: string }) => ta.artifact_id))
        setArtifacts(arts ?? [])
      }

      setLoading(false)
    }
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Synchroniser displayMessages depuis messages */
  useEffect(() => {
    setDisplayMessages(
      messages.map((m, idx) => {
        if (m.role !== 'assistant') return m
        // Numéro de version = rang de ce message assistant dans la liste
        const version = messages.slice(0, idx + 1).filter((x) => x.role === 'assistant').length
        return { ...m, content: formatAssistantContent(m.content, version) }
      })
    )
  }, [messages])

  /* ── Génération / correction ── */
  const generate = useCallback(async (userMessage?: string) => {
    if (!task) return
    setIsGenerating(true)
    setError(null)

    // Affichage optimiste du message utilisateur dans le chat
    if (userMessage) {
      const tmpMsg: TaskMessage = {
        id: `tmp-${Date.now()}`,
        task_id: id,
        role: 'user',
        content: userMessage,
        created_at: new Date().toISOString(),
      }
      setDisplayMessages((prev) => [...prev, tmpMsg])
    }

    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: id, userMessage: userMessage ?? null }),
      })

      if (!resp.ok || !resp.body) {
        const txt = await resp.text()
        throw new Error(txt || `HTTP ${resp.status}`)
      }

      /* Lire le stream */
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk
        const code = extractCode(accumulated)
        if (code) setCurrentCode(code)
      }

      /* Stream terminé → recharger depuis la DB */
      const [{ data: msgs }, { data: res }] = await Promise.all([
        supabase
          .from('task_messages').select('*')
          .eq('task_id', id).order('created_at', { ascending: true }),
        supabase
          .from('task_results').select('*')
          .eq('task_id', id)
          .order('version_number', { ascending: false })
          .limit(1).single(),
      ])

      if (msgs) setMessages(msgs)
      if (res) {
        setResult(res)
        setCurrentCode(res.code_content)
        setDisplayVersion(res.version_number)
      }
      // Mettre à jour le statut local
      setTask((t) => t ? { ...t, status: 'in_progress' } : t)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setIsGenerating(false)
    }
  }, [task, id, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Suppression ── */
  const handleDeleteTask = async () => {
    if (!task) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
      return
    }
    setIsDeleting(true)
    await Promise.all([
      supabase.from('task_results').delete().eq('task_id', id),
      supabase.from('task_messages').delete().eq('task_id', id),
      supabase.from('task_artifacts').delete().eq('task_id', id),
    ])
    await supabase.from('tasks').delete().eq('id', id)
    router.push(task.project_id ? `/projects/${task.project_id}` : '/projects')
  }

  /* ── Approbation ── */
  const handleApprove = async () => {
    if (!result) return
    setIsApproving(true)
    await Promise.all([
      supabase.from('task_results').update({ is_approved: true }).eq('id', result.id),
      supabase.from('tasks').update({ status: 'done' }).eq('id', id),
    ])
    setResult((r) => r ? { ...r, is_approved: true } : r)
    setTask((t) => t ? { ...t, status: 'done' } : t)
    setIsApproving(false)
  }

  /* ── Rendu ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-slate-600">Tâche introuvable.</p>
        <Link href="/projects"><Button variant="outline">Retour aux projets</Button></Link>
      </div>
    )
  }

  const isApproved = result?.is_approved ?? false
  const hasResult  = !!currentCode

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <Link href={project ? `/projects/${project.id}` : '/projects'}>
          <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-slate-900 text-sm truncate">{task.title}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex-shrink-0">
              {diagramTypeLabel[task.diagram_type]}
            </span>
            {displayVersion > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 flex-shrink-0">
                v{displayVersion}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate">
            {project?.name}{task.description ? ` · ${task.description.slice(0, 80)}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Bouton suppression avec double confirmation */}
          <Button
            variant={confirmDelete ? 'destructive' : 'ghost'}
            size="sm"
            onClick={handleDeleteTask}
            disabled={isDeleting || isGenerating}
            className={cn(
              'gap-1.5 text-sm transition-all',
              !confirmDelete && 'text-slate-400 hover:text-red-500 hover:bg-red-50'
            )}
          >
            {isDeleting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Trash2 className="w-3.5 h-3.5" />}
            {confirmDelete ? 'Confirmer la suppression' : 'Supprimer'}
          </Button>

          <div className="w-px h-5 bg-slate-200" />

          {isApproved ? (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> Approuvé & sauvegardé
            </div>
          ) : (
            <Button
              onClick={handleApprove}
              disabled={!hasResult || isApproving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-sm disabled:opacity-50"
            >
              {isApproving
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <CheckCircle2 className="w-3.5 h-3.5" />}
              Approuver & sauvegarder
            </Button>
          )}
        </div>
      </div>

      {/* ── Bannière erreur ── */}
      {error && (
        <div className="flex items-center gap-2 px-6 py-2 bg-red-50 border-b border-red-100 text-sm text-red-600 flex-shrink-0">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Context bar (collapsible) ── */}
      {artifacts.length > 0 && (
        <div className="bg-slate-50 border-b border-slate-200 flex-shrink-0">
          <button
            onClick={() => setShowContext(!showContext)}
            className="flex items-center gap-2 w-full px-6 py-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            {showContext ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Artifacts de contexte ({artifacts.length})
          </button>
          {showContext && (
            <div className="px-6 pb-3 grid grid-cols-2 gap-2">
              {artifacts.map((a) => <ArtifactCard key={a.id} artifact={a} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Zone principale ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Aperçu diagramme — 60 % */}
        <div className="flex-[3] p-4 overflow-hidden flex flex-col">
          {!hasResult && !isGenerating ? (
            /* État initial : bouton de génération */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-white rounded-xl border border-slate-200">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700 mb-1">Aucun diagramme généré</p>
                <p className="text-xs text-slate-400 mb-4 max-w-xs">
                  {task.description || 'Lancez la génération pour créer le diagramme.'}
                </p>
                <Button
                  onClick={() => generate()}
                  className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
                >
                  <Zap className="w-4 h-4" /> Générer le diagramme
                </Button>
              </div>
            </div>
          ) : isGenerating && !hasResult ? (
            /* Génération initiale en cours */
            <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-slate-200">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                <p className="text-sm">Génération en cours…</p>
              </div>
            </div>
          ) : (
            <DiagramPreview code={currentCode} type={task.diagram_type} />
          )}
        </div>

        {/* Chat — 40 % */}
        <div className="flex-[2] p-4 pl-0 overflow-hidden">
          <ChatPanel
            messages={displayMessages}
            onSend={(msg) => generate(msg)}
            isLoading={isGenerating}
          />
        </div>
      </div>
    </div>
  )
}
