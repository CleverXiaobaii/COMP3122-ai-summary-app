'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'

interface UploadedFile {
  id?: string
  fileName: string
  path: string
  publicUrl: string
  fileType?: string | null
  size?: number | null
  uploadedAt?: string
  createdAt?: string
  isDeleted?: boolean
  deletedAt?: string | null
  summary?: string
  summaryLoading?: boolean
  summarySource?: string | null
  summaryModel?: string | null
  summaryGeneratedAt?: string | null
  userId?: string | null
  bucketName?: string
}

export default function UploadComponent() {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')
  const [connectionStatus, setConnectionStatus] = useState<string>('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)

  const testConnection = async () => {
    try {
      setConnectionStatus('🔄 Testing connection...')
      const response = await fetch('/api/supabase/connect')
      const data = await response.json()
      
      if (data.status === 'success') {
        setConnectionStatus(
          `✅ Supabase connected | ${data.bucketsCount} storage buckets`
        )
      } else {
        setConnectionStatus(`❌ Connection failed: ${data.message}`)
      }
    } catch (error) {
      setConnectionStatus(
        `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  const loadUploadedFiles = useCallback(async () => {
    if (!user) return
    
    setLoadingFiles(true)
    try {
      const response = await fetch('/api/files/list')
      if (response.ok) {
        const data = await response.json()
        // Filter files based on user role
        let files = data.files || []
        
                if (user.role === 'guest') {
          // Guests can only see files belonging to the guest user
          files = files.filter((file: UploadedFile) => file.userId === user.id)
        } else if (user.role === 'user') {
                  // Regular users can see their own files or files from their user bucket
                  const userBucket = user.id ? `user-${user.id}` : ''
                  files = files.filter((file: UploadedFile) =>
                    file.userId === user.id || (!!userBucket && file.bucketName === userBucket)
                  )
        }
        // Admins can see all files (no filter)
        
        setUploadedFiles(files)
      }
    } catch (error) {
      console.error('Failed to load files:', error)
    } finally {
      setLoadingFiles(false)
    }
  }, [user])

  // Test connection on mount
  useEffect(() => {
    testConnection()
    loadUploadedFiles()
  }, [loadUploadedFiles, user])

  const generateSummary = async (file: UploadedFile) => {
    // Update by path to avoid index mismatch if list changed
    setUploadedFiles(prev => {
      const next = prev.map(p => ({ ...p }))
      const idx = next.findIndex(f => f.path === file.path)
      if (idx >= 0) next[idx].summaryLoading = true
      return next
    })

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl: file.publicUrl,
          fileName: file.fileName,
          fileType: file.fileName.split('.').pop(),
          bucketName: file.bucketName,
          path: file.path
        })
      })

      const data = await response.json()

      setUploadedFiles(prev => {
        const next = prev.map(p => ({ ...p }))
        const idx = next.findIndex(f => f.path === file.path)
        if (idx >= 0) {
          if (response.ok) {
            next[idx].summary = data.summary
            next[idx].summarySource = data.source || null
            next[idx].summaryModel = data.model || null
          } else {
            next[idx].summary = `❌ Summary generation failed: ${data.error}`
          }
          next[idx].summaryLoading = false
        }
        return next
      })
    } catch (error) {
      setUploadedFiles(prev => {
        const next = prev.map(p => ({ ...p }))
        const idx = next.findIndex(f => f.path === file.path)
        if (idx >= 0) {
          next[idx].summary = `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          next[idx].summaryLoading = false
        }
        return next
      })
    }
  }

    const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !user) {
      setMessage('Please select a file')
      setMessageType('error')
      return
    }

    setLoading(true)
    setMessage('')
    setMessageType('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      // Determine bucket based on user role
      let bucket = 'default'
      if (user.role === 'user') {
        bucket = `user-${user.id}`
      }
      formData.append('bucket', bucket)
      formData.append('userId', user.id || '')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`✅ Upload successful: ${data.fileName}`)
        setMessageType('success')
        setUploadedFiles([
          {
            fileName: data.fileName,
            path: data.path,
            publicUrl: data.publicUrl,
            uploadedAt: new Date().toLocaleString('en-US'),
            userId: user.id,
            bucketName: bucket
          },
          ...uploadedFiles
        ])
        setFile(null)
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        setMessage(`❌ Upload failed: ${data.error}`)
        setMessageType('error')
      }
    } catch (error) {
      setMessage(
        `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

    const handleDelete = async (file: UploadedFile) => {
    if (!confirm('Are you sure you want to delete this file?') || !user) return

    try {
      const response = await fetch('/api/files/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          path: file.path, 
          bucket: file.bucketName || 'default',
          fileId: file.id
        })
      })

      if (response.ok) {
        // Update local state to mark as deleted
        setUploadedFiles(uploadedFiles.map(f => 
          f.path === file.path 
            ? { ...f, isDeleted: true, deletedAt: new Date().toISOString() }
            : f
        ))
        setMessage('✅ File deleted successfully')
        setMessageType('success')
      } else {
        const data = await response.json()
        setMessage(`❌ Delete failed: ${data.error}`)
        setMessageType('error')
      }
    } catch (error) {
      setMessage(
        `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      setMessageType('error')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold mb-2 text-gray-900">
        📁 File Management System
      </h2>
            <p className="text-gray-600 mb-6">
        Secure file storage solution powered by Supabase
        {user && (
          <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
            {user.role.toUpperCase()} MODE
          </span>
        )}
      </p>

      {/* Connection Status */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">Connection Status</p>
            <p className="text-lg font-bold text-blue-600 mt-1">
              {connectionStatus || 'Checking...'}
            </p>
          </div>
          <button
            onClick={testConnection}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Retest Connection
          </button>
        </div>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Upload File</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select file to upload
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm cursor-pointer border border-gray-300 rounded-lg p-3
                         hover:border-gray-400 focus:outline-none focus:border-blue-500"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: <span className="font-semibold">{file.name}</span> (
                {(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 
                       disabled:bg-gray-400 disabled:cursor-not-allowed transition font-semibold"
          >
            {loading ? '⏳ Uploading...' : '📤 Upload File'}
          </button>
        </div>
      </form>

      {/* Messages */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            messageType === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <p className="font-semibold">{message}</p>
        </div>
      )}

      {/* Uploaded Files List */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            📋 Uploaded Files ({uploadedFiles.length})
          </h3>
          <button
            onClick={loadUploadedFiles}
            disabled={loadingFiles}
            className="px-3 py-1 text-sm bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition disabled:opacity-50"
          >
            {loadingFiles ? 'Refreshing...' : 'Refresh List'}
          </button>
        </div>

        {uploadedFiles.length === 0 ? (
          <div className="p-8 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600">No files uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.path}
                className={`p-4 bg-gray-50 rounded-lg border transition ${
                  file.isDeleted
                    ? 'border-red-200 opacity-60'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      📄 {file.fileName}
                      {file.isDeleted && ' [Deleted]'}
                    </p>
                                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
                      <p>File Type: {file.fileType || 'Unknown'}</p>
                      <p>File Size: {file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'Unknown'}</p>
                      <p>Uploaded: {file.createdAt ? new Date(file.createdAt).toLocaleString('en-US') : 'Unknown'}</p>
                      {file.bucketName && (
                        <p>Bucket: {file.bucketName}</p>
                      )}
                      {file.deletedAt && (
                        <p className="text-red-600">Deleted: {new Date(file.deletedAt).toLocaleString('en-US')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {!file.isDeleted && (
                      <>
                        <a
                          href={file.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                        >
                          View
                        </a>
                                                <button
                          onClick={() => handleDelete(file)}
                          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Summary Section */}
                {!file.isDeleted && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => generateSummary(file)}
                      disabled={file.summaryLoading}
                      className="w-full px-3 py-2 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                    >
                      {file.summaryLoading ? '⏳ Generating summary...' : file.summary ? '🔄 Regenerate summary' : '✨ Generate AI Summary'}
                    </button>

                    {file.summary && (
                      <div className="mt-3 p-3 bg-white rounded border border-purple-200">
                        <p className="text-xs font-semibold text-purple-600 mb-2">
                          📝 AI Summary
                          {file.summaryModel && ` (${file.summaryModel})`}
                          {file.summaryGeneratedAt && ` - ${new Date(file.summaryGeneratedAt).toLocaleString('en-US')}`}
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed italic">{file.summary}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
