'use client'

import { useEffect, useState } from 'react'

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
}

export default function UploadComponent() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')
  const [connectionStatus, setConnectionStatus] = useState<string>('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)

  // Test connection on mount
  useEffect(() => {
    testConnection()
    loadUploadedFiles()
  }, [])

  const testConnection = async () => {
    try {
      setConnectionStatus('🔄 测试连接中...')
      const response = await fetch('/api/supabase/connect')
      const data = await response.json()
      
      if (data.status === 'success') {
        setConnectionStatus(
          `✅ Supabase 已连接 | ${data.bucketsCount} 个存储桶`
        )
      } else {
        setConnectionStatus(`❌ 连接失败: ${data.message}`)
      }
    } catch (error) {
      setConnectionStatus(
        `❌ 错误: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  const loadUploadedFiles = async () => {
    setLoadingFiles(true)
    try {
      const response = await fetch('/api/files/list')
      if (response.ok) {
        const data = await response.json()
        setUploadedFiles(data.files || [])
      }
    } catch (error) {
      console.error('Failed to load files:', error)
    } finally {
      setLoadingFiles(false)
    }
  }

  const generateSummary = async (file: UploadedFile, index: number) => {
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
          fileType: file.fileName.split('.').pop()
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
            next[idx].summary = `❌ 摘要生成失败: ${data.error}`
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
          next[idx].summary = `❌ 错误: ${error instanceof Error ? error.message : '未知错误'}`
          next[idx].summaryLoading = false
        }
        return next
      })
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setMessage('请选择一个文件')
      setMessageType('error')
      return
    }

    setLoading(true)
    setMessage('')
    setMessageType('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'default')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`✅ 上传成功: ${data.fileName}`)
        setMessageType('success')
        setUploadedFiles([
          {
            fileName: data.fileName,
            path: data.path,
            publicUrl: data.publicUrl,
            uploadedAt: new Date().toLocaleString('zh-CN')
          },
          ...uploadedFiles
        ])
        setFile(null)
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        setMessage(`❌ 上传失败: ${data.error}`)
        setMessageType('error')
      }
    } catch (error) {
      setMessage(
        `❌ 错误: ${error instanceof Error ? error.message : '未知错误'}`
      )
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (path: string) => {
    if (!confirm('确定要删除这个文件吗?')) return

    try {
      const response = await fetch('/api/files/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, bucket: 'default' })
      })

      if (response.ok) {
        // Update local state to mark as deleted
        setUploadedFiles(uploadedFiles.map(f => 
          f.path === path 
            ? { ...f, isDeleted: true, deletedAt: new Date().toISOString() }
            : f
        ))
        setMessage('✅ 文件已删除')
        setMessageType('success')
      } else {
        const data = await response.json()
        setMessage(`❌ 删除失败: ${data.error}`)
        setMessageType('error')
      }
    } catch (error) {
      setMessage(
        `❌ 错误: ${error instanceof Error ? error.message : '未知错误'}`
      )
      setMessageType('error')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold mb-2 text-gray-900">
        📁 文件管理系统
      </h2>
      <p className="text-gray-600 mb-6">
        由 Supabase 提供支持的安全文件存储解决方案
      </p>

      {/* Connection Status */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">连接状态</p>
            <p className="text-lg font-bold text-blue-600 mt-1">
              {connectionStatus || '检查中...'}
            </p>
          </div>
          <button
            onClick={testConnection}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            重新测试
          </button>
        </div>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">上传文件</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择要上传的文件
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm cursor-pointer border border-gray-300 rounded-lg p-3
                         hover:border-gray-400 focus:outline-none focus:border-blue-500"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                选中: <span className="font-semibold">{file.name}</span> (
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
            {loading ? '⏳ 上传中...' : '📤 上传文件'}
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
            📋 已上传的文件 ({uploadedFiles.length})
          </h3>
          <button
            onClick={loadUploadedFiles}
            disabled={loadingFiles}
            className="px-3 py-1 text-sm bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition disabled:opacity-50"
          >
            {loadingFiles ? '刷新中...' : '刷新列表'}
          </button>
        </div>

        {uploadedFiles.length === 0 ? (
          <div className="p-8 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600">还没有上传任何文件</p>
          </div>
        ) : (
          <div className="space-y-3">
            {uploadedFiles.map((file, idx) => (
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
                      {file.isDeleted && ' [已删除]'}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
                      <p>文件类型: {file.fileType || '未知'}</p>
                      <p>文件大小: {file.size ? `${(file.size / 1024).toFixed(2)} KB` : '未知'}</p>
                      <p>上传时间: {file.createdAt ? new Date(file.createdAt).toLocaleString('zh-CN') : '未知'}</p>
                      {file.deletedAt && (
                        <p className="text-red-600">删除时间: {new Date(file.deletedAt).toLocaleString('zh-CN')}</p>
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
                          查看
                        </a>
                        <button
                          onClick={() => handleDelete(file.path)}
                          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
                        >
                          删除
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Summary Section */}
                {!file.isDeleted && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => generateSummary(file, idx)}
                      disabled={file.summaryLoading}
                      className="w-full px-3 py-2 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                    >
                      {file.summaryLoading ? '⏳ 生成摘要中...' : file.summary ? '🔄 重新生成摘要' : '✨ 生成 AI 摘要'}
                    </button>

                    {file.summary && (
                      <div className="mt-3 p-3 bg-white rounded border border-purple-200">
                        <p className="text-xs font-semibold text-purple-600 mb-2">
                          📝 AI 摘要
                          {file.summaryModel && ` (${file.summaryModel})`}
                          {file.summaryGeneratedAt && ` - ${new Date(file.summaryGeneratedAt).toLocaleString('zh-CN')}`}
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
