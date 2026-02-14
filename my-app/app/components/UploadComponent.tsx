'use client'

import { useState } from 'react'

export default function UploadComponent() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<string>('')
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])

  const testConnection = async () => {
    try {
      setConnectionStatus('测试连接中...')
      const response = await fetch('/api/supabase/connect')
      const data = await response.json()
      
      if (data.status === 'success') {
        setConnectionStatus(`✅ 已连接到 Supabase!`)
      } else {
        setConnectionStatus(`❌ 连接失败: ${data.message}`)
      }
    } catch (error) {
      setConnectionStatus(`❌ 错误: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setMessage('请选择一个文件')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'documents')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`✅ 上传成功: ${data.fileName}`)
        setUploadedFiles([...uploadedFiles, data])
        setFile(null)
      } else {
        setMessage(`❌ 上传失败: ${data.error}`)
      }
    } catch (error) {
      setMessage(`❌ 错误: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Supabase 文件管理系统</h2>

      {/* Connection Status */}
      <div className="mb-6">
        <button
          onClick={testConnection}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          测试 Supabase 连接
        </button>
        {connectionStatus && (
          <p className="mt-2 text-sm font-semibold">{connectionStatus}</p>
        )}
      </div>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">选择文件</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm border border-gray-300 rounded p-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          {loading ? '上传中...' : '上传文件'}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-sm font-semibold">{message}</p>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4">已上传的文件</h3>
          <div className="space-y-2">
            {uploadedFiles.map((file, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded border">
                <p className="font-semibold">{file.fileName}</p>
                <p className="text-xs text-gray-600">{file.path}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
