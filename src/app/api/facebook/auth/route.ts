// src/app/api/facebook/auth/route.ts

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ✅ الحصول على App ID مباشرة من متغيرات البيئة
  const APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://glistening-lolly-459fb1.netlify.app'

  // ✅ التحقق من وجود App ID
  if (!APP_ID) {
    console.error('❌ NEXT_PUBLIC_FACEBOOK_APP_ID is not defined')
    return NextResponse.redirect(
      new URL('/dashboard/accounts?error=missing_app_id', SITE_URL)
    )
  }

  console.log('✅ App ID found:', APP_ID)
  console.log('✅ Site URL:', SITE_URL)

  // إنشاء state عشوائي للأمان
  const state = randomBytes(16).toString('hex')
  const redirectUri = `${SITE_URL}/api/facebook/callback`

  // الصلاحيات المطلوبة
  const scope = [
    'pages_manage_posts',
    'pages_read_engagement',
    'pages_manage_metadata',
    'pages_messaging',
    'public_profile',
    'pages_show_list'
  ].join(',')

  // ✅ بناء رابط OAuth يدوياً (بدون استخدام buildOAuthUrl)
  const facebookAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
    `client_id=${APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&response_type=code` +
    `&state=${state}`

  console.log('🔗 Redirecting to:', facebookAuthUrl)

  const response = NextResponse.redirect(facebookAuthUrl)

  // حفظ state في cookie للتحقق لاحقاً
  response.cookies.set('fb_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  return response
}
