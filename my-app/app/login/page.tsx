'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type LoginMode = 'user' | 'guest' | 'admin'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<LoginMode>('user')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'guest') {
        // Guest login - no credentials needed
        const guestUser = {
          id: 'a14ef943-e5d3-4a17-b4cb-293181ec1d7e',
          username: 'guest',
          email: 'guest@example.com',
          role: 'guest',
          displayName: 'Guest User'
        }
        // Set cookies
        document.cookie = `user=${encodeURIComponent(JSON.stringify(guestUser))}; path=/; max-age=${24 * 60 * 60}`
        document.cookie = 'isLoggedIn=true; path=/; max-age=${24 * 60 * 60}'
        // Force a refresh to ensure auth state is updated
        router.refresh()
        setTimeout(() => {
          router.push('/')
        }, 100)
        return
      }

      // For user/admin login
      if (!email || !password) {
        throw new Error('Please enter email and password')
      }

      // Mock authentication - in real app, this would call an API
      if (mode === 'admin' && email === 'admin@example.com' && password === 'admin123') {
        const adminUser = {
          id: 'admin-id',
          username: 'admin',
          email: 'admin@example.com',
          role: 'admin',
          displayName: 'Administrator'
        }
        // Set cookies
        document.cookie = `user=${encodeURIComponent(JSON.stringify(adminUser))}; path=/; max-age=${24 * 60 * 60}`
        document.cookie = 'isLoggedIn=true; path=/; max-age=${24 * 60 * 60}'
        // Force a refresh to ensure auth state is updated
        router.refresh()
        setTimeout(() => {
          router.push('/')
        }, 100)
      } else if (mode === 'user') {
        // User login/registration
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email, 
            password,
            username: isRegistering ? username : undefined,
            isRegistering 
          })
        })

        const data = await response.json()

        if (response.ok) {
          // Set cookies
          document.cookie = `user=${encodeURIComponent(JSON.stringify(data.user))}; path=/; max-age=${24 * 60 * 60}`
          document.cookie = `token=${data.token}; path=/; max-age=${24 * 60 * 60}`
          document.cookie = 'isLoggedIn=true; path=/; max-age=${24 * 60 * 60}'
          
          // Log the login action
          await fetch('/api/auth/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              actionType: 'login',
              details: { mode }
            })
          })
          
          // Force a refresh to ensure auth state is updated
          router.refresh()
          setTimeout(() => {
            router.push('/')
          }, 100)
        } else {
          throw new Error(data.error || 'Login failed')
        }
      } else {
        throw new Error('Invalid credentials')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            AI Summary App
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Secure document management and AI summarization
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
          {/* Mode Selector */}
          <div className="mb-6">
            <div className="flex space-x-4 mb-4">
              <button
                type="button"
                onClick={() => {
                  setMode('user')
                  setIsRegistering(false)
                  setError('')
                }}
                className={`flex-1 py-2 px-4 rounded-md font-medium ${
                  mode === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                User
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('guest')
                  setError('')
                }}
                className={`flex-1 py-2 px-4 rounded-md font-medium ${
                  mode === 'guest'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Guest
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('admin')
                  setIsRegistering(false)
                  setError('')
                }}
                className={`flex-1 py-2 px-4 rounded-md font-medium ${
                  mode === 'admin'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Admin
              </button>
            </div>

            <div className="text-sm text-gray-600 text-center">
              {mode === 'user' && 'Login or register as a regular user'}
              {mode === 'guest' && 'Continue as guest (no account needed)'}
              {mode === 'admin' && 'Administrator access'}
            </div>
          </div>

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleLogin}>
            {mode === 'user' && (
              <>
                {isRegistering && (
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                      Username
                    </label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required={isRegistering}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="Choose a username"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your password"
                  />
                </div>

                {mode === 'user' && (
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setIsRegistering(!isRegistering)}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
                    </button>
                  </div>
                )}
              </>
            )}

            {mode === 'admin' && (
              <>
                <div>
                  <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700">
                    Admin Email
                  </label>
                  <input
                    id="admin-email"
                    name="admin-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="admin@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700">
                    Admin Password
                  </label>
                  <input
                    id="admin-password"
                    name="admin-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Enter admin password"
                  />
                </div>

                <div className="text-sm text-gray-500">
                  <p>Default admin credentials:</p>
                  <p>Email: admin@example.com</p>
                  <p>Password: admin123</p>
                </div>
              </>
            )}

            {mode === 'guest' && (
              <div className="text-center py-4">
                <div className="mb-4">
                  <div className="text-5xl mb-2">👤</div>
                  <h3 className="text-lg font-medium text-gray-900">Continue as Guest</h3>
                  <p className="text-gray-600 mt-1">
                    You can upload files and use AI summarization without creating an account.
                  </p>
                  <p className="text-gray-600 mt-1 text-sm">
                    Your files will be stored in the public bucket.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                  mode === 'guest' ? 'bg-green-600 hover:bg-green-700' :
                  mode === 'admin' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
              >
                {loading ? (
                  <span>Processing...</span>
                ) : mode === 'guest' ? (
                  'Continue as Guest'
                ) : isRegistering ? (
                  'Register Account'
                ) : (
                  `Sign in as ${mode.charAt(0).toUpperCase() + mode.slice(1)}`
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  About this app
                </span>
              </div>
            </div>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>
                This is a document management system with AI-powered summarization.
                {mode === 'guest' && ' Guest users can access public files.'}
                {mode === 'user' && ' Registered users have private storage.'}
                {mode === 'admin' && ' Admins have access to all files and user management.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}