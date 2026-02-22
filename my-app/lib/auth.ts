'use client'

import { useState, useEffect, createContext, useContext } from 'react'

export interface User {
  id: string | null
  username: string
  email: string
  role: 'user' | 'admin' | 'guest'
  displayName: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (user: User, token?: string) => void
  logout: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored user data on mount
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift()
    }
    
    const userCookie = getCookie('user')
    const isLoggedIn = getCookie('isLoggedIn') === 'true'
    
    if (isLoggedIn && userCookie) {
      try {
        setUser(JSON.parse(decodeURIComponent(userCookie)))
      } catch (error) {
        console.error('Error parsing user cookie:', error)
        // Clear invalid cookies
        document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        document.cookie = 'isLoggedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      }
    }
    
    setIsLoading(false)
  }, [])

  const login = (userData: User, token?: string) => {
    setUser(userData)
    // Set cookies that middleware can read
    document.cookie = `user=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=${24 * 60 * 60}` // 24 hours
    document.cookie = `isLoggedIn=true; path=/; max-age=${24 * 60 * 60}`
    if (token) {
      document.cookie = `token=${token}; path=/; max-age=${24 * 60 * 60}`
    }
  }

  const logout = async () => {
    if (user && user.id && user.role !== 'guest') {
      // Log the logout action
      try {
        await fetch('/api/auth/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            actionType: 'logout'
          })
        })
      } catch (error) {
        console.error('Error logging logout action:', error)
      }
    }

    setUser(null)
    // Clear cookies
    document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = 'isLoggedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    
    // Redirect to login page
    window.location.href = '/login'
  }

  const value = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value as any}>
      {children}
    </AuthContext.Provider>
  )
}

// Helper function to get current user from cookies (for server components)
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null
  
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift()
  }
  
  const userCookie = getCookie('user')
  const isLoggedIn = getCookie('isLoggedIn') === 'true'
  
  if (isLoggedIn && userCookie) {
    try {
      return JSON.parse(decodeURIComponent(userCookie))
    } catch {
      return null
    }
  }
  
  return null
}

// Helper function to get user's bucket name
export function getUserBucketName(user: User | null): string {
  if (!user || user.role === 'guest') {
    return 'default'
  }
  return `user-${user.id}`
}

// Helper function to check if user can access a file
export function canAccessFile(fileUserId: string | null, currentUser: User | null): boolean {
  if (!currentUser) return false
  
  // Admins can access all files
  if (currentUser.role === 'admin') return true
  
  // Guests can only access files in default bucket (fileUserId is null)
  if (currentUser.role === 'guest') {
    return fileUserId === null
  }
  
  // Regular users can access their own files
  return fileUserId === currentUser.id
}