import { HfInference } from '@huggingface/inference'
import { NextRequest, NextResponse } from 'next/server'

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { fileUrl, fileName, fileType, content } = await request.json()

    if (!process.env.HUGGINGFACE_API_KEY) {
      return NextResponse.json(
        {
          error: 'HuggingFace API key not configured',
          hint: 'Set HUGGINGFACE_API_KEY environment variable'
        },
        { status: 400 }
      )
    }

    // Create a sample content for demonstration
    // In a full implementation, you would fetch and parse the file content
    const sampleContent =
      content ||
      `Document: ${fileName}
Type: ${fileType || 'unknown'}
This is a sample document content for demonstration purposes.
The AI will generate a meaningful summary based on the provided text.`

    // Use HuggingFace's free summarization model (facebook/bart-large-cnn)
    const summary = await hf.summarization({
      model: 'facebook/bart-large-cnn',
      inputs: sampleContent.substring(0, 1024) // API has input length limits
    })

    return NextResponse.json({
      success: true,
      fileName,
      summary: summary.summary_text || 'Unable to generate summary',
      model: 'facebook/bart-large-cnn',
      free: true
    })
  } catch (error) {
    console.error('Summarization error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to generate summary',
        details: errorMessage,
        hint:
          errorMessage.includes('401') || errorMessage.includes('Unauthorized')
            ? 'Check if HUGGINGFACE_API_KEY is valid'
            : 'The model may be loading. Please try again in a few seconds.'
      },
      { status: 500 }
    )
  }
}
