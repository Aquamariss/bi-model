import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/embeddings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/artifacts/embed
 * Body : { artifactId: string }
 *
 * Génère l'embedding de la dernière version de l'artifact et le stocke
 * dans artifact_versions.embedding.
 * Appelé en fire-and-forget depuis ArtifactModal après chaque sauvegarde.
 */
export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ skipped: true, reason: 'OPENAI_API_KEY absent' })
  }

  const { artifactId } = (await req.json()) as { artifactId: string }
  if (!artifactId) {
    return Response.json({ error: 'artifactId requis' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // Charger l'artifact (nom + description) et sa dernière version
  const [{ data: artifact }, { data: version }] = await Promise.all([
    supabase
      .from('artifacts')
      .select('name, description')
      .eq('id', artifactId)
      .single(),
    supabase
      .from('artifact_versions')
      .select('id, content_text')
      .eq('artifact_id', artifactId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single(),
  ])

  if (!artifact || !version) {
    return Response.json({ error: 'Artifact ou version introuvable' }, { status: 404 })
  }

  // Texte à indexer : nom + description + contenu (ordre d'importance décroissant)
  const textToEmbed = [artifact.name, artifact.description, version.content_text]
    .filter(Boolean)
    .join('\n\n')

  if (!textToEmbed.trim()) {
    return Response.json({ skipped: true, reason: 'Aucun contenu textuel à indexer' })
  }

  const embedding = await generateEmbedding(textToEmbed)
  if (!embedding) {
    return Response.json({ error: 'Embedding non généré (voir logs serveur)' }, { status: 500 })
  }

  // Stocker l'embedding dans la version
  const { error } = await supabase
    .from('artifact_versions')
    .update({ embedding })
    .eq('id', version.id)

  if (error) {
    console.error('[/api/artifacts/embed] Supabase update error', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true, versionId: version.id })
}
