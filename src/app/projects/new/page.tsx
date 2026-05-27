'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { createClient } from '@/lib/supabase/client'

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [scope, setScope] = useState('')
  const [rules, setRules] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data, error } = await supabase
      .from('projects')
      .insert({ name, description, scope, rules_text: rules, user_id: user.id })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(`/projects/${data.id}`)
    router.refresh()
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/projects">
          <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nouveau projet</h1>
          <p className="text-slate-500 text-sm mt-0.5">Définissez le cadre de votre projet de modélisation</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 mb-5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Informations générales</h2>
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-medium">Nom du projet <span className="text-red-500">*</span></Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex : Ressources Humaines, Ventes, Production..."
              className="border-slate-200"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-medium">Description</Label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Décrivez l'objectif et le contexte de ce projet..."
              minHeight="100px"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-medium">Périmètre</Label>
            <Input
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="ex : Entités françaises, Équipe Europe du Sud..."
              className="border-slate-200"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div>
            <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Règles de modélisation</h2>
            <p className="text-xs text-slate-400 mt-1">Transmises à l'IA lors de chaque génération dans ce projet.</p>
          </div>
          <Textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder={`ex :\n- Toujours inclure le rôle Valideur dans les processus d'approbation\n- Utiliser les swim lanes par département\n- Nommer les tâches avec un verbe à l'infinitif`}
            className="border-slate-200 min-h-[140px] text-sm"
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
            <Save className="w-4 h-4" />
            {loading ? 'Création...' : 'Créer le projet'}
          </Button>
          <Link href="/projects">
            <Button variant="ghost" className="text-slate-500">Annuler</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
