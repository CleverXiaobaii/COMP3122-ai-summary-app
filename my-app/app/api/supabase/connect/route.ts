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
      // If listing buckets is not permitted for this key, attempt a direct read on the default bucket
      try {
        const { data: filesInDefault, error: listErr } = await supabase.storage.from('default').list('', { limit: 1 })
        const directAccess = !listErr

        return NextResponse.json(
          {
            status: directAccess ? 'success' : 'error',
            message: directAccess ? 'Connected to Supabase (direct access to default bucket)' : 'Failed to connect to Supabase',
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
            envVarsSet: { hasUrl, hasKey },
            bucketsCount: directAccess ? 1 : 0,
            buckets: directAccess ? [{ name: 'default', public: true }] : [],
            directDefaultAccess: { success: directAccess, fileCount: Array.isArray(filesInDefault) ? filesInDefault.length : null },
            error: bucketsError.message
          },
          directAccess ? { status: 200 } : { status: 500 }
        )
      } catch (innerErr) {
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
