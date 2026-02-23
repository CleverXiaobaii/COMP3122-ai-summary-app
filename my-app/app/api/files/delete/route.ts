import { supabase, supabaseAdmin, ensureSupabaseEnv } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  try {
    ensureSupabaseEnv()

    const { path, bucket, fileId } = await request.json()
    const bucketName = bucket || 'default'

    if (!path) {
      return NextResponse.json(
        { error: 'Missing file path' },
        { status: 400 }
      )
    }

    // If fileId is provided, use it for more accurate deletion
    const deleteCondition = fileId ? { id: fileId } : { path }

    // Soft delete: Mark as deleted in database
    try {
      const now = new Date().toISOString()
            const { data: deletedDoc } = await supabaseAdmin
        .from('documents')
        .update({
          is_deleted: true,
          deleted_at: now
        })
        .match(deleteCondition)
        .select('user_id')
        .single()
      
      // Log the deletion action
      if (deletedDoc?.user_id) {
        await fetch(`${request.nextUrl.origin}/api/auth/log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: deletedDoc.user_id,
            actionType: 'file_delete',
            details: { path, bucketName }
          })
        }).catch(err => console.warn('Failed to log delete action:', err))
      }
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
