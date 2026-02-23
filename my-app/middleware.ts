import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Check if the user is authenticated
  const isLoggedIn = request.cookies.get('isLoggedIn')?.value === 'true'
  const userCookie = request.cookies.get('user')
  let user = null
  
  try {
    if (userCookie) {
      user = JSON.parse(userCookie.value)
    }
  } catch (error) {
    // Invalid user cookie
  }

  const isLoginPage = request.nextUrl.pathname === '/login'
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
  const isPublicFile = request.nextUrl.pathname.startsWith('/_next/') || 
                      request.nextUrl.pathname.includes('.') || // Static files
                      request.nextUrl.pathname === '/favicon.ico'

  // Allow public files and API routes (API routes handle their own auth)
  if (isPublicFile || isApiRoute) {
    return NextResponse.next()
  }

  // Redirect logic
  if (!isLoggedIn && !isLoginPage) {
    // Not logged in and not on login page -> redirect to login
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (isLoggedIn && isLoginPage) {
    // Already logged in and on login page -> redirect to home
    const homeUrl = new URL('/', request.url)
    return NextResponse.redirect(homeUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}