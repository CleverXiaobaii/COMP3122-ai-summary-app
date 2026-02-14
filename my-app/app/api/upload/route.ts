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

    // Upload file directly to the bucket
    const fileName = `${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file)

    if (error) {
      return NextResponse.json(
        { 
          error: `Upload failed: ${error.message}`,
          bucket: bucketName,
          hint: 'Check Supabase > Storage > Policies for RLS configuration',
          diagnostic: 'Visit /api/storage/diagnose for more details'
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
