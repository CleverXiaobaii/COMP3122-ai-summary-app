import { supabase, ensureSupabaseEnv } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  try {
    ensureSupabaseEnv()

    const { path, bucket } = await request.json()
    const bucketName = bucket || 'documents'

    if (!path) {
      return NextResponse.json(
        { error: 'Missing file path' },
        { status: 400 }
      )
    }

    // Delete file from storage
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path])

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      path
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete file'
      },
      { status: 500 }
    )
  }
}
