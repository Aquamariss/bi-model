'use client'

import { useEffect, useRef, useState } from 'react'
import { Copy, Download, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BpmnViewer } from '@/components/tasks/BpmnViewer'
import { cn } from '@/lib/utils'

interface Props {
  code: string
  type?: string
}

export function DiagramPreview({ code, type }: Props) {
  /* BPMN → rendu dédié avec export SVG / PNG / .bpmn */
  if (type === 'bpmn') {
    return <BpmnViewer xml={code} />
  }

  const [tab, setTab] = useState<'preview' | 'code'>('preview')
  const [copied, setCopied] = useState(false)
  const [svgContent, setSvgContent] = useState<string>('')
  const [error, setError] = useState<string>('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tab !== 'preview' || !code) return
    setError('')

    const renderMermaid = async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({ startOnLoad: false, theme: 'neutral', fontFamily: 'inherit' })
        const id = `diagram-${Date.now()}`
        const { svg } = await mermaid.render(id, code)
        setSvgContent(svg)
      } catch (err) {
        setError('Erreur de rendu du diagramme. Vérifiez le code.')
      }
    }
    renderMermaid()
  }, [code, tab])

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Tabs + actions */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
        <div className="flex gap-1">
          {(['preview', 'code'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                tab === t ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              {t === 'preview' ? 'Aperçu' : 'Code'}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs gap-1.5 text-slate-500">
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copié' : 'Copier'}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-slate-500">
            <Download className="w-3 h-3" />
            Export
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {tab === 'preview' && (
          <>
            {error ? (
              <div className="flex items-center justify-center h-full text-sm text-red-500">{error}</div>
            ) : svgContent ? (
              <div
                ref={containerRef}
                className="flex items-center justify-center min-h-[300px]"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">Génération du rendu...</div>
            )}
          </>
        )}
        {tab === 'code' && (
          <pre className="text-xs font-mono text-slate-700 bg-slate-50 rounded-lg p-4 overflow-auto whitespace-pre-wrap leading-relaxed">
            {code}
          </pre>
        )}
      </div>
    </div>
  )
}
