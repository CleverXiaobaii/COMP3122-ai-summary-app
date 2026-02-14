import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function localExtractiveSummary(text: string, maxSentences = 2) {
  if (!text) return 'No content to summarize.'

  // Split into sentences (simple heuristic)
  const sentences = text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)

  if (sentences.length <= maxSentences) return sentences.join(' ')

  // Build word frequency
  const stopwords = new Set([
    'the', 'is', 'in', 'and', 'to', 'a', 'of', 'for', 'on', 'with', 'that', 'this', 'it'
  ])
  const freq: Record<string, number> = {}
  const words = text.toLowerCase().match(/\w+/g) || []
  for (const w of words) {
    if (stopwords.has(w)) continue
    freq[w] = (freq[w] || 0) + 1
  }

  // Score sentences
  const scored = sentences.map(s => {
    const sWords = s.toLowerCase().match(/\w+/g) || []
    const score = sWords.reduce((acc, w) => acc + (freq[w] || 0), 0)
    return { s, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, maxSentences).map(x => x.s).join(' ')
}

export async function POST(request: NextRequest) {
  try {
    const { fileUrl, fileName, fileType, content } = await request.json()

    // prepare document content (in production, fetch and extract file text)
    const documentContent =
      content ||
      `Document: ${fileName}\nFile Type: ${fileType || 'unknown'}\n\nThis document has been uploaded for summarization.`

    // If a fileUrl was provided but no raw text `content`, try fetching the file (with timeout)
    let fetchedContent: string | null = null
    if (fileUrl && !content) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)
        const resp = await fetch(fileUrl, { signal: controller.signal })
        clearTimeout(timeout)
        if (resp.ok) {
          const ct = (resp.headers.get('content-type') || '').toLowerCase()
          if (ct.includes('text') || ct.includes('json')) {
            fetchedContent = await resp.text()
          } else if (ct.includes('pdf') || (fileType || '').toLowerCase() === 'pdf') {
            // Attempt to extract text from PDF using pdf-parse
            try {
              const arrayBuffer = await resp.arrayBuffer()
              const buffer = Buffer.from(arrayBuffer)
              // dynamic import to avoid build-time issues
              const pdfParse = (await import('pdf-parse')).default || (await import('pdf-parse'))
              const parsed: any = await pdfParse(buffer)
              fetchedContent = String(parsed?.text || '').trim()
            } catch (pdfErr) {
              console.warn('[Summarize] PDF parse failed:', pdfErr)
            }
          } else {
            // not a text resource; leave fetchedContent null
            console.warn('[Summarize] Fetched file is not text, content-type=', ct)
          }
        } else {
          console.warn('[Summarize] Failed to fetch fileUrl, status=', resp.status)
        }
      } catch (err) {
        console.warn('[Summarize] Error fetching fileUrl:', err instanceof Error ? err.message : String(err))
      }
    }

    // Try using Deepseek chat completions API if API key is provided; otherwise fallback to local algorithm
    if (process.env.DEEPSEEK_API_KEY) {
      try {
        const endpoint = 'https://api.deepseek.com/chat/completions'
        const payload = {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that summarizes documents.' },
            { role: 'user', content: `Summarize the following document in 2 short sentences:\n\n${(fetchedContent || documentContent).substring(0, 3000)}\n\nSummary:` }
          ],
          stream: false
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify(payload),
          // set a reasonable timeout by using AbortController if desired (omitted for brevity)
        })

        if (res.ok) {
          const data = await res.json()
          // Attempt to parse common shapes: choices[0].message.content, output_text, text, or similar
          let summary = ''
          try {
            if (data?.choices && Array.isArray(data.choices) && data.choices[0]) {
              const c0 = data.choices[0]
              if (c0.message && c0.message.content) summary = String(c0.message.content)
              else if (c0.text) summary = String(c0.text)
            }
            if (!summary && data?.output_text) summary = String(data.output_text)
            if (!summary && data?.text) summary = String(data.text)
            if (!summary && typeof data === 'string') summary = data
            if (!summary && data) summary = JSON.stringify(data).slice(0, 2000)
          } catch (parseErr) {
            summary = JSON.stringify(data).slice(0, 2000)
          }

          if (summary && summary.trim()) {
            // Attempt to update Postgres record with the generated summary (best-effort)
            try {
              await supabase.from('documents').update({
                summary: summary.trim(),
                summary_source: 'deepseek',
                summary_model: 'deepseek-chat',
                summary_generated_at: new Date().toISOString()
              }).eq('path', fileName)
            } catch (uErr) {
              console.warn('Failed to update document summary in Postgres:', uErr)
            }

            return NextResponse.json({ success: true, fileName, summary: summary.trim(), model: 'deepseek-chat', source: 'deepseek' })
          }
        } else {
          console.warn('[Summarize] Deepseek API returned non-OK:', res.status, await res.text())
        }
      } catch (err) {
        console.warn('[Summarize] Deepseek request failed:', err instanceof Error ? err.message : String(err))
      }
    }

    // Fallback: local extractive summary
    const fallback = localExtractiveSummary(documentContent, 2)
    try {
      await supabase.from('documents').update({
        summary: fallback,
        summary_source: 'local',
        summary_model: 'local-extractive',
        summary_generated_at: new Date().toISOString()
      }).eq('path', fileName)
    } catch (uErr) {
      console.warn('Failed to update document summary in Postgres (local fallback):', uErr)
    }

    return NextResponse.json({ success: true, fileName, summary: fallback, model: 'local-extractive', source: 'local' })
  } catch (error) {
    console.error('[Summarize] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: 'Failed to generate summary', details: errorMessage },
      { status: 500 }
    )
  }
}
