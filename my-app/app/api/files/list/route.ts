import { supabase, supabaseAdmin, ensureSupabaseEnv } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    ensureSupabaseEnv()

    const bucketName = 'default'

        // Fetch documents from the database (including soft-deleted ones)
    // Use admin client to bypass RLS policies - app will filter by user
    const { data: dbDocs, error: dbErr } = await supabaseAdmin
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (dbErr) {
      console.warn('Failed to fetch documents from database:', dbErr)
      // Continue with storage list as fallback
    }

    // Create a map of database documents by path
    const dbDocsByPath: Record<string, any> = {}
    if (dbDocs) {
      dbDocs.forEach(doc => {
        if (doc.path) {
          dbDocsByPath[doc.path] = doc
        }
      })
    }

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

    // Map files with public URLs and database metadata
    const filesWithUrls: any[] = (files || []).map(file => {
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(file.name)

      // Get database info for this file
      const dbInfo = dbDocsByPath[file.name]

            return {
        id: dbInfo?.id,
        fileName: file.name,
        path: file.name,
        publicUrl,
        fileType: dbInfo?.file_type || 'unknown',
        size: dbInfo?.size || file.metadata?.size,
        uploadedAt: new Date(file.created_at).toLocaleString('en-US'),
        createdAt: dbInfo?.created_at || file.created_at,
        isDeleted: dbInfo?.is_deleted || false,
        deletedAt: dbInfo?.deleted_at || null,
        summary: dbInfo?.summary || null,
        summarySource: dbInfo?.summary_source || null,
        summaryModel: dbInfo?.summary_model || null,
        summaryGeneratedAt: dbInfo?.summary_generated_at || null,
        userId: dbInfo?.user_id || null,
        bucketName: dbInfo?.bucket_name || 'default'
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

