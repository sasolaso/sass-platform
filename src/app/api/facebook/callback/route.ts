import { createClient } from '@/lib/supabase/server'
import {
  exchangeCodeForAccessToken,
  getLongLivedToken,
  getUserPages,
} from '@/lib/facebook'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://glistening-lolly-459fb1.netlify.app'

  // ✅ التحقق 1: هل المستخدم مسجل الدخول؟
  if (!user) {
    console.error('❌ No authenticated user found')
    return NextResponse.redirect(new URL('/login', siteUrl))
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  // ✅ التحقق 2: هل هناك خطأ من فيسبوك؟
  if (errorParam) {
    console.error('❌ Facebook OAuth error:', errorParam)
    return NextResponse.redirect(
      new URL('/dashboard/accounts?error=facebook_denied', siteUrl)
    )
  }

  const storedState = request.cookies.get('fb_oauth_state')?.value
  
  // ✅ التحقق 3: هل الـ state متطابق (أمان)
  if (!code || !state || state !== storedState) {
    console.error('❌ State mismatch or missing code')
    return NextResponse.redirect(
      new URL('/dashboard/accounts?error=invalid_state', siteUrl)
    )
  }

  try {
    const redirectUri = `${siteUrl}/api/facebook/callback`
    
    // ✅ الخطوة 1: تبادل الكود للحصول على توكن قصير الأجل
    const shortToken = await exchangeCodeForAccessToken(code, redirectUri)
    console.log('✅ Short-lived token obtained')
    
    // ✅ الخطوة 2: الحصول على توكن طويل الأجل (60 يوم)
    const longToken = await getLongLivedToken(shortToken)
    console.log('✅ Long-lived token obtained')
    
    // ✅ الخطوة 3: جلب قائمة الصفحات التي يديرها المستخدم
    const pages = await getUserPages(longToken)
    console.log(`✅ Found ${pages.length} pages`)

    if (pages.length === 0) {
      console.error('❌ No pages found for this user')
      return NextResponse.redirect(
        new URL('/dashboard/accounts?error=no_pages', siteUrl)
      )
    }

    // ✅ حساب تاريخ انتهاء التوكن (60 يوم من الآن)
    const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
    console.log(`✅ Token expires at: ${tokenExpiresAt}`)

    let savedCount = 0
    let failedCount = 0

    // ✅ الخطوة 4: حفظ كل صفحة في قاعدة البيانات
    for (const page of pages) {
      // ✅ التحقق من وجود access_token للصفحة
      if (!page.access_token) {
        console.error(`❌ Missing access_token for page: ${page.id} (${page.name})`)
        failedCount++
        continue  // تخطي هذه الصفحة واستمر مع الباقي
      }

      // ✅ التحقق من أن التوكن ليس قصيراً جداً (علامة على أنه غير صالح)
      if (page.access_token.length < 50) {
        console.error(`❌ Page access_token seems invalid (too short): ${page.id} - Length: ${page.access_token.length}`)
        failedCount++
        continue
      }

      console.log(`✅ Saving page: ${page.name} (${page.id}) with token length ${page.access_token.length}`)

      // ✅ محاولة حفظ أو تحديث البيانات
      const { error: upsertError } = await supabase
        .from('connected_accounts')
        .upsert(
          {
            user_id: user.id,
            platform: 'facebook',
            account_id: page.id,
            page_id: page.id,
            account_name: page.name,
            account_username: page.username || page.name,  // ✅ استخدام username إذا وجد، وإلا استخدم name
            avatar_url: page.picture?.data?.url || '',
            access_token: page.access_token,
            token_expires_at: tokenExpiresAt,
            is_active: true,
            followers_count: page.fan_count || 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,account_id' }
        )

      if (upsertError) {
        console.error(`❌ Error saving page ${page.id}:`, upsertError)
        failedCount++
      } else {
        console.log(`✅ Successfully saved/updated page: ${page.name}`)
        savedCount++
      }
    }

    // ✅ الخطوة 5: التحقق من النتائج النهائية
    console.log(`📊 Summary: ${savedCount} pages saved, ${failedCount} pages failed`)

    if (savedCount === 0) {
      console.error('❌ No pages were saved successfully')
      return NextResponse.redirect(
        new URL('/dashboard/accounts?error=save_failed', siteUrl)
      )
    }

    // ✅ نجاح: حذف الـ state cookie والتوجيه إلى صفحة النجاح
    const response = NextResponse.redirect(
      new URL('/dashboard/accounts?success=facebook_connected', siteUrl)
    )
    response.cookies.delete('fb_oauth_state')
    return response
    
  } catch (err) {
    console.error('❌ Facebook callback fatal error:', err)
    return NextResponse.redirect(
      new URL('/dashboard/accounts?error=oauth_failed', siteUrl)
    )
  }
}
