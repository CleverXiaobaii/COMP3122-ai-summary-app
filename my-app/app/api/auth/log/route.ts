import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, actionType, ipAddress, userAgent, details } = await request.json()

    if (!actionType) {
      return NextResponse.json(
        { error: 'Action type is required' },
        { status: 400 }
      )
    }

    // Get client IP address and user agent
    const clientIp = ipAddress || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const clientUserAgent = userAgent || request.headers.get('user-agent') || 'unknown'

    const { data: log, error } = await supabase
      .from('logs')
      .insert({
        user_id: userId || null,
        action_type: actionType,
        ip_address: clientIp,
        user_agent: clientUserAgent,
        details: details || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error logging action:', error)
      return NextResponse.json(
        { error: 'Failed to log action' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      logId: log.id
    })

  } catch (error) {
    console.error('Log error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}