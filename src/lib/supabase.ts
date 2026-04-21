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

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    const client = getBrowserClient()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

export function createServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ✅ إضافة createClient للتوافق مع API Routes
export { createClient }
