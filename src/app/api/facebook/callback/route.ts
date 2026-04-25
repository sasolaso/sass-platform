// src/app/api/facebook/callback/route.ts

import { createClient } from '@/lib/supabase/server'
import {
  exchangeCodeForAccessToken,
  getLongLivedToken,
  getUserPages,
} from '@/lib/facebook'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // ✅ إضافة await هنا
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                    process.env.NEXT_PUBLIC_APP_URL || 
                    'https://glistening-lolly-459fb1.netlify.app'

    // التحقق من وجود المستخدم
    if (userError || !user) {
      console.error('User not authenticated:', userError)
      return NextResponse.redirect(new URL('/login', siteUrl))
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const errorParam = searchParams.get('error')
    const errorReason = searchParams.get('error_reason')
    const errorDescription = searchParams.get('error_description')

    // معالجة أخطاء فيسبوك
    if (errorParam) {
      const msg = errorDescription || errorReason || errorParam
      console.error('Facebook OAuth error:', msg)
      return NextResponse.redirect(
        new URL('/dashboard/accounts?error=facebook_denied', siteUrl)
      )
    }

    // التحقق من وجود الكود
    if (!code) {
      console.error('No code provided in callback')
      return NextResponse.redirect(
        new URL('/dashboard/accounts?error=missing_code', siteUrl)
      )
    }

    // التحقق من حالة الأمان (state)
    const cookieStore = await cookies()
    const storedState = cookieStore.get('fb_oauth_state')?.value
    cookieStore.delete('fb_oauth_state')

    if (!state || state !== storedState) {
      console.error('State mismatch:', { state, storedState })
      return NextResponse.redirect(
        new URL('/dashboard/accounts?error=invalid_state', siteUrl)
      )
    }

    try {
      const redirectUri = `${siteUrl}/api/facebook/callback`
      
      // 1. تبادل الكود للحصول على token قصير الأجل
      console.log('🔄 Exchanging code for short-lived token...')
      const shortToken = await exchangeCodeForAccessToken(code, redirectUri)
      console.log('✅ Short-lived token obtained')
      
      // 2. الحصول على token طويل الأجل
      console.log('🔄 Exchanging for long-lived token...')
      const longToken = await getLongLivedToken(shortToken)
      console.log('✅ Long-lived token obtained')
      
      // 3. جلب صفحات المستخدم
      console.log('🔄 Fetching user pages...')
      const pages = await getUserPages(longToken)
      console.log(`✅ Found ${pages.length} pages`)

      if (pages.length === 0) {
        console.warn('No Facebook Pages found for this user')
        return NextResponse.redirect(
          new URL('/dashboard/accounts?error=no_pages', siteUrl)
        )
      }

      const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
      let savedCount = 0

      // 4. حفظ كل صفحة في قاعدة البيانات
      for (const page of pages) {
        console.log(`💾 Saving page: ${page.name} (${page.id})`)
        
        const { error: upsertError, data: savedData } = await supabase
          .from('connected_accounts')
          .upsert(
            {
              user_id: user.id,
              platform: 'facebook',
              account_id: page.id,
              page_id: page.id,
              account_name: page.name,
              account_username: page.name,
              avatar_url: page.picture?.data?.url || `https://graph.facebook.com/${page.id}/picture?type=square`,
              access_token: page.access_token || longToken,
              token_expires_at: tokenExpiresAt,
              is_active: true,
              followers_count: page.fan_count || 0,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,platform,account_id' }
          )
          .select()

        if (upsertError) {
          console.error(`❌ Error saving page ${page.name}:`, upsertError.message)
        } else {
          console.log(`✅ Page ${page.name} saved successfully`)
          savedCount++
        }
      }

      console.log(`📊 Summary: ${savedCount}/${pages.length} pages saved`)

      const response = NextResponse.redirect(
        new URL(`/dashboard/accounts?success=facebook_connected&count=${savedCount}`, siteUrl)
      )
      response.cookies.delete('fb_oauth_state')
      return response
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Facebook API error'
      console.error('❌ Facebook API error:', message)
      return NextResponse.redirect(
        new URL(`/dashboard/accounts?error=${encodeURIComponent(message)}`, siteUrl)
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    console.error('❌ Unexpected error:', message)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                    process.env.NEXT_PUBLIC_APP_URL || 
                    'https://glistening-lolly-459fb1.netlify.app'
    return NextResponse.redirect(
      new URL(`/dashboard/accounts?error=${encodeURIComponent(message)}`, siteUrl)
    )
  }
}
