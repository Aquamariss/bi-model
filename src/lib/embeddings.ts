/**
 * Génère un embedding vectoriel via OpenAI text-embedding-3-small (1536 dims).
 * Retourne null si OPENAI_API_KEY est absent ou en cas d'erreur réseau.
 * Le RAG est conçu pour dégrader gracieusement : si pas d'embedding → fallback
 * sur les artifacts explicitement liés sans tri sémantique.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY) return null

  // OpenAI text-embedding-3-small supporte ~8 191 tokens (~32 000 chars)
  const input = text.slice(0, 32_000)
  if (!input.trim()) return null

  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input }),
    })

    if (!res.ok) {
      console.error('[embeddings] OpenAI error', res.status, await res.text())
      return null
    }

    const data = await res.json()
    return (data.data?.[0]?.embedding as number[]) ?? null
  } catch (err) {
    console.error('[embeddings] fetch error', err)
    return null
  }
}
