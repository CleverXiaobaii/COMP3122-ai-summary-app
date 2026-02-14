import { Anthropic } from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { fileUrl, fileName, fileType } = await request.json()

    if (!fileUrl || !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          hint: 'Ensure fileUrl is provided and ANTHROPIC_API_KEY is set'
        },
        { status: 400 }
      )
    }

    // For now, create a summary based on filename and instructions
    // In a full implementation, you would:
    // 1. Fetch the file from fileUrl
    // 2. Extract text from the file (PDF, DOCX, etc.)
    // 3. Send the text to Claude for summarization

    const prompt = `Please generate a concise summary for the document: "${fileName}"
    
Document type: ${fileType || 'unknown'}

Provide a brief 3-5 sentence summary that captures the main points of this document.`

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    // Extract text content from the response
    const summary = message.content
      .filter(block => block.type === 'text')
      .map(block => ('text' in block ? block.text : ''))
      .join('')

    return NextResponse.json({
      success: true,
      fileName,
      summary: summary || 'Unable to generate summary',
      modelUsed: message.model,
      stopReason: message.stop_reason
    })
  } catch (error) {
    console.error('Summarization error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate summary',
        details: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check if ANTHROPIC_API_KEY is valid and has sufficient quota'
      },
      { status: 500 }
    )
  }
}
