import { supabase, ensureSupabaseEnv } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    ensureSupabaseEnv()
    
    // Test connection by fetching user data (will be null if not authenticated)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Test database connectivity with a simple query
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .limit(1)

    if (userError || tableError) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Failed to connect to Supabase',
          userError: userError?.message,
          tableError: tableError?.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'success',
      message: 'Connected to Supabase',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      isAuthenticated: !!user
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
