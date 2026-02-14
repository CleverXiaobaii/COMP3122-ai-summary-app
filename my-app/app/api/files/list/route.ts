import { supabase, ensureSupabaseEnv } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    ensureSupabaseEnv()

    const bucketName = 'default'

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
    const filesWithUrls: any[] = (files || []).map(file => {
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
    // Attempt to fetch any saved summaries from Postgres and merge by path
    try {
      const paths = filesWithUrls.map(f => f.path)
      if (paths.length > 0) {
        const { data: rows, error: rowsErr } = await supabase.from('documents').select('path,summary,summary_source,summary_model').in('path', paths)
        if (!rowsErr && rows) {
          const byPath: Record<string, any> = {}
          ;(rows || []).forEach(r => { byPath[r.path] = r })
          filesWithUrls.forEach(f => {
            if (byPath[f.path]) {
              f.summary = byPath[f.path].summary || null
              f.summarySource = byPath[f.path].summary_source || null
              f.summaryModel = byPath[f.path].summary_model || null
            }
          })
        }
      }
    } catch (mergeErr) {
      console.warn('Failed to merge summaries from Postgres:', mergeErr)
    }

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
