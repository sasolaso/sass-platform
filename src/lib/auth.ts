import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types'

// ========== دوال جلب البيانات ==========

export async function getCurrentUser() {
  const supabase = createClient()
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Error getting current user:', error)
      return null
    }
    return user
  } catch (error) {
    console.error('Unexpected error in getCurrentUser:', error)
    return null
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    
    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
    return data as UserProfile | null
  } catch (error) {
    console.error('Unexpected error in getUserProfile:', error)
    return null
  }
}

// ========== دوال المصادقة ==========

export async function signIn(email: string, password: string) {
  const supabase = createClient()
  
  try {
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
  } catch (error) {
    console.error('Error in signIn:', error)
    return { data: null, error: error as Error }
  }
}

export async function signUp(email: string, password: string, displayName: string) {
  const supabase = createClient()
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/callback`
    : '/api/auth/callback'

  try {
    // 1. تسجيل المستخدم في نظام المصادقة
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          display_name: displayName,
          full_name: displayName,
        },
      },
    })

    if (error) {
      console.error('Signup auth error:', error)
      return { data, error }
    }

    // 2. إذا تم التسجيل بنجاح، حفظ البيانات في الجداول
    if (data.user) {
      // حفظ في جدول users
      try {
        const { error: userError } = await supabase
          .from('users')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            display_name: displayName,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (userError) {
          console.error('Error saving to users table:', userError)
        } else {
          console.log('User saved to users table successfully')
        }
      } catch (userError) {
        console.error('Exception saving to users table:', userError)
      }

      // حفظ في جدول subscriptions
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
          console.warn('Subscriptions table note:', subError.message)
        }
      } catch (subError) {
        console.warn('Could not insert subscription:', subError)
      }

      // حفظ في جدول bot_settings
      try {
        const { error: botError } = await supabase
          .from('bot_settings')
          .insert({ user_id: data.user.id })
        
        if (botError) {
          console.warn('Bot_settings table note:', botError.message)
        }
      } catch (botError) {
        console.warn('Could not insert bot settings:', botError)
      }
    }

    return { data, error }
    
  } catch (error) {
    console.error('Unexpected error in signUp:', error)
    return { data: null, error: error as Error }
  }
}

// ========== تسجيل الدخول بواسطة Google ==========

export async function signInWithGoogle() {
  const supabase = createClient()
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/callback`
    : '/api/auth/callback'

  try {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
  } catch (error) {
    console.error('Error in signInWithGoogle:', error)
    return { data: null, error: error as Error }
  }
}

// نفس الدالة للتسجيل (يمكن استخدامها نفسها)
export const signUpWithGoogle = signInWithGoogle

// ========== دوال إدارة الجلسة ==========

export async function resendVerification(email: string) {
  const supabase = createClient()
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/callback`
    : '/api/auth/callback'

  try {
    return await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: { emailRedirectTo: redirectTo },
    })
  } catch (error) {
    console.error('Error in resendVerification:', error)
    return { data: null, error: error as Error }
  }
}

export async function signOut() {
  const supabase = createClient()
  try {
    return await supabase.auth.signOut()
  } catch (error) {
    console.error('Error in signOut:', error)
    return { error: error as Error }
  }
}

export async function signOutAll() {
  const supabase = createClient()
  try {
    return await supabase.auth.signOut({ scope: 'global' })
  } catch (error) {
    console.error('Error in signOutAll:', error)
    return { error: error as Error }
  }
}

// ========== دوال إدارة كلمة المرور ==========

export async function resetPassword(email: string) {
  const supabase = createClient()
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/reset-password`
    : '/reset-password'

  try {
    return await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  } catch (error) {
    console.error('Error in resetPassword:', error)
    return { data: null, error: error as Error }
  }
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient()
  try {
    return await supabase.auth.updateUser({ password: newPassword })
  } catch (error) {
    console.error('Error in updatePassword:', error)
    return { data: null, error: error as Error }
  }
}

// ========== دوال تحديث الملف الشخصي ==========

export async function updateProfile(userId: string, updates: Partial<UserProfile>) {
  const supabase = createClient()
  try {
    return await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
  } catch (error) {
    console.error('Error in updateProfile:', error)
    return { data: null, error: error as Error }
  }
}

// ========== دالة مساعدة لحفظ مستخدم Google بعد المصادقة ==========

export async function handleGoogleCallback(userId: string, email: string, displayName: string, avatarUrl: string | null) {
  const supabase = createClient()
  
  try {
    // التحقق من وجود المستخدم
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    
    if (!existingUser) {
      // إنشاء مستخدم جديد
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email,
          display_name: displayName,
          avatar_url: avatarUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (insertError) {
        console.error('Error saving Google user:', insertError)
        return { success: false, error: insertError }
      }
      
      // إنشاء اشتراك تجريبي
      await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: 'trial',
          status: 'trialing',
          current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
      
      // إنشاء إعدادات البوت
      await supabase
        .from('bot_settings')
        .insert({ user_id: userId })
      
      console.log('Google user saved successfully')
      return { success: true }
    }
    
    return { success: true }
    
  } catch (error) {
    console.error('Unexpected error in handleGoogleCallback:', error)
    return { success: false, error: error as Error }
  }
}
