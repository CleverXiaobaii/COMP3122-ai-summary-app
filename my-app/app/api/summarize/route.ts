import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')

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

    // Try using Google Generative AI; if it fails, fallback to local algorithm
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      try {
        const model = genAI.getGenerativeModel({ model: 'models/text-bison-001' })
        const prompt = `Summarize the following document in 2 short sentences:\n\n${documentContent.substring(0, 3000)}\n\nSummary:`
        const result = await model.generateContent(prompt)
        const anyRes: any = result
        let summary = ''
        if (!anyRes) {
          summary = ''
        } else if (typeof anyRes === 'string') {
          summary = anyRes
        } else if (anyRes.response && typeof anyRes.response.text === 'function') {
          summary = anyRes.response.text()
        } else if (typeof anyRes.response === 'string') {
          summary = anyRes.response
        } else if (anyRes.output_text) {
          summary = anyRes.output_text
        } else if (anyRes.output && anyRes.output[0] && anyRes.output[0].content && anyRes.output[0].content[0]) {
          summary = String(anyRes.output[0].content[0].text || anyRes.output[0].content[0])
        } else {
          summary = JSON.stringify(anyRes).slice(0, 2000)
        }

        if (summary && summary.trim()) {
          return NextResponse.json({ success: true, fileName, summary: summary.trim(), model: 'text-bison-001', source: 'google' })
        }
      } catch (err) {
        console.error('[Summarize] Google API failed, falling back to local summarizer:', err)
      }
    }

    // Fallback: local extractive summary
    const fallback = localExtractiveSummary(documentContent, 2)
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
