'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GitBranch, Lock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

/* ── Formulaire (isolé pour useSearchParams) ── */
function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [exchanging, setExchanging] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  /* Échange le code PKCE contre une session dès l'arrivée sur la page */
  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setError('Lien invalide. Demandez un nouveau lien de réinitialisation.')
      setExchanging(false)
      return
    }

    supabase.auth.exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          setError('Lien expiré ou déjà utilisé. Demandez un nouveau lien de réinitialisation.')
        }
        setExchanging(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError('Erreur lors de la mise à jour : ' + error.message)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/projects'), 2500)
  }

  /* ── États ── */
  if (exchanging) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-slate-500 text-sm">
        <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        Vérification du lien…
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-4">
        <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Mot de passe mis à jour !</p>
          <p className="text-sm mt-1 text-emerald-600">Redirection vers votre espace…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-3 mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Formulaire uniquement si le code a bien été échangé */}
      {!error && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-700 font-medium">
              Nouveau mot de passe
              <span className="text-slate-400 font-normal text-xs ml-1">(6 caractères min.)</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 border-slate-200"
                minLength={6}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-slate-700 font-medium">Confirmer le mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-9 border-slate-200"
                minLength={6}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-lg mt-2"
          >
            {loading ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
          </Button>
        </form>
      )}

      {/* Lien vers un nouveau reset si lien invalide */}
      {error && (
        <div className="text-center mt-4">
          <a href="/login" className="text-sm text-violet-600 font-medium hover:underline">
            Demander un nouveau lien
          </a>
        </div>
      )}
    </>
  )
}

/* ── Page principale ── */
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-teal-50 px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 mb-4 shadow-lg">
            <GitBranch className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">BIModel</h1>
          <p className="text-slate-500 text-sm mt-1">Réinitialisation du mot de passe</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Nouveau mot de passe</h2>
          <Suspense
            fallback={
              <div className="flex items-center justify-center gap-2 py-4 text-slate-500 text-sm">
                <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                Chargement…
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          <a href="/login" className="text-violet-600 font-medium hover:underline">
            ← Retour à la connexion
          </a>
        </p>
      </div>
    </div>
  )
}
