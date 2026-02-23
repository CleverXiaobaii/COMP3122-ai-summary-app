import { supabase, supabaseAdmin } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envStatus = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set'
    }

    // Test regular client connection
    let regularClientTest = { success: false, error: '' }
    try {
      const { data, error } = await supabase.from('documents').select('count').limit(1)
      regularClientTest = { 
        success: !error, 
        error: error?.message || '' 
      }
    } catch (err) {
      regularClientTest = { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      }
    }

    // Test admin client connection
    let adminClientTest = { success: false, error: '' }
    try {
      const { data, error } = await supabaseAdmin.from('documents').select('count').limit(1)
      adminClientTest = { 
        success: !error, 
        error: error?.message || '' 
      }
    } catch (err) {
      adminClientTest = { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      }
    }

    // Test storage access
    let storageTest = { success: false, error: '' }
    try {
      const { data, error } = await supabaseAdmin.storage.from('default').list('', { limit: 1 })
      storageTest = { 
        success: !error, 
        error: error?.message || '' 
      }
    } catch (err) {
      storageTest = { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      }
    }

    // Get current RLS policies for documents table
    let rlsPolicies = []
    try {
      // This query requires superuser privileges, so we'll try a different approach
      // Instead, we'll test if we can insert a test record
      const testRecord = {
        file_name: 'test-rls-check.txt',
        path: 'test-rls-check.txt',
        public_url: 'https://example.com/test',
        file_type: 'text/plain',
        size: 0,
        uploaded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        is_deleted: false,
        user_id: '00000000-0000-0000-0000-000000000000',
        bucket_name: 'default'
      }

      const { data, error } = await supabaseAdmin.from('documents').insert(testRecord).select()
      const testInsert = { 
        success: !error, 
        error: error?.message || '',
        canInsert: !error
      }

      // Clean up test record if it was inserted
      if (data && data.length > 0) {
        await supabaseAdmin.from('documents').delete().eq('id', data[0].id)
      }

      rlsPolicies = [testInsert]
    } catch (err) {
      rlsPolicies = [{ 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error',
        canInsert: false
      }]
    }

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      environment: envStatus,
      connections: {
        regularClient: regularClientTest,
        adminClient: adminClientTest,
        storage: storageTest
      },
      rlsTests: {
        documentsTable: rlsPolicies
      },
      recommendations: [
        !envStatus.SUPABASE_SERVICE_ROLE_KEY.includes('Set') 
          ? '⚠️ SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will fail.' 
          : '✅ SUPABASE_SERVICE_ROLE_KEY is set.',
        !adminClientTest.success 
          ? `⚠️ Admin client test failed: ${adminClientTest.error}` 
          : '✅ Admin client test passed.',
        !storageTest.success 
          ? `⚠️ Storage test failed: ${storageTest.error}` 
          : '✅ Storage test passed.'
      ]
    })

  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}