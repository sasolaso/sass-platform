// src/app/api/facebook/auth/route.ts

import { createClient } from '@/lib/supabase/server'
import { buildOAuthUrl } from '@/lib/facebook'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // الحصول على رابط الموقع من متغيرات البيئة
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  
  if (!siteUrl) {
    console.error('NEXT_PUBLIC_SITE_URL is not defined')
    return NextResponse.redirect(
      new URL('/dashboard/accounts?error=missing_config', process.env.NEXT_PUBLIC_APP_URL || 'https://glistening-lolly-459fb1.netlify.app')
    )
  }

  const state = randomBytes(16).toString('hex')
  const redirectUri = `${siteUrl}/api/facebook/callback`

  try {
    const oauthUrl = buildOAuthUrl(redirectUri, state)

    const response = NextResponse.redirect(oauthUrl)

    response.cookies.set('fb_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Facebook auth error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/accounts?error=oauth_init_failed', siteUrl)
    )
  }
}
