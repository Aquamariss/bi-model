import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

/* ── GET — liste des membres ─────────────────────────────────── */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id: projectId } = await params
  const admin = await createAdminClient()

  const { data, error } = await admin.rpc('get_project_members', {
    p_project_id: projectId,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: data ?? [] })
}

/* ── POST — ajouter un membre par email ─────────────────────── */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: projectId } = await params
  const { email } = (await req.json()) as { email: string }

  if (!email?.trim()) {
    return NextResponse.json({ error: 'Email requis.' }, { status: 400 })
  }

  // Vérifier que l'appelant est owner du projet
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const admin = await createAdminClient()

  const { data: membership } = await admin
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'owner') {
    return NextResponse.json({ error: 'Seul le propriétaire peut partager le projet.' }, { status: 403 })
  }

  // Trouver l'utilisateur par email
  const { data: targetUserId, error: lookupErr } = await admin.rpc('get_user_id_by_email', {
    p_email: email.trim().toLowerCase(),
  })

  if (lookupErr || !targetUserId) {
    return NextResponse.json(
      { error: 'Aucun compte trouvé avec cet email. L\'utilisateur doit d\'abord créer un compte.' },
      { status: 404 }
    )
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'Vous êtes déjà membre de ce projet.' }, { status: 400 })
  }

  // Ajouter le membre
  const { error: insertErr } = await admin
    .from('project_members')
    .insert({
      project_id: projectId,
      user_id: targetUserId,
      role: 'editor',
      invited_by: user.id,
    })

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json({ error: 'Cet utilisateur a déjà accès au projet.' }, { status: 400 })
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, userId: targetUserId, email })
}

/* ── DELETE — retirer un membre ─────────────────────────────── */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id: projectId } = await params
  const { userId: targetUserId } = (await req.json()) as { userId: string }

  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const admin = await createAdminClient()

  // Vérifier que l'appelant est owner
  const { data: membership } = await admin
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'owner') {
    return NextResponse.json({ error: 'Seul le propriétaire peut retirer un membre.' }, { status: 403 })
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'Vous ne pouvez pas vous retirer du projet.' }, { status: 400 })
  }

  const { error } = await admin
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', targetUserId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
