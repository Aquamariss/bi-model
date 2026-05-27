'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, Sparkles, Loader2, Upload, FileCheck, Image as ImageIcon,
  Link, Code, FileCode, Trash2
} from 'lucide-react'
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
  mode: 'create' | 'edit'
  artifact?: Artifact          // requis en mode edit
  projectId: string
  onClose: () => void
  onDone: (artifact: Artifact) => void
}

interface VersionData {
  id: string
  content_text: string
  url: string
  storage_path: string | null
  image_storage_path: string | null
}

/* ── Petit composant zone de drop ─────────────────────────── */
function DropZone({
  label, accept, hint, file, existingName,
  onFile, onClear, dragClass,
}: {
  label: string
  accept: string
  hint: string
  file: File | null
  existingName?: string | null
  onFile: (f: File) => void
  onClear: () => void
  dragClass?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const apply = (f: File) => onFile(f)

  const current = file?.name ?? existingName

  return (
    <div className="space-y-1.5">
      <Label className="text-slate-700 font-medium">{label}</Label>
      <input
        ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) apply(f) }}
      />
      {current ? (
        <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50 rounded-lg px-4 py-3">
          <FileCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span className="flex-1 text-sm text-slate-700 truncate">{current}</span>
          {file && (
            <span className="text-xs text-slate-400 flex-shrink-0">
              {(file.size / 1024).toFixed(0)} Ko
            </span>
          )}
          <button type="button" onClick={onClear} className="text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => ref.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) apply(f) }}
          className={cn(
            'border-2 border-dashed rounded-lg px-4 py-5 text-center cursor-pointer transition-colors',
            drag || dragClass
              ? 'border-violet-400 bg-violet-50'
              : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'
          )}
        >
          <Upload className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
          <p className="text-sm text-slate-500">
            Glisser ou <span className="text-violet-600 font-medium">parcourir</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{hint}</p>
        </div>
      )}
    </div>
  )
}

/* ── Modal principal ──────────────────────────────────────── */
export function ArtifactModal({ mode, artifact, projectId, onClose, onDone }: Props) {
  const supabase = createClient()

  /* Champs de métadonnées */
  const [name, setName]              = useState(artifact?.name ?? '')
  const [description, setDescription] = useState(artifact?.description ?? '')
  const [type, setType]              = useState<ArtifactType>(artifact?.type ?? 'other')
  const [typeAuto, setTypeAuto]      = useState(mode === 'create')
  const [role, setRole]              = useState<ArtifactRole>(artifact?.role ?? 'context')

  /* Champs de contenu */
  const [code, setCode] = useState('')
  const [url, setUrl]   = useState('')

  /* Fichiers */
  const [file, setFile]   = useState<File | null>(null)
  const [image, setImage] = useState<File | null>(null)

  /* Chemins complets des fichiers existants (edit) */
  const [existingFilePath,  setExistingFilePath]  = useState<string | null>(null)
  const [existingImagePath, setExistingImagePath] = useState<string | null>(null)
  /* URL signée pour prévisualiser l'image existante */
  const [existingImageUrl,  setExistingImageUrl]  = useState<string | null>(null)
  /* URL locale (blob) pour prévisualiser l'image nouvellement sélectionnée */
  const [imagePreviewUrl,   setImagePreviewUrl]   = useState<string | null>(null)

  const [versionId, setVersionId] = useState<string | null>(null)
  const [loading,   setLoading]   = useState(mode === 'edit')
  const [saving,    setSaving]    = useState(false)

  /* Noms affichés dans les DropZones (dérivés des chemins) */
  const existingFileName  = existingFilePath  ? (existingFilePath.split('/').pop()  ?? null) : null
  const existingImageName = existingImagePath ? (existingImagePath.split('/').pop() ?? null) : null

  /* Charge la dernière version en mode édition */
  useEffect(() => {
    if (mode !== 'edit' || !artifact) return
    ;(async () => {
      const { data } = await supabase
        .from('artifact_versions')
        .select('id, content_text, url, storage_path, image_storage_path')
        .eq('artifact_id', artifact.id)
        .order('version_number', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        const v = data as unknown as VersionData
        setVersionId(v.id)
        setCode(v.content_text ?? '')
        setUrl(v.url ?? '')
        if (v.storage_path)       setExistingFilePath(v.storage_path)
        if (v.image_storage_path) {
          setExistingImagePath(v.image_storage_path)
          /* Générer l'URL signée pour l'aperçu */
          const { data: signed } = await supabase.storage
            .from('artifacts')
            .createSignedUrl(v.image_storage_path, 3600)
          if (signed?.signedUrl) setExistingImageUrl(signed.signedUrl)
        }
      }
      setLoading(false)
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* URL de prévisualisation locale pour le nouveau fichier image */
  useEffect(() => {
    if (!image) { setImagePreviewUrl(null); return }
    const url = URL.createObjectURL(image)
    setImagePreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  /* Auto-détection du type selon l'extension du fichier */
  const detectType = (f: File): ArtifactType => {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (ext === 'bpmn') return 'bpmn'
    if (ext === 'mmd' || ext === 'mermaid') return 'flowchart'
    if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext)) return 'image'
    return 'other'
  }

  const handleFile = (f: File) => {
    setFile(f)
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''))
    if (typeAuto) setType(detectType(f))
  }

  const handleImage = (f: File) => {
    setImage(f)
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''))
    if (typeAuto) setType('image')
  }

  /* Upload d'un fichier dans Supabase Storage */
  const uploadToStorage = async (artifactId: string, f: File, prefix: string) => {
    const path = `${artifactId}/${prefix}_${f.name}`
    const { error } = await supabase.storage.from('artifacts').upload(path, f, { upsert: true })
    if (error) throw error
    return path
  }

  /* Soumission */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaving(false); return }

      let artifactId = artifact?.id ?? ''

      /* ── CREATE ─── */
      if (mode === 'create') {
        const { data: created, error } = await supabase
          .from('artifacts')
          .insert({ project_id: projectId, name, description: description || null, type, role, source: 'user_upload' })
          .select()
          .single()
        if (error || !created) { setSaving(false); return }
        artifactId = created.id
      } else {
        /* ── EDIT ─── */
        await supabase
          .from('artifacts')
          .update({ name, description: description || null, type, role })
          .eq('id', artifactId)
      }

      /* Upload fichier et image */
      let storagePath = mode === 'edit' ? (existingFilePath  ?? null) : null
      let imagePath   = mode === 'edit' ? (existingImagePath ?? null) : null

      if (file)  storagePath = await uploadToStorage(artifactId, file,  'file')
      if (image) imagePath   = await uploadToStorage(artifactId, image, 'img')

      /* Créer une nouvelle version si contenu modifié ou nouveau */
      const hasContent = !!(code || url || storagePath || imagePath)

      // Comparer le code actuel avec la version précédente (sans requête imbriquée)
      const prevCode = versionId
        ? (await supabase.from('artifact_versions').select('content_text').eq('id', versionId).single()).data?.content_text ?? ''
        : ''
      const contentChanged = mode === 'create' || code !== prevCode || !!file || !!image

      if (hasContent && (mode === 'create' || contentChanged)) {
        const { data: lastV } = await supabase
          .from('artifact_versions')
          .select('version_number')
          .eq('artifact_id', artifactId)
          .order('version_number', { ascending: false })
          .limit(1)
          .single()

        await supabase.from('artifact_versions').insert({
          artifact_id:        artifactId,
          content_text:       code || null,
          url:                url || null,
          storage_path:       storagePath,
          image_storage_path: imagePath,
          version_number:     (lastV?.version_number ?? 0) + 1,
        })
      }

      /* Renvoyer l'artifact mis à jour */
      const { data: final } = await supabase
        .from('artifacts')
        .select('*')
        .eq('id', artifactId)
        .single()

      if (final) onDone(final)
      onClose()

      /* Générer l'embedding en arrière-plan (fire-and-forget, non bloquant) */
      if (artifactId) {
        fetch('/api/artifacts/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artifactId }),
        }).catch(() => { /* silencieux — le RAG dégrade gracieusement */ })
      }
    } catch (err) {
      console.error('ArtifactModal save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={handleBackdrop}>
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-800">
              {mode === 'create' ? 'Ajouter un artifact' : 'Modifier l\'artifact'}
            </h2>
            {mode === 'edit' && artifact && (
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{artifact.name}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps scrollable */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-5">

            {/* ── INFORMATIONS ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Informations</p>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-medium">Nom <span className="text-red-500">*</span></Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de l'artifact" required className="border-slate-200" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-700 font-medium">Description <span className="text-slate-400 font-normal">(facultatif)</span></Label>
                  <span className="flex items-center gap-1 text-xs text-violet-500"><Sparkles className="w-3 h-3" /> IA peut générer</span>
                </div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez la nature et la valeur de cet artifact..."
                  className="border-slate-200 text-sm"
                  style={{ minHeight: '70px', maxHeight: '130px', resize: 'vertical', overflowY: 'auto' }}
                />
              </div>
            </div>

            {/* ── CONTENU ── */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Contenu <span className="font-normal text-slate-400 normal-case">(un ou plusieurs)</span></p>

              {/* Code */}
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-medium flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-slate-400" /> Code Mermaid / XML BPMN
                </Label>
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={`flowchart TD\n  A[Début] --> B[Étape 1]\n  B --> C[Fin]`}
                  className="border-slate-200 font-mono text-xs"
                  style={{ minHeight: '100px', maxHeight: '220px', resize: 'vertical', overflowY: 'auto' }}
                />
              </div>

              {/* URL */}
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-medium flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-slate-400" /> URL de référence
                </Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  type="url"
                  className="border-slate-200"
                />
              </div>

              {/* Fichier */}
              <DropZone
                label="Fichier"
                accept=".bpmn,.mmd,.mermaid,.pdf,.md,.txt,.xml"
                hint=".bpmn · .mmd · .pdf · .md · .xml"
                file={file}
                existingName={existingFileName}
                onFile={handleFile}
                onClear={() => { setFile(null); setExistingFilePath(null) }}
              />

              {/* Image */}
              <DropZone
                label="Image de prévisualisation"
                accept=".png,.jpg,.jpeg,.svg,.gif,.webp"
                hint=".png · .jpg · .svg · .gif"
                file={image}
                existingName={existingImageName}
                onFile={handleImage}
                onClear={() => { setImage(null); setExistingImagePath(null); setExistingImageUrl(null) }}
              />

              {/* Aperçu image */}
              {(imagePreviewUrl || existingImageUrl) && (
                <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 h-36 flex items-center justify-center">
                  <img
                    src={imagePreviewUrl ?? existingImageUrl!}
                    alt="Aperçu"
                    className="max-h-full max-w-full object-contain p-3"
                  />
                </div>
              )}
            </div>

            {/* ── TYPE ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-700 font-medium flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-slate-400" /> Type de diagramme
                </Label>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                  <input type="checkbox" checked={typeAuto} onChange={(e) => setTypeAuto(e.target.checked)} className="rounded" />
                  Détection auto
                </label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {diagramTypes.map((t) => (
                  <button
                    key={t.value} type="button"
                    onClick={() => { setType(t.value); setTypeAuto(false) }}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                      type === t.value && !typeAuto
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── RÔLE ── */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Rôle <span className="text-red-500">*</span></Label>
              <div className="flex gap-2">
                {([
                  { value: 'example', label: '⭐ Étalon',   sub: 'Modèle à imiter',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
                  { value: 'context', label: '📋 Contexte', sub: 'Information à connaître', cls: 'bg-amber-50 text-amber-700 border-amber-300' },
                ] as const).map((r) => (
                  <button
                    key={r.value} type="button" onClick={() => setRole(r.value)}
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

            {/* ── ACTIONS ── */}
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white">
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{mode === 'create' ? 'Création...' : 'Enregistrement...'}</>
                  : mode === 'create' ? 'Ajouter l\'artifact' : 'Enregistrer les modifications'
                }
              </Button>
              <Button type="button" variant="ghost" onClick={onClose} className="text-slate-500">Annuler</Button>
            </div>

          </form>
        )}
      </div>
    </div>
  )
}

