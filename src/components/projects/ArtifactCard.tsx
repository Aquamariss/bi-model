import { Trash2, FileCode, Image, Link, FileText, HelpCircle, Pencil } from 'lucide-react'
import { Artifact, ArtifactType } from '@/lib/types'
import { cn } from '@/lib/utils'

const typeConfig: Record<ArtifactType, { label: string; icon: React.ElementType; color: string }> = {
  bpmn:      { label: 'BPMN',         icon: FileCode,   color: 'bg-violet-50 text-violet-700 border-violet-200' },
  orgchart:  { label: 'Organigramme', icon: FileCode,   color: 'bg-blue-50 text-blue-700 border-blue-200' },
  sequence:  { label: 'Séquence',     icon: FileCode,   color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  flowchart: { label: 'Flowchart',    icon: FileCode,   color: 'bg-teal-50 text-teal-700 border-teal-200' },
  image:     { label: 'Image',        icon: Image,      color: 'bg-orange-50 text-orange-700 border-orange-200' },
  url:       { label: 'URL',          icon: Link,       color: 'bg-slate-50 text-slate-700 border-slate-200' },
  text:      { label: 'Texte',        icon: FileText,   color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  other:     { label: 'Autre',        icon: HelpCircle, color: 'bg-slate-50 text-slate-600 border-slate-200' },
}

const roleConfig = {
  example: { label: 'Étalon',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  context: { label: 'Contexte', color: 'bg-amber-50 text-amber-700 border-amber-200' },
}

interface Props {
  artifact:  Artifact
  imageUrl?: string
  onEdit?:   (artifact: Artifact) => void
  onDelete?: (id: string) => void
}

export function ArtifactCard({ artifact, imageUrl, onEdit, onDelete }: Props) {
  const typeConf = typeConfig[artifact.type]
  const roleConf = roleConfig[artifact.role]
  const Icon = typeConf.icon

  return (
    <div className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors group overflow-hidden">

      {/* ── Bandeau image ── */}
      {imageUrl && (
        <div className="h-36 bg-slate-50 border-b border-slate-100 flex items-center justify-center">
          <img
            src={imageUrl}
            alt={artifact.name}
            className="max-h-full max-w-full object-contain p-3"
          />
        </div>
      )}

      {/* ── Corps ── */}
      <div className="flex items-start gap-3 p-4">
        {/* Icône type */}
        <div className={cn('flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border', typeConf.color)}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-slate-800 truncate block">{artifact.name}</span>

          {artifact.description ? (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{artifact.description}</p>
          ) : artifact.content_text ? (
            <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">
              {artifact.content_text.slice(0, 90)}…
            </p>
          ) : null}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', typeConf.color)}>
              {typeConf.label}
            </span>
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', roleConf.color)}>
              {roleConf.label}
            </span>
            {artifact.source === 'generated' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-600 border border-violet-200">
                Généré
              </span>
            )}
          </div>
        </div>

        {/* Actions — visibles au hover */}
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(artifact) }}
              className="p-1.5 rounded text-slate-300 hover:text-violet-600 hover:bg-violet-50 transition-colors"
              title="Modifier"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(artifact.id) }}
              className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
