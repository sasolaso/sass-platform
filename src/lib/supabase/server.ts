// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // ✅ إضافة دالة getAll (هذه هي المفقودة وتسبب الخطأ)
        getAll() {
          return cookieStore.getAll()
        },
        
        // ✅ إضافة دالة setAll (مطلوبة لكتابة الكوكيز بشكل آمن)
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // ⚠️ في Netlify/Serverless: تعديل الكوكيز بعد بدء الاستجابة قد يفشل
            // نلتقط الخطأ لتجنب انهيار الدالة
            console.warn('Cookie set failed (likely response already sent):', error)
          }
        },

        // ✅ الحفاظ على الدوال القديمة للتوافق
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set(name, value, options)
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )
}
