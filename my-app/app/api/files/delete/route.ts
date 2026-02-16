import { supabase, ensureSupabaseEnv } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  try {
    ensureSupabaseEnv()

    const { path, bucket } = await request.json()
    const bucketName = bucket || 'default'

    if (!path) {
      return NextResponse.json(
        { error: 'Missing file path' },
        { status: 400 }
      )
    }

    // Soft delete: Mark as deleted in database
    try {
      const now = new Date().toISOString()
      await supabase
        .from('documents')
        .update({
          is_deleted: true,
          deleted_at: now
        })
        .eq('path', path)
    } catch (dbErr) {
      console.warn('Failed to soft delete in documents table:', dbErr)
      // Continue with storage deletion even if DB update fails
    }

    // Also delete file from storage (hard delete)
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
