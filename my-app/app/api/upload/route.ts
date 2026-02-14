import { supabase, ensureSupabaseEnv } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    ensureSupabaseEnv()
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucketName = (formData.get('bucket') as string) || 'default'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check if bucket exists (don't try to create with public anon key)
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      return NextResponse.json(
        { 
          error: `Failed to list buckets: ${listError.message}`,
          hint: 'Please initialize storage by visiting /api/storage/init'
        },
        { status: 500 }
      )
    }

    const bucketExists = buckets?.some(b => b.name === bucketName)
    
    if (!bucketExists) {
      return NextResponse.json(
        { 
          error: `Bucket "${bucketName}" not found`,
          hint: 'Please initialize storage by visiting /api/storage/init',
          availableBuckets: buckets?.map(b => b.name) || []
        },
        { status: 400 }
      )
    }

    // Upload file
    const fileName = `${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file)

    if (error) {
      return NextResponse.json(
        { 
          error: `Upload failed: ${error.message}`,
          hint: error.message.includes('CORS') ? 'CORS issue detected' : 'Check bucket permissions'
        },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      fileName,
      path: data?.path,
      publicUrl
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed'
      },
      { status: 500 }
    )
  }
}
