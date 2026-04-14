// src/app/api/auth/callback/route.ts

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // التحقق من وجود الكود
  if (!code) {
    console.error('No code provided in callback')
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // تبادل الكود للحصول على الجلسة
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError || !data.user) {
      console.error('Error exchanging code for session:', exchangeError)
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
    }

    const user = data.user
    
    // التحقق من وجود المستخدم في جدول users
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error checking existing user:', fetchError)
    }

    // إذا لم يكن المستخدم موجوداً، قم بإنشائه
    if (!existingUser) {
      // استخراج البيانات من user_metadata (من Google)
      const displayName = user.user_metadata?.full_name || 
                         user.user_metadata?.display_name ||
                         user.user_metadata?.name || 
                         user.email?.split('@')[0] || 
                         'User'
      
      const avatarUrl = user.user_metadata?.avatar_url || 
                        user.user_metadata?.picture || 
                        null

      // 1. حفظ في جدول users
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          display_name: displayName,  // استخدام display_name
          avatar_url: avatarUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (userError) {
        console.error('Error saving user to users table:', userError)
      } else {
        console.log('User saved to users table:', user.id)
      }

      // 2. حفظ في جدول subscriptions (اشتراك تجريبي)
      try {
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user.id,
            plan_type: 'trial',
            status: 'trialing',
            current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          })
        
        if (subError) {
          console.warn('Subscriptions table error:', subError.message)
        } else {
          console.log('Subscription created for user:', user.id)
        }
      } catch (subError) {
        console.warn('Could not create subscription:', subError)
      }

      // 3. حفظ في جدول bot_settings
      try {
        const { error: botError } = await supabase
          .from('bot_settings')
          .insert({ user_id: user.id })
        
        if (botError) {
          console.warn('Bot_settings table error:', botError.message)
        } else {
          console.log('Bot settings created for user:', user.id)
        }
      } catch (botError) {
        console.warn('Could not create bot settings:', botError)
      }
    } else {
      // تحديث آخر دخول للمستخدم الموجود
      await supabase
        .from('users')
        .update({ 
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        })
        .eq('id', user.id)
        .then(() => {})
    }

    // معالجة إعادة التوجيه (دعم البيئات المختلفة)
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'
    
    // الكشف عن بيئة Bolt.new
    const userAgent = request.headers.get('user-agent') || ''
    const isBoltNew = userAgent.includes('StackBlitz') || 
                      userAgent.includes('WebContainer') ||
                      request.headers.get('origin')?.includes('bolt.new')

    let redirectUrl: string

    if (isBoltNew) {
      // في Bolt.new، نستخدم origin مباشرة
      redirectUrl = `${origin}${next}`
    } else if (isLocalEnv) {
      redirectUrl = `${origin}${next}`
    } else if (forwardedHost) {
      redirectUrl = `https://${forwardedHost}${next}`
    } else {
      redirectUrl = `${origin}${next}`
    }

    console.log('Redirecting to:', redirectUrl)
    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('Unexpected error in auth callback:', error)
    return NextResponse.redirect(`${origin}/login?error=unexpected_error`)
  }
}
