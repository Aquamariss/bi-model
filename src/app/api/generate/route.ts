import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { createAdminClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/embeddings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/* ── Helpers ─────────────────────────────────────────────── */

/** Lit un fichier agent depuis le dossier /agents */
function readAgent(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), 'agents', rel), 'utf-8')
}

/**
 * Supprime la section DI (<bpmndi:BPMNDiagram>…</bpmndi:BPMNDiagram>) du XML BPMN.
 * Claude génère ses propres coordonnées — envoyer la section DI d'un étalon
 * est inutile et consomme ~50 % du contexte.
 */
function stripBpmnDISection(xml: string): string {
  return xml
    .replace(/<bpmndi:BPMNDiagram[\s\S]*?<\/bpmndi:BPMNDiagram>\s*/g, '')
    .trim()
}

/** Budget contexte pour les artifacts (en caractères) */
const ARTIFACT_TOTAL_BUDGET = 12_000   // ~3 000 tokens au total
const ARTIFACT_MAX_PER_ITEM  =  4_000  // ~1 000 tokens par artifact

/** Extrait le bloc de code Mermaid / XML / BPMN d'une réponse Claude */
export function extractCode(text: string): string | null {
  const match = text.match(/```(?:mermaid|xml|bpmn)?\n([\s\S]*?)```/)
  return match ? match[1].trim() : null
}

/**
 * Corrige automatiquement les erreurs XML BPMN les plus courantes
 * générées par les LLMs (tags non auto-fermants, commentaires, etc.)
 */
function sanitizeBpmnXml(xml: string): string {
  // 1. <dc:Bounds ...></dc:Bounds>  →  <dc:Bounds .../>
  xml = xml.replace(/<dc:Bounds([^>]*?)>\s*<\/dc:Bounds>/g, '<dc:Bounds$1/>')
  // 2. <di:waypoint ...></di:waypoint>  →  <di:waypoint .../>
  xml = xml.replace(/<di:waypoint([^>]*?)>\s*<\/di:waypoint>/g, '<di:waypoint$1/>')
  // 3. Supprimer les commentaires XML (peuvent casser le parser bpmn-js)
  xml = xml.replace(/<!--[\s\S]*?-->/g, '')
  // 4. Nettoyer les lignes vides multiples laissées par la suppression de commentaires
  xml = xml.replace(/\n{3,}/g, '\n\n')
  xml = xml.trim()

  // 5. Détecter un XML tronqué (limite de tokens atteinte)
  if (!xml.endsWith('</definitions>')) {
    throw new Error(
      'BPMN_TRUNCATED: Le XML généré est incomplet — le diagramme demandé est trop complexe. ' +
      'Essayez de demander un diagramme plus simple ou avec moins d\'éléments.'
    )
  }

  return xml
}

/* ── Route handler ───────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const { taskId, userMessage } = (await req.json()) as {
    taskId: string
    userMessage: string | null
  }

  const supabase = await createAdminClient()

  /* ── 1. Charger les données ── */
  const [{ data: task }, { data: company }] = await Promise.all([
    supabase.from('tasks').select('*').eq('id', taskId).single(),
    supabase.from('company_settings').select('*').single(),
  ])
  if (!task) return new Response('Task not found', { status: 404 })

  const { data: project } = await supabase
    .from('projects').select('*').eq('id', task.project_id).single()

  // ── Artifacts : chargement explicite + enrichissement sémantique ──────────

  // 1. Artifacts explicitement liés à cette tâche
  const { data: taskArtifacts } = await supabase
    .from('task_artifacts').select('artifact_id').eq('task_id', taskId)

  const explicitArtifacts = (
    await Promise.all(
      (taskArtifacts ?? []).map(async ({ artifact_id }: { artifact_id: string }) => {
        const [{ data: art }, { data: ver }] = await Promise.all([
          supabase.from('artifacts').select('*').eq('id', artifact_id).single(),
          supabase
            .from('artifact_versions')
            .select('content_text')
            .eq('artifact_id', artifact_id)
            .order('version_number', { ascending: false })
            .limit(1)
            .single(),
        ])
        return art ? { ...art, content_text: ver?.content_text ?? null } : null
      })
    )
  ).filter(Boolean) as Array<{ id: string; name: string; description?: string; type: string; role: string; content_text: string | null }>

  // 2. Enrichissement RAG : recherche sémantique sur le projet entier
  //    (si OPENAI_API_KEY présent et que le projet a des artifacts indexés)
  const queryText = `${task.title}\n${task.description ?? ''}`
  const queryEmbedding = await generateEmbedding(queryText)

  let semanticArtifacts: Array<{ id: string; name: string; type: string; role: string; content_text: string | null }> = []
  if (queryEmbedding && task.project_id) {
    const { data: semResults } = await supabase.rpc('search_artifacts', {
      query_embedding: queryEmbedding,
      project_id_filter: task.project_id,
      match_count: 5,
    })
    if (semResults) {
      const explicitIds = new Set(explicitArtifacts.map((a) => a.id))
      semanticArtifacts = (semResults as Array<{
        artifact_id: string; artifact_name: string; artifact_type: string;
        artifact_role: string; content_text: string | null; similarity: number
      }>)
        .filter((r) => !explicitIds.has(r.artifact_id))
        .map((r) => ({
          id: r.artifact_id, name: r.artifact_name,
          type: r.artifact_type, role: r.artifact_role,
          content_text: r.content_text,
          description: undefined as string | undefined,
        }))
    }
  }

  // 3. Fusionner : explicites en priorité, puis résultats RAG complémentaires
  type ArtifactForContext = {
    id: string; name: string; description?: string | null
    type: string; role: string; content_text: string | null
  }
  const allArtifacts: ArtifactForContext[] = [...explicitArtifacts, ...semanticArtifacts]

  // Historique des messages existants
  const { data: prevMessages } = await supabase
    .from('task_messages')
    .select('role, content')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  // Dernière version générée (code courant) — nécessaire pour les corrections
  const { data: currentResult } = await supabase
    .from('task_results')
    .select('code_content, version_number')
    .eq('task_id', taskId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  const isFirstGeneration = !prevMessages?.length && !userMessage

  /* ── 2. Construire le prompt système ── */
  const agentMd = readAgent('agent.md')

  const skillMap: Record<string, string> = {
    bpmn: 'skills/bpmn.md',
    orgchart: 'skills/orgchart.md',
    sequence: 'skills/sequence.md',
    flowchart: 'skills/flowchart.md',
  }
  const skillContent = skillMap[task.diagram_type]
    ? readAgent(skillMap[task.diagram_type])
    : Object.values(skillMap).map(readAgent).join('\n\n---\n\n')

  const companyContext = company?.ai_summary || company?.description || '(aucun contexte)'
  const companyLinks =
    ((company?.links as { label: string; url: string }[]) ?? [])
      .map((l) => `${l.label}: ${l.url}`)
      .join('\n') || '(aucun lien)'

  let system = agentMd
    .replace('{{COMPANY_CONTEXT}}', companyContext)
    .replace('{{COMPANY_LINKS}}', companyLinks)

  system += '\n\n---\n\n## Skill sélectionné\n\n' + skillContent

  if (project?.rules_text) {
    system += '\n\n---\n\n## Règles spécifiques au projet\n\n' + project.rules_text
  }

  if (allArtifacts.length > 0) {
    system += '\n\n---\n\n## Artifacts fournis pour cette tâche\n\n'
    let charsUsed = 0
    let includedCount = 0

    for (const a of allArtifacts) {
      if (!a || charsUsed >= ARTIFACT_TOTAL_BUDGET) break

      let content = a.content_text ?? ''

      // Pour les étalons BPMN : supprimer la section DI (coordonnées visuelles inutiles)
      // Claude génère ses propres coordonnées — on garde uniquement la sémantique du processus
      if (a.type === 'bpmn' && content.includes('<bpmndi:BPMNDiagram')) {
        content = stripBpmnDISection(content)
      }

      // Tronquer si l'artifact dépasse le budget unitaire
      if (content.length > ARTIFACT_MAX_PER_ITEM) {
        content = content.slice(0, ARTIFACT_MAX_PER_ITEM) + '\n… [contenu tronqué]'
      }

      const isRAG = !explicitArtifacts.find((e) => e.id === a.id)
      const roleLabel = a.role === 'example' ? '⭐ Étalon' : '📋 Contexte'
      const sourceLabel = isRAG ? ' · trouvé par RAG' : ''

      system += `### ${a.name} (${roleLabel}${sourceLabel})\n`
      if (a.description) system += `${a.description}\n`
      if (content) system += '```\n' + content + '\n```\n'
      system += '\n'

      charsUsed += content.length
      includedCount++
    }

    if (includedCount < allArtifacts.length) {
      system += `> *${allArtifacts.length - includedCount} artifact(s) supplémentaire(s) non inclus (budget contexte atteint).*\n\n`
    }
  }

  /* ── 3. Construire les messages Claude ── */
  const initialUserContent =
    `Génère un diagramme de type **${task.diagram_type}** pour la tâche suivante :\n\n` +
    `**Titre** : ${task.title}\n\n**Description** : ${task.description}`

  const claudeMessages: { role: 'user' | 'assistant'; content: string }[] = []

  if (prevMessages?.length) {
    /*
     * Compression de l'historique :
     * Les anciennes réponses assistant contenant du XML/Mermaid sont remplacées
     * par un stub court. Seul le code COURANT (version DB) est injecté une seule
     * fois dans la demande de correction. Cela évite d'envoyer N copies du XML
     * complet à chaque nouvelle génération.
     */
    let assistantVersion = 0
    for (const m of prevMessages) {
      if (m.role === 'assistant') {
        assistantVersion++
        const hasCode = /```(?:xml|bpmn|mermaid)/.test(m.content)
        claudeMessages.push({
          role: 'assistant',
          content: hasCode
            ? `[Diagramme v${assistantVersion} généré et enregistré en base de données]`
            : m.content, // conserver les messages sans code (questions, avertissements…)
        })
      } else {
        claudeMessages.push({ role: 'user', content: m.content })
      }
    }

    if (userMessage) {
      /*
       * Injecter le code courant UNE SEULE FOIS avec la demande de correction,
       * plutôt que de laisser Claude tenter de "se souvenir" de sa dernière version.
       */
      const codeContext = currentResult?.code_content
        ? `Code actuel (v${currentResult.version_number}) — applique ta correction sur ce code :\n` +
          `\`\`\`xml\n${currentResult.code_content}\n\`\`\`\n\n`
        : ''
      claudeMessages.push({
        role: 'user',
        content: `${codeContext}Correction demandée : ${userMessage}`,
      })
    }
  } else {
    // Première génération
    claudeMessages.push({ role: 'user', content: initialUserContent })
  }

  /* ── 4. Streamer la réponse Claude ── */
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('ANTHROPIC_API_KEY manquant dans .env.local', { status: 500 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = ''
      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 8192,
          system,
          messages: claudeMessages,
          stream: true,
        })

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const chunk = event.delta.text
            fullContent += chunk
            controller.enqueue(encoder.encode(chunk))
          }
        }

        /* ── 5. Sauvegarder en DB ── */
        const rawCode = extractCode(fullContent)
        const isAdviceOnly = !rawCode // réponse texte pur → conseil/analyse, pas de diagramme

        // Message utilisateur
        const userContent = isFirstGeneration ? initialUserContent : userMessage
        if (userContent) {
          await supabase.from('task_messages').insert({
            task_id: taskId,
            role: 'user',
            content: userContent,
          })
        }

        let savedResultId: string | null = null

        if (!isAdviceOnly) {
          // Réponse avec diagramme → créer une nouvelle task_result
          let code = rawCode!
          if (task.diagram_type === 'bpmn') code = sanitizeBpmnXml(code)

          const { data: lastResult } = await supabase
            .from('task_results')
            .select('version_number')
            .eq('task_id', taskId)
            .order('version_number', { ascending: false })
            .limit(1)
            .single()

          const { data: savedResult } = await supabase
            .from('task_results')
            .insert({
              task_id: taskId,
              diagram_type: task.diagram_type,
              code_content: code,
              version_number: (lastResult?.version_number ?? 0) + 1,
              is_approved: false,
            })
            .select('id')
            .single()

          savedResultId = savedResult?.id ?? null
        }
        // Réponse conseil pur → pas de task_result, le diagramme actuel reste inchangé

        // Message assistant (dans tous les cas)
        await supabase.from('task_messages').insert({
          task_id: taskId,
          role: 'assistant',
          content: fullContent,
          task_result_id: savedResultId,
        })

        // Statut tâche → in_progress (seulement si un nouveau diagramme a été produit)
        if (!isAdviceOnly) {
          await supabase
            .from('tasks')
            .update({ status: 'in_progress' })
            .eq('id', taskId)
        }

      } catch (err) {
        console.error('[/api/generate]', err)
        controller.enqueue(encoder.encode('\n\n⚠️ Erreur lors de la génération.'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
