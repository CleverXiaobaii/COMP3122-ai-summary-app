import { supabase, supabaseAdmin, ensureSupabaseEnv } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    ensureSupabaseEnv()
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    let bucketName = (formData.get('bucket') as string) || 'default'
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
        // First check if bucket exists by trying to list files
        const { data: listData, error: listError } = await supabase.storage
          .from(bucketName)
          .list()
        
        // If bucket doesn't exist, try to create it
        if (listError && listError.message.includes('not found')) {
                    console.log(`Creating storage bucket: ${bucketName}`)
          const { error: bucketError } = await supabaseAdmin.storage.createBucket(bucketName, {
            public: false,
            allowedMimeTypes: ['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            fileSizeLimit: 50 * 1024 * 1024 // 50MB
          })
          
          if (bucketError) {
            console.error(`Failed to create bucket ${bucketName}:`, bucketError)
            // If bucket creation fails, try to upload to default bucket instead
            console.warn(`Falling back to default bucket for user: ${userId}`)
            bucketName = 'default'
          } else {
            console.log(`Bucket ${bucketName} created successfully`)
          }
        } else if (listError) {
          console.warn(`Error checking bucket ${bucketName}:`, listError)
          // If there's an error checking, fall back to default
          bucketName = 'default'
        } else {
          console.log(`Bucket ${bucketName} exists, contains ${listData?.length || 0} files`)
        }
      } catch (bucketErr) {
        console.error('Bucket creation/check error:', bucketErr)
        // Fall back to default bucket
        bucketName = 'default'
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
    // Use admin client to bypass RLS policies
    let documentId: string | null = null
    try {
      const now = new Date().toISOString()
      const { data: insertedData, error: dbErr } = await supabaseAdmin
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
