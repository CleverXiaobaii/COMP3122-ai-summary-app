import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { fileUrl, fileName, fileType, content } = await request.json()

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        {
          error: 'Google Gemini API key not configured',
          hint: 'Set GOOGLE_GENERATIVE_AI_API_KEY environment variable'
        },
        { status: 400 }
      )
    }

    // Create sample content for summarization
    const documentContent =
      content ||
      `Document: ${fileName}
File Type: ${fileType || 'unknown'}

This document has been uploaded to our system for analysis and summarization.
Please provide a concise 2-3 sentence summary of the key points.`

    // Use Gemini Pro model (free tier)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `Please provide a brief 2-3 sentence summary of the following document:

File Name: ${fileName}
File Type: ${fileType || 'unknown'}

Content:
${documentContent.substring(0, 2000)}

Summary:`

    const result = await model.generateContent(prompt)
    const summary = result.response.text()

    return NextResponse.json({
      success: true,
      fileName,
      summary: summary.trim() || 'Unable to generate summary',
      model: 'gemini-1.5-flash',
      free: true
    })
  } catch (error) {
    console.error('Summarization error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to generate summary',
        details: errorMessage,
        hint: errorMessage.includes('API')
          ? 'Check if GOOGLE_GENERATIVE_AI_API_KEY is valid'
          : 'Please try again in a few moments'
      },
      { status: 500 }
    )
  }
}
