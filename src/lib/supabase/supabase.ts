// src/lib/supabase.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _browserClient: SupabaseClient | null = null

export function getBrowserClient(): SupabaseClient {
  if (!_browserClient) {
    _browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _browserClient
}

// ✅ إضافة دالة للخادم (Server-side)
export function createServerClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ✅ تصدير createClient مباشرة للتوافق مع API Routes
export { createClient }

// ✅ Proxy آمن للاستخدام في المتصفح فقط
export const supabase = typeof window !== 'undefined' 
  ? new Proxy({} as SupabaseClient, {
      get(_target, prop: string | symbol) {
        const client = getBrowserClient()
        const value = (client as unknown as Record<string | symbol, unknown>)[prop]
        if (typeof value === 'function') {
          return value.bind(client)
        }
        return value
      },
    })
  : ({} as SupabaseClient)

export function createServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
