import { supabase, ensureSupabaseEnv } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    ensureSupabaseEnv()
    
    const bucketName = 'default'
    
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Failed to list buckets',
          error: listError.message
        },
        { status: 500 }
      )
    }

    const bucketExists = buckets?.some(b => b.name === bucketName)
    
    if (bucketExists) {
      return NextResponse.json({
        status: 'success',
        message: `Bucket "${bucketName}" already exists`,
        bucket: buckets?.find(b => b.name === bucketName)
      })
    }

    // Create bucket
    const { data: newBucket, error: createError } = await supabase.storage.createBucket(
      bucketName,
      {
        public: false,
        fileSizeLimit: 52428800 // 50MB
      }
    )

    if (createError) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Failed to create bucket',
          error: createError.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'success',
      message: `Bucket "${bucketName}" created successfully`,
      bucket: newBucket
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
