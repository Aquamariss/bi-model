'use client'

import { useState, useRef } from 'react'
import { Upload, Link, Code, X, Sparkles, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArtifactRole, ArtifactType } from '@/lib/types'
import { cn } from '@/lib/utils'

type UploadMode = 'file' | 'url' | 'code'

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
  onClose: () => void
  onAdd: (artifact: {
    name: string
    type: ArtifactType
    role: ArtifactRole
    description?: string
    content_text?: string
  }) => void
}

export function ArtifactUpload({ onClose, onAdd }: Props) {
  const [mode, setMode] = useState<UploadMode>('file')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [role, setRole] = useState<ArtifactRole>('context')
  const [type, setType] = useState<ArtifactType>('other')
  const [typeAuto, setTypeAuto] = useState(true)
  const [url, setUrl] = useState('')
  const [code, setCode] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---- File handling ----
  const applyFile = (file: File) => {
    setSelectedFile(file)
    if (!name) setName(file.name.replace(/\.[^.]+$/, ''))
    // Détection auto du type
    if (typeAuto) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'bpmn') setType('bpmn')
      else if (ext === 'mmd' || ext === 'mermaid') setType('flowchart')
      else if (ext && ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext)) setType('image')
      else setType('other')
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) applyFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }
  const handleDragLeave = () => setDragOver(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) applyFile(file)
  }

  // ---- Submit ----
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const content = mode === 'url' ? url : mode === 'code' ? code : selectedFile?.name ?? ''
    onAdd({
      name,
      type,
      role,
      description: description || undefined,
      content_text: content || undefined,
    })
    onClose()
  }

  // ---- Backdrop click to close ----
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={handleBackdrop}
    >
      {/* Modal — hauteur max + scroll interne */}
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">

        {/* Header — fixe */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-semibold text-slate-800">Ajouter un artifact</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenu — scrollable */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Mode selector */}
          <div className="flex gap-2">
            {(['file', 'url', 'code'] as UploadMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  mode === m
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {m === 'file' && <Upload className="w-3.5 h-3.5" />}
                {m === 'url'  && <Link className="w-3.5 h-3.5" />}
                {m === 'code' && <Code className="w-3.5 h-3.5" />}
                {m === 'file' ? 'Fichier' : m === 'url' ? 'URL' : 'Code'}
              </button>
            ))}
          </div>

          {/* Nom */}
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-medium">
              Nom <span className="text-red-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom de l'artifact"
              required
              className="border-slate-200"
            />
          </div>

          {/* Contenu selon le mode */}
          {mode === 'file' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".bpmn,.mmd,.mermaid,.png,.jpg,.jpeg,.svg,.gif,.pdf,.txt,.md"
                onChange={handleFileInput}
              />
              {selectedFile ? (
                <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50 rounded-lg p-4">
                  <FileCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} Ko</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                    dragOver
                      ? 'border-violet-400 bg-violet-50'
                      : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'
                  )}
                >
                  <Upload className={cn('w-8 h-8 mx-auto mb-2', dragOver ? 'text-violet-400' : 'text-slate-300')} />
                  <p className="text-sm text-slate-500">
                    Glisser un fichier ici ou{' '}
                    <span className="text-violet-600 font-medium">parcourir</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">.bpmn · .mmd · .png · .jpg · .pdf · .md</p>
                </div>
              )}
            </div>
          )}

          {mode === 'url' && (
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-medium">URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                type="url"
                className="border-slate-200"
              />
            </div>
          )}

          {mode === 'code' && (
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-medium">Code Mermaid / XML BPMN</Label>
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={`flowchart TD\n  A[Début] --> B[Étape 1]\n  B --> C[Fin]`}
                className="border-slate-200 font-mono text-xs"
                style={{ minHeight: '120px', maxHeight: '240px', resize: 'vertical', overflowY: 'auto' }}
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-slate-700 font-medium">
                Description{' '}
                <span className="text-slate-400 font-normal">(facultatif)</span>
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

          {/* Type */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-slate-700 font-medium">Type de diagramme</Label>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={typeAuto}
                  onChange={(e) => setTypeAuto(e.target.checked)}
                  className="rounded"
                />
                Détection auto
              </label>
            </div>
            {!typeAuto && (
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
            )}
          </div>

          {/* Rôle */}
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-medium">
              Rôle dans le projet <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              {([
                { value: 'example', label: '⭐ Étalon',   sub: 'Modèle à imiter',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
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
            <Button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white">
              Ajouter l'artifact
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
