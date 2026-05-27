import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface LinkItem {
  id: string
  label: string
  url: string
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY manquant' }, { status: 500 })
  }

  const { name, description, links } = (await req.json()) as {
    name: string
    description: string
    links: LinkItem[]
  }

  if (!description?.trim()) {
    return Response.json({ error: 'Description requise' }, { status: 400 })
  }

  const linksText = links?.length
    ? links.map((l) => `- ${l.label} : ${l.url}`).join('\n')
    : '(aucun lien)'

  const prompt =
    `Tu es un assistant qui reformule un contexte d'entreprise pour qu'il soit injecté dans des prompts d'agents IA spécialisés en modélisation de processus métier (BPMN, organigrammes, diagrammes de séquence, etc.).\n\n` +
    `Voici les informations de l'entreprise :\n\n` +
    `**Nom** : ${name || '(non renseigné)'}\n\n` +
    `**Description** :\n${description}\n\n` +
    `**Liens** :\n${linksText}\n\n` +
    `Génère un résumé de contexte concis (3-6 phrases), factuel, en français, qui :\n` +
    `- Décrit l'activité principale et le secteur\n` +
    `- Mentionne la structure organisationnelle si pertinente\n` +
    `- Note les éléments clés pour contextualiser la génération de modèles métier\n` +
    `- N'invente aucun fait non fourni\n\n` +
    `Retourne uniquement le texte du résumé, sans titre ni formatage markdown.`

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const summary = (message.content[0] as { type: 'text'; text: string }).text.trim()
    return Response.json({ summary })
  } catch (err) {
    console.error('[/api/settings/generate-summary]', err)
    return Response.json({ error: 'Erreur lors de la génération' }, { status: 500 })
  }
}
