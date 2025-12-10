import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function middleware(request: NextRequest) {
  // 1. Check if the route is protected (starts with /dashboard)
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
      
      // 2. Check for the HTTPOnly Cookie (refresh_token)
      // Note: We can't validate the token signature here (requires secret), 
      // but checking presence is a fast "First Line of Defense".
      const refreshToken = request.cookies.get('refresh_token')

      if (!refreshToken) {
          // 3. Redirect to Login if missing
          return NextResponse.redirect(new URL('/login', request.url))
      }
  }

  return NextResponse.next()
}
 
// Configure which paths the middleware runs on
export const config = {
  matcher: ['/dashboard/:path*'],
}
