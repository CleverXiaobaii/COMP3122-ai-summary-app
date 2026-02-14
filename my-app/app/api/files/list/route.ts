import { supabase, ensureSupabaseEnv } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    ensureSupabaseEnv()

    const bucketName = 'documents'

    // List all files in the bucket
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Map files with public URLs
    const filesWithUrls = (files || []).map(file => {
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(file.name)

      return {
        fileName: file.name,
        path: file.name,
        publicUrl,
        uploadedAt: new Date(file.created_at).toLocaleString('zh-CN')
      }
    })

    return NextResponse.json({
      success: true,
      count: filesWithUrls.length,
      files: filesWithUrls
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to list files'
      },
      { status: 500 }
    )
  }
}
