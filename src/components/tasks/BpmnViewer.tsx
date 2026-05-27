'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Copy, Check, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  xml: string
}

type ExportFormat = 'svg' | 'png'
type Tab = 'preview' | 'code'

/* ── Helper : télécharger un Blob ── */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ── Helper : convertit un SVG string en PNG via <canvas> ── */
async function svgToPng(svg: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Parser le SVG pour lire le viewBox / width / height
    const parser = new DOMParser()
    const doc = parser.parseFromString(svg, 'image/svg+xml')
    const svgEl = doc.documentElement

    const viewBox = svgEl.getAttribute('viewBox')?.split(/\s+/).map(Number)
    const w = Number(svgEl.getAttribute('width'))  || (viewBox ? viewBox[2] : 0) || 1200
    const h = Number(svgEl.getAttribute('height')) || (viewBox ? viewBox[3] : 0) || 800

    const scale = 2  // résolution 2×
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const img  = new Image()

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = w * scale
      canvas.height = h * scale
      const ctx = canvas.getContext('2d')!
      ctx.scale(scale, scale)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob((b) => {
        if (b) resolve(b)
        else reject(new Error('Canvas toBlob a échoué'))
      }, 'image/png')
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Chargement SVG échoué')) }
    img.src = url
  })
}

/* ── Composant principal ── */
export function BpmnViewer({ xml }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef    = useRef<any>(null)

  const [tab,       setTab]       = useState<Tab>('preview')
  const [status,    setStatus]    = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg,  setErrorMsg]  = useState('')
  const [copied,    setCopied]    = useState(false)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)

  /* ── Rendu BPMN (uniquement quand l'onglet preview est actif) ── */
  useEffect(() => {
    if (tab !== 'preview' || !containerRef.current || !xml) return
    setStatus('loading')
    setErrorMsg('')

    let cancelled = false

    ;(async () => {
      try {
        // Détruire le viewer précédent
        viewerRef.current?.destroy()

        // Import dynamique — cast nécessaire car bpmn-js/lib/* n'a pas de types pour ce sous-chemin
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const BpmnJSModule = await import('bpmn-js/lib/NavigatedViewer') as any
        if (cancelled) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const viewer: any = new BpmnJSModule.default({ container: containerRef.current! })
        viewerRef.current = viewer

        await viewer.importXML(xml)
        viewer.get('canvas').zoom('fit-viewport')
        if (!cancelled) setStatus('ready')
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = (err instanceof Error) ? err.message : String(err)
          setErrorMsg(msg)
          setStatus('error')
        }
      }
    })()

    return () => { cancelled = true }
  }, [xml, tab])

  /* ── Export SVG ── */
  const handleExportSVG = async () => {
    if (!viewerRef.current) return
    setExporting('svg')
    try {
      const { svg } = await viewerRef.current.saveSVG()
      downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'diagramme.svg')
    } finally {
      setExporting(null)
    }
  }

  /* ── Export PNG ── */
  const handleExportPNG = async () => {
    if (!viewerRef.current) return
    setExporting('png')
    try {
      const { svg } = await viewerRef.current.saveSVG()
      const png = await svgToPng(svg)
      downloadBlob(png, 'diagramme.png')
    } catch (err) {
      console.error('Export PNG:', err)
    } finally {
      setExporting(null)
    }
  }

  /* ── Export .bpmn ── */
  const handleExportBpmn = async () => {
    if (!viewerRef.current) return
    const { xml: bpmnXml } = await viewerRef.current.saveXML({ format: true })
    downloadBlob(new Blob([bpmnXml], { type: 'application/xml' }), 'diagramme.bpmn')
  }

  /* ── Copier XML ── */
  const handleCopyXML = () => {
    navigator.clipboard.writeText(xml)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 flex-shrink-0">
        {/* Onglets */}
        <div className="flex gap-1">
          {(['preview', 'code'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                tab === t ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              {t === 'preview' ? 'Aperçu' : 'Code XML'}
            </button>
          ))}
          {/* Badge erreur sur l'onglet prévisualisation */}
          {status === 'error' && tab === 'preview' && (
            <span className="flex items-center gap-1 text-xs text-red-500 ml-1">
              <AlertCircle className="w-3 h-3" /> Erreur XML
            </span>
          )}
        </div>

        {/* Actions (disponibles uniquement en preview valide) */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopyXML}
            className="h-7 text-xs gap-1.5 text-slate-500 hover:text-slate-800">
            {copied
              ? <><Check className="w-3 h-3 text-emerald-500" />Copié</>
              : <><Copy className="w-3 h-3" />Copier XML</>}
          </Button>
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <span className="text-xs text-slate-400">Exporter :</span>
          <Button variant="ghost" size="sm" onClick={handleExportSVG}
            disabled={status !== 'ready' || exporting !== null}
            className="h-7 text-xs gap-1 text-slate-500 hover:text-violet-600">
            {exporting === 'svg' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            SVG
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportPNG}
            disabled={status !== 'ready' || exporting !== null}
            className="h-7 text-xs gap-1 text-slate-500 hover:text-violet-600">
            {exporting === 'png' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            PNG
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportBpmn}
            disabled={status !== 'ready'}
            className="h-7 text-xs gap-1 text-slate-500 hover:text-teal-600">
            <Download className="w-3 h-3" />.bpmn
          </Button>
        </div>
      </div>

      {/* ── Zone de rendu ── */}
      <div className="flex-1 relative overflow-hidden">

        {/* ── Onglet Aperçu ── */}
        {tab === 'preview' && (
          <>
            {/* Container bpmn-js */}
            <div
              ref={containerRef}
              className={cn('absolute inset-0', status !== 'ready' && 'invisible')}
            />
            {/* Loading */}
            {status === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin text-violet-400" />
                  <span className="text-xs">Chargement du diagramme…</span>
                </div>
              </div>
            )}
            {/* Erreur XML avec lien vers l'onglet Code */}
            {status === 'error' && (() => {
              const isTruncated = errorMsg.toLowerCase().includes('unexpected end')
                || errorMsg.toLowerCase().includes('end of file')
              return (
                <div className="absolute inset-0 flex items-center justify-center bg-white p-6">
                  <div className="flex flex-col items-center gap-3 text-center max-w-md">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <p className="text-sm font-medium text-slate-700">Erreur de rendu BPMN</p>

                    {isTruncated ? (
                      /* Cas spécifique : XML tronqué */
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-left space-y-1.5">
                        <p className="text-xs font-medium text-amber-800">
                          Le diagramme XML est incomplet (trop long).
                        </p>
                        <p className="text-xs text-amber-700">
                          Demandez un diagramme plus simple dans le chat, par exemple :
                        </p>
                        <ul className="text-xs text-amber-700 list-disc pl-4 space-y-0.5">
                          <li>Réduis le nombre de tâches à 8 maximum</li>
                          <li>Utilise 1 seule swimlane au lieu de plusieurs</li>
                          <li>Supprime les passerelles secondaires</li>
                        </ul>
                      </div>
                    ) : (
                      /* Cas général : erreur XML */
                      <p className="text-xs text-slate-500 font-mono bg-red-50 border border-red-100 p-3 rounded-lg text-left whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {errorMsg}
                      </p>
                    )}

                    <button
                      onClick={() => setTab('code')}
                      className="text-xs text-violet-600 hover:underline"
                    >
                      Inspecter le XML généré →
                    </button>
                  </div>
                </div>
              )
            })()}
          </>
        )}

        {/* ── Onglet Code XML ── */}
        {tab === 'code' && (
          <div className="absolute inset-0 overflow-auto p-4 bg-slate-50">
            <pre className="text-xs font-mono text-slate-700 leading-relaxed whitespace-pre-wrap break-all">
              {xml || '(aucun XML généré)'}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
