import { supabase, ensureSupabaseEnv } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    ensureSupabaseEnv()
    
    // Test 1: Check if environment variables are properly set
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // Test 2: Try to list storage buckets (validates connection)
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Failed to connect to Supabase',
          envVarsSet: { hasUrl, hasKey },
          error: bucketsError.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'success',
      message: 'Connected to Supabase successfully',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      envVarsSet: { hasUrl, hasKey },
      bucketsCount: buckets?.length || 0,
      buckets: buckets?.map(b => ({ name: b.name, public: b.public })) || []
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
