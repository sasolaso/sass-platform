// src/middleware.ts

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // ✅ استخدام الطريقة المتوافقة مع Netlify (get/set/remove بدلاً من getAll/setAll)
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        },
        remove(name: string, options: any) {
          request.cookies.set(name, '')
          response.cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    return response
  }

  const pathname = request.nextUrl.pathname

  const isAuthPage = pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/verify-email') ||
    pathname.startsWith('/resend-verification') ||
    pathname.startsWith('/api/auth/callback')

  const isDashboard = pathname.startsWith('/dashboard')
  const isApiRoute = pathname.startsWith('/api')

  // ✅ السماح لمسارات API بالمرور دون إعادة توجيه
  if (isApiRoute) {
    return response
  }

  if (isDashboard && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isDashboard && user && !user.email_confirmed_at) {
    const email = user.email ?? ''
    return NextResponse.redirect(
      new URL(`/verify-email?email=${encodeURIComponent(email)}`, request.url)
    )
  }

  if (isAuthPage && user && user.email_confirmed_at &&
    !pathname.startsWith('/reset-password')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
