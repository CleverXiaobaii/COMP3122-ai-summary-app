import { supabaseAdmin, ensureSupabaseEnv } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

type RequestUser = {
  id: string | null
  role: 'user' | 'admin' | 'guest'
}

type DocumentRow = {
  id: string
  file_name: string
  path: string
  file_type: string | null
  size: number | null
  created_at: string
  is_deleted: boolean
  deleted_at: string | null
  summary: string | null
  summary_source: string | null
  summary_model: string | null
  summary_generated_at: string | null
  user_id: string | null
  bucket_name: string
}

type ListedFile = {
  id?: string
  fileName: string
  path: string
  publicUrl: string
  fileType: string
  size?: number
  uploadedAt: string
  createdAt: string
  isDeleted: boolean
  deletedAt: string | null
  summary: string | null
  summarySource: string | null
  summaryModel: string | null
  summaryGeneratedAt: string | null
  userId: string | null
  bucketName: string
}

function getRequestUser(request: NextRequest): RequestUser | null {
  const isLoggedIn = request.cookies.get('isLoggedIn')?.value === 'true'
  const encodedUser = request.cookies.get('user')?.value

  if (!isLoggedIn || !encodedUser) {
    return null
  }

  try {
    return JSON.parse(decodeURIComponent(encodedUser))
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    ensureSupabaseEnv()

    const requestUser = getRequestUser(request)
    if (!requestUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bucketNames = new Set<string>(['default'])
    if (requestUser.role === 'user' && requestUser.id) {
      bucketNames.add(`user-${requestUser.id}`)
    }

    // Fetch documents from the database (including soft-deleted ones)
    // Use admin client to bypass RLS policies - app will filter by user
    const { data: dbDocsRaw, error: dbErr } = await supabaseAdmin
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (dbErr) {
      console.warn('Failed to fetch documents from database:', dbErr)
      // Continue with storage list as fallback
    }

    const dbDocs: DocumentRow[] = (dbDocsRaw || []).filter((doc: DocumentRow) => {
      if (requestUser.role === 'admin') return true
      if (requestUser.role === 'guest') {
        return doc.bucket_name === 'default'
      }
      const userBucket = requestUser.id ? `user-${requestUser.id}` : null
      return doc.user_id === requestUser.id || (userBucket ? doc.bucket_name === userBucket : false)
    })

    // Create a map of database documents by bucket/path
    const dbDocsByPath: Record<string, DocumentRow> = {}
    if (dbDocs) {
      dbDocs.forEach(doc => {
        if (doc.path && doc.bucket_name) {
          dbDocsByPath[`${doc.bucket_name}/${doc.path}`] = doc
        }
      })
    }

    const filesWithUrls: ListedFile[] = []

    for (const bucketName of bucketNames) {
      const { data: files, error } = await supabaseAdmin.storage
        .from(bucketName)
        .list()

      if (error) {
        console.warn(`Failed to list bucket ${bucketName}:`, error)
        continue
      }

      for (const file of files || []) {
        let fileUrl = ''
        if (bucketName === 'default') {
          const { data: { publicUrl } } = supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(file.name)
          fileUrl = publicUrl
        } else {
          const { data: signedData, error: signedErr } = await supabaseAdmin.storage
            .from(bucketName)
            .createSignedUrl(file.name, 24 * 60 * 60)

          if (signedErr) {
            console.warn(`Failed to create signed URL for ${bucketName}/${file.name}:`, signedErr)
            continue
          }

          fileUrl = signedData?.signedUrl || ''
        }

        const dbInfo = dbDocsByPath[`${bucketName}/${file.name}`]

        filesWithUrls.push({
          id: dbInfo?.id,
          fileName: file.name,
          path: file.name,
          publicUrl: fileUrl,
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
          bucketName: dbInfo?.bucket_name || bucketName
        })
      }
    }

    filesWithUrls.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime()
      const bTime = new Date(b.createdAt || 0).getTime()
      return bTime - aTime
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

