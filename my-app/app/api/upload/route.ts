import { supabase, ensureSupabaseEnv } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    ensureSupabaseEnv()
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucketName = (formData.get('bucket') as string) || 'default'
    const userId = formData.get('userId') as string || null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // For user buckets, ensure the bucket exists
    if (bucketName.startsWith('user-') && bucketName !== 'default') {
      try {
        // Try to create bucket if it doesn't exist
        const { error: bucketError } = await supabase.storage.createBucket(bucketName, {
          public: false,
          allowedMimeTypes: ['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          fileSizeLimit: 50 * 1024 * 1024 // 50MB
        })
        
        if (bucketError && !bucketError.message.includes('already exists')) {
          console.warn('Failed to create user bucket:', bucketError)
        }
      } catch (bucketErr) {
        console.warn('Bucket creation error (may already exist):', bucketErr)
      }
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
    
    // Record metadata in Postgres `documents` table
    let documentId: string | null = null
    try {
      const now = new Date().toISOString()
      const { data: insertedData, error: dbErr } = await supabase
        .from('documents')
        .insert({
          file_name: fileName,
          path: data?.path,
          public_url: publicUrl,
          file_type: file.type || null,
          size: file.size || null,
          uploaded_at: now,
          created_at: now,
          is_deleted: false,
          user_id: userId,
          bucket_name: bucketName
        })
        .select('id')
        .single()
      
      if (!dbErr && insertedData) {
        documentId = insertedData.id
        console.log(`Document stored in DB with ID: ${documentId} for user: ${userId}`)
        
        // Log the file upload action
        if (userId) {
          await fetch(`${request.nextUrl.origin}/api/auth/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              actionType: 'file_upload',
              details: { fileName, fileSize: file.size, bucketName }
            })
          }).catch(err => console.warn('Failed to log upload action:', err))
        }
      } else {
        console.warn('Failed to insert document metadata into Postgres:', dbErr)
      }
    } catch (dbErr) {
      console.warn('Failed to insert document metadata into Postgres:', dbErr)
    }

    return NextResponse.json({
      success: true,
      fileName,
      path: data?.path,
      publicUrl,
      fileSize: file.size,
      documentId,
      bucketName
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
