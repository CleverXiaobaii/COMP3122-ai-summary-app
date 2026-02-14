import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')

export async function GET() {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_GENERATIVE_AI_API_KEY not configured' },
        { status: 400 }
      )
    }

    // Attempt to list models available to the key
    try {
      // Some SDKs expose listModels; attempt and return result
      // Use any to avoid strict typing issues
      const anyGen: any = genAI
      const list = typeof anyGen.listModels === 'function' ? await anyGen.listModels() : await anyGen.list_models?.()

      return NextResponse.json({ success: true, models: list })
    } catch (err) {
      // Return raw error for debugging
      return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
