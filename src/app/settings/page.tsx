'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, Sparkles, ExternalLink, CheckCircle2, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { CompanyLink } from '@/lib/types'
import { cn } from '@/lib/utils'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function SettingsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [links, setLinks] = useState<CompanyLink[]>([])
  const [aiSummary, setAiSummary] = useState('')
  const [aiUpdatedAt, setAiUpdatedAt] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setSettingsId(data.id)
        setName(data.name ?? '')
        setDescription(data.description ?? '')
        setLinks((data.links as CompanyLink[]) ?? [])
        setAiSummary(data.ai_summary ?? '')
        setAiUpdatedAt(data.ai_summary_updated_at)
      }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addLink = () => setLinks((prev) => [...prev, { id: `l${Date.now()}`, label: '', url: '' }])
  const updateLink = (id: string, field: 'label' | 'url', value: string) =>
    setLinks((prev) => prev.map((l) => l.id === id ? { ...l, [field]: value } : l))
  const deleteLink = (id: string) => setLinks((prev) => prev.filter((l) => l.id !== id))

  const generateAiSummary = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/settings/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, links }),
      })
      const json = await res.json()
      if (json.summary) {
        setAiSummary(json.summary)
        setAiUpdatedAt(new Date().toISOString())
      }
    } catch {
      // Fallback en cas d'erreur API
      setAiSummary(`${name} — ${description.slice(0, 300)}`)
    }
    setIsGenerating(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      user_id: user.id,
      name,
      description,
      links,
      ai_summary: aiSummary,
      ai_summary_updated_at: aiUpdatedAt,
    }

    if (settingsId) {
      await supabase.from('company_settings').update(payload).eq('id', settingsId)
    } else {
      const { data } = await supabase.from('company_settings').insert(payload).select().single()
      if (data) setSettingsId(data.id)
    }

    setIsSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-slate-500 text-sm mt-1">
          Le contexte entreprise est injecté automatiquement dans chaque génération de modèle.
        </p>
      </div>

      <div className="space-y-6">
        {/* Company info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Informations entreprise</h2>
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-medium">Nom de l'entreprise</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de votre organisation" className="border-slate-200" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-medium">Description</Label>
            <p className="text-xs text-slate-400">Secteur, activités, culture, structure. Contexte utilisé pour générer les modèles.</p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex : Entreprise spécialisée dans... Nos équipes couvrent... Nos clients sont..."
              className="border-slate-200 min-h-[120px]"
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Links */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Liens de référence</h2>
              <p className="text-xs text-slate-400 mt-1">Site web, réseaux sociaux, documentation interne…</p>
            </div>
            <Button variant="outline" size="sm" onClick={addLink} className="gap-1.5 text-slate-600 border-slate-200">
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </Button>
          </div>
          {links.length === 0 && <p className="text-sm text-slate-400 italic py-2">Aucun lien ajouté.</p>}
          <div className="space-y-2">
            {links.map((link) => (
              <div key={link.id} className="flex items-center gap-2">
                <Input
                  value={link.label}
                  onChange={(e) => updateLink(link.id, 'label', e.target.value)}
                  placeholder="Label"
                  className="border-slate-200 w-36 flex-shrink-0 text-sm"
                />
                <div className="relative flex-1">
                  <ExternalLink className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                  <Input
                    value={link.url}
                    onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                    placeholder="https://..."
                    className="border-slate-200 pl-8 text-sm"
                  />
                </div>
                <button onClick={() => deleteLink(link.id)} className="p-2 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* AI Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-500" /> Contexte IA
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Reformulation par Claude, injectée dans chaque prompt agent.
                {aiUpdatedAt && <span className="ml-1">Mis à jour le {formatDate(aiUpdatedAt)}.</span>}
              </p>
            </div>
            <Button
              variant="outline" size="sm"
              onClick={generateAiSummary}
              disabled={isGenerating || !description.trim()}
              className="gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50 flex-shrink-0"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isGenerating && 'animate-spin')} />
              {isGenerating ? 'Génération...' : 'Régénérer'}
            </Button>
          </div>
          {aiSummary ? (
            <div className="bg-violet-50 rounded-lg p-4 border border-violet-100">
              <p className="text-sm text-slate-700 leading-relaxed">{aiSummary}</p>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg p-4 border border-dashed border-slate-200 text-center">
              <p className="text-sm text-slate-400">
                Remplissez la description et cliquez sur <strong>Régénérer</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isSaving} className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
            {saved ? <><CheckCircle2 className="w-4 h-4" /> Enregistré</> : <><Save className="w-4 h-4" /> {isSaving ? 'Enregistrement...' : 'Enregistrer'}</>}
          </Button>
          {saved && <span className="text-sm text-emerald-600 font-medium">Contexte actif pour les prochaines générations.</span>}
        </div>
      </div>
    </div>
  )
}
