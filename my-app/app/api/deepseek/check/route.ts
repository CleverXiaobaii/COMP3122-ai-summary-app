import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const key = process.env.DEEPSEEK_API_KEY
    if (!key) return NextResponse.json({ success: false, error: 'DEEPSEEK_API_KEY not configured' }, { status: 400 })

    const endpoint = 'https://api.deepseek.com/chat/completions'
    const payload = {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Please summarize: Hello world.' }
      ],
      stream: false
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify(payload)
    })

    const text = await res.text()
    let parsed: any = null
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }

    return NextResponse.json({ success: res.ok, status: res.status, response: typeof parsed === 'string' ? parsed.slice(0, 2000) : parsed })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
