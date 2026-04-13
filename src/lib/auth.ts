import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types'

export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  return data as UserProfile | null
}

export async function signIn(email: string, password: string) {
  const supabase = createClient()
  const result = await supabase.auth.signInWithPassword({ email, password })

  if (!result.error && result.data.user) {
    const confirmed = result.data.user.email_confirmed_at
    if (!confirmed) {
      await supabase.auth.signOut()
      return {
        data: result.data,
        error: { message: 'EMAIL_NOT_VERIFIED' } as Error,
      }
    }
  }

  return result
}

export async function signUp(email: string, password: string, displayName: string) {
  const supabase = createClient()
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/dashboard`
    : '/dashboard'

  // 1. تسجيل المستخدم في نظام المصادقة
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: { 
        full_name: displayName,
        display_name: displayName 
      },
    },
  })

  if (error) {
    console.error("Signup auth error:", error)
    return { data, error }
  }

  // 2. إضافة المستخدم إلى جدول users إذا تم التسجيل بنجاح
  if (data.user) {
    try {
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          email: email,
          full_name: displayName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (userError) {
        console.error("Error saving to users table:", userError.message)
      } else {
        console.log("User saved to users table successfully")
      }
    } catch (err) {
      console.error("Exception saving user:", err)
    }

    // 3. إضافة الاشتراك (إذا كان الجدول موجوداً)
    try {
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: data.user.id,
          plan_type: 'trial',
          status: 'trialing',
          current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
      
      if (subError) {
        console.warn("Subscriptions table note:", subError.message)
      }
    } catch (err) {
      console.warn("Could not insert subscription:", err)
    }

    // 4. إضافة إعدادات البوت (إذا كان الجدول موجوداً)
    try {
      const { error: botError } = await supabase
        .from('bot_settings')
        .insert({ user_id: data.user.id })
      
      if (botError) {
        console.warn("Bot_settings table note:", botError.message)
      }
    } catch (err) {
      console.warn("Could not insert bot settings:", err)
    }
  }

  return { data, error }
}

export async function resendVerification(email: string) {
  const supabase = createClient()
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/dashboard`
    : '/dashboard'

  return supabase.auth.resend({
    type: 'signup',
    email: email,
    options: { emailRedirectTo: redirectTo },
  })
}

export async function signOut() {
  const supabase = createClient()
  return supabase.auth.signOut()
}

export async function signOutAll() {
  const supabase = createClient()
  return supabase.auth.signOut({ scope: 'global' })
}

export async function resetPassword(email: string) {
  const supabase = createClient()
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/reset-password`
    : '/reset-password'

  return supabase.auth.resetPasswordForEmail(email, { redirectTo })
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient()
  return supabase.auth.updateUser({ password: newPassword })
}

export async function updateProfile(userId: string, updates: Partial<UserProfile>) {
  const supabase = createClient()
  return supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
}
