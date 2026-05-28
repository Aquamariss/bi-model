'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Mail, UserPlus, Trash2, Loader2, Crown, Edit2, Eye, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Member {
  user_id: string
  email: string
  role: 'owner' | 'editor' | 'viewer'
  created_at: string
}

interface ShareModalProps {
  projectId: string
  projectName: string
  currentUserId: string
  onClose: () => void
}

const roleConfig = {
  owner:  { label: 'Propriétaire', icon: Crown,  color: 'text-amber-600  bg-amber-50  border-amber-200' },
  editor: { label: 'Éditeur',      icon: Edit2,  color: 'text-violet-600 bg-violet-50 border-violet-200' },
  viewer: { label: 'Lecteur',      icon: Eye,    color: 'text-slate-600  bg-slate-50  border-slate-200' },
}

export function ShareModal({ projectId, projectName, currentUserId, onClose }: ShareModalProps) {
  const [members, setMembers]     = useState<Member[]>([])
  const [email, setEmail]         = useState('')
  const [loading, setLoading]     = useState(true)
  const [adding, setAdding]       = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/members`)
    const data = await res.json()
    setMembers(data.members ?? [])
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setAdding(true)
    setError(null)
    setSuccess(null)

    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Erreur lors de l\'ajout.')
    } else {
      setSuccess(`${email.trim()} a maintenant accès au projet.`)
      setEmail('')
      fetchMembers()
    }
    setAdding(false)
  }

  const handleRemove = async (userId: string, userEmail: string) => {
    setRemovingId(userId)
    setError(null)

    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Erreur lors de la suppression.')
    } else {
      setSuccess(`${userEmail} a été retiré du projet.`)
      setMembers((prev) => prev.filter((m) => m.user_id !== userId))
    }
    setRemovingId(null)
  }

  const isOwner = members.find((m) => m.user_id === currentUserId)?.role === 'owner'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modale */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Partager le projet</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[280px]">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Formulaire d'invitation (owner only) */}
          {isOwner && (
            <form onSubmit={handleAdd} className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Inviter par email</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="adresse@exemple.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); setSuccess(null) }}
                    className="pl-9 border-slate-200 text-sm"
                    disabled={adding}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={adding || !email.trim()}
                  className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white shrink-0"
                  size="sm"
                >
                  {adding
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <UserPlus className="w-3.5 h-3.5" />}
                  Inviter
                </Button>
              </div>

              {/* Feedback */}
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg px-3 py-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}
            </form>
          )}

          {/* Liste des membres */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-3">
              Membres ({loading ? '…' : members.length})
            </p>

            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {members.map((m) => {
                  const rc = roleConfig[m.role]
                  const RoleIcon = rc.icon
                  const isMe = m.user_id === currentUserId
                  const isRemoving = removingId === m.user_id

                  return (
                    <div
                      key={m.user_id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      {/* Avatar lettre */}
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-violet-600 uppercase">
                          {m.email?.[0] ?? '?'}
                        </span>
                      </div>

                      {/* Email + badge role */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800 truncate">
                          {m.email}
                          {isMe && <span className="ml-1.5 text-xs text-slate-400">(vous)</span>}
                        </p>
                      </div>

                      {/* Badge rôle */}
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${rc.color}`}>
                        <RoleIcon className="w-3 h-3" />
                        {rc.label}
                      </span>

                      {/* Bouton retirer (owner uniquement, pas sur soi-même) */}
                      {isOwner && !isMe && m.role !== 'owner' && (
                        <button
                          onClick={() => handleRemove(m.user_id, m.email)}
                          disabled={isRemoving}
                          title="Retirer l'accès"
                          className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                        >
                          {isRemoving
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Note */}
          <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">
            Les éditeurs peuvent créer et modifier les tâches et artifacts du projet.
          </p>
        </div>
      </div>
    </div>
  )
}
