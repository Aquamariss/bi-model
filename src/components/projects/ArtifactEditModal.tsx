'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { Artifact, ArtifactRole, ArtifactType } from '@/lib/types'
import { cn } from '@/lib/utils'

const diagramTypes: { value: ArtifactType; label: string }[] = [
  { value: 'bpmn',      label: 'BPMN' },
  { value: 'orgchart',  label: 'Organigramme' },
  { value: 'sequence',  label: 'Séquence' },
  { value: 'flowchart', label: 'Flowchart' },
  { value: 'image',     label: 'Image' },
  { value: 'url',       label: 'URL' },
  { value: 'text',      label: 'Texte' },
  { value: 'other',     label: 'Autre' },
]

interface Props {
  artifact: Artifact
  onClose: () => void
  onSave: (updated: Artifact) => void
}

export function ArtifactEditModal({ artifact, onClose, onSave }: Props) {
  const supabase = createClient()

  const [name, setName] = useState(artifact.name)
  const [description, setDescription] = useState(artifact.description ?? '')
  const [type, setType] = useState<ArtifactType>(artifact.type)
  const [role, setRole] = useState<ArtifactRole>(artifact.role)
  const [contentText, setContentText] = useState('')
  const [loadingContent, setLoadingContent] = useState(true)
  const [saving, setSaving] = useState(false)

  // Charger le contenu de la dernière version
  useEffect(() => {
    supabase
      .from('artifact_versions')
      .select('content_text')
      .eq('artifact_id', artifact.id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.content_text) setContentText(data.content_text)
        setLoadingContent(false)
      })
  }, [artifact.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Mettre à jour l'artifact
    const { data: updated } = await supabase
      .from('artifacts')
      .update({ name, description: description || null, type, role })
      .eq('id', artifact.id)
      .select()
      .single()

    // Si le contenu a changé, créer une nouvelle version
    if (contentText !== (artifact.content_text ?? '')) {
      const { data: lastVersion } = await supabase
        .from('artifact_versions')
        .select('version_number')
        .eq('artifact_id', artifact.id)
        .order('version_number', { ascending: false })
        .limit(1)
        .single()

      const nextVersion = (lastVersion?.version_number ?? 0) + 1
      await supabase.from('artifact_versions').insert({
        artifact_id: artifact.id,
        content_text: contentText,
        version_number: nextVersion,
      })
    }

    if (updated) onSave(updated)
    setSaving(false)
    onClose()
  }

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  // Détermine si le champ contenu est pertinent
  const showContent = ['bpmn', 'orgchart', 'sequence', 'flowchart', 'text', 'url', 'other'].includes(type)
  const contentLabel = type === 'url' ? 'URL' : 'Code / Texte'
  const contentPlaceholder = type === 'url'
    ? 'https://...'
    : `flowchart TD\n  A[Début] --> B[Étape 1]`

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-800">Modifier l'artifact</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{artifact.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Nom */}
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-medium">
              Nom <span className="text-red-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-slate-200"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-slate-700 font-medium">
                Description <span className="text-slate-400 font-normal">(facultatif)</span>
              </Label>
              <span className="flex items-center gap-1 text-xs text-violet-500">
                <Sparkles className="w-3 h-3" /> IA peut générer
              </span>
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez la nature et la valeur de cet artifact pour le RAG..."
              className="border-slate-200 text-sm"
              style={{ minHeight: '72px', maxHeight: '140px', resize: 'vertical', overflowY: 'auto' }}
            />
          </div>

          {/* Contenu (code / URL) */}
          {showContent && (
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-medium">{contentLabel}</Label>
              {loadingContent ? (
                <div className="flex items-center justify-center h-16 border border-slate-200 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                </div>
              ) : (
                <Textarea
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  placeholder={contentPlaceholder}
                  className="border-slate-200 font-mono text-xs"
                  style={{ minHeight: '120px', maxHeight: '260px', resize: 'vertical', overflowY: 'auto' }}
                />
              )}
              {!loadingContent && contentText && (
                <p className="text-xs text-slate-400">
                  Une modification du contenu créera une nouvelle version de l'artifact.
                </p>
              )}
            </div>
          )}

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-medium">Type</Label>
            <div className="flex flex-wrap gap-1.5">
              {diagramTypes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                    type === t.value
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rôle */}
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-medium">
              Rôle <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              {([
                { value: 'example', label: '⭐ Étalon',   sub: 'Modèle à imiter',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
                { value: 'context', label: '📋 Contexte', sub: 'Information à connaître', cls: 'bg-amber-50 text-amber-700 border-amber-300' },
              ] as const).map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={cn(
                    'flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors',
                    role === r.value ? r.cls : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  )}
                >
                  {r.label}
                  <span className="block text-xs font-normal opacity-70">{r.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enregistrement...</> : 'Enregistrer les modifications'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-500">
              Annuler
            </Button>
          </div>

        </form>
      </div>
    </div>
  )
}
