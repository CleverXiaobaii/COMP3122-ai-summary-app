import { supabase, ensureSupabaseEnv } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    ensureSupabaseEnv()
    
    console.log('Diagnosing storage access...')
    
    // Test 1: List buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    console.log('List buckets result:', { buckets, listError })
    
    // Test 2: Try direct access to 'default' bucket
    const { data: defaultFolderContents, error: defaultError } = await supabase.storage
      .from('default')
      .list('', { limit: 1 })
    
    console.log('Direct default bucket access:', { defaultFolderContents, defaultError })

    return NextResponse.json({
      status: 'diagnostic',
      test1_listBuckets: {
        success: !listError,
        data: buckets,
        error: listError?.message
      },
      test2_directDefaultBucketAccess: {
        success: !defaultError,
        fileCount: defaultFolderContents?.length || 0,
        error: defaultError?.message
      },
      recommendations: {
        bucketListFailed: listError ? 'Anonymous users may not have permission to list buckets (check RLS policies)' : 'OK',
        directAccessWorks: !defaultError ? '✅ Can access default bucket directly' : '❌ Cannot access default bucket'
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Diagnostic error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
