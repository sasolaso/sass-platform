// src/app/api/facebook/callback/route.ts

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForAccessToken, getLongLivedUserToken, getUserPages } from '@/lib/facebook'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorReason = searchParams.get('error_reason')
  const errorDescription = searchParams.get('error_description')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://glistening-lolly-459fb1.netlify.app'

  if (error) {
    const msg = errorDescription || errorReason || error
    return Response.redirect(
      new URL(`/dashboard/connected-accounts?error=${encodeURIComponent(msg)}`, siteUrl)
    )
  }

  const cookieStore = cookies()
  const savedState = cookieStore.get('fb_oauth_state')?.value
  cookieStore.delete('fb_oauth_state')

  if (!state || state !== savedState) {
    return Response.redirect(
      new URL('/dashboard/connected-accounts?error=Security+check+failed.+Please+try+again.', siteUrl)
    )
  }

  if (!code) {
    return Response.redirect(
      new URL('/dashboard/connected-accounts?error=No+authorization+code+received.', siteUrl)
    )
  }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    console.error('User not authenticated:', userError)
    return Response.redirect(new URL('/login', siteUrl))
  }

  try {
    // Step 1: Exchange code for short-lived token
    let shortToken: string
    try {
      shortToken = await exchangeCodeForAccessToken(code)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to exchange authorization code'
      return Response.redirect(
        new URL(`/dashboard/connected-accounts?error=${encodeURIComponent(msg)}`, siteUrl)
      )
    }

    // Step 2: Upgrade to long-lived user token
    let longToken: string
    let expiresIn: number
    try {
      const result = await getLongLivedUserToken(shortToken)
      longToken = result.access_token
      expiresIn = result.expires_in
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to obtain long-lived token'
      return Response.redirect(
        new URL(`/dashboard/connected-accounts?error=${encodeURIComponent(msg)}`, siteUrl)
      )
    }

    // Step 3: Fetch Facebook pages
    let pages: Awaited<ReturnType<typeof getUserPages>>
    try {
      pages = await getUserPages(longToken)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch Facebook pages'
      return Response.redirect(
        new URL(`/dashboard/connected-accounts?error=${encodeURIComponent(msg)}`, siteUrl)
      )
    }

    if (pages.length === 0) {
      return Response.redirect(
        new URL('/dashboard/connected-accounts?error=No+Facebook+Pages+found', siteUrl)
      )
    }

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
    let savedCount = 0

    for (const page of pages) {
      const avatarUrl = page.picture?.data?.url || ''
      
      const { error: upsertError } = await supabase
        .from('connected_accounts')
        .upsert(
          {
            user_id: user.id,
            platform: 'facebook',
            account_id: page.id,
            page_id: page.id,
            account_name: page.name,
            account_username: page.name,
            avatar_url: avatarUrl,
            access_token: page.access_token,
            token_expires_at: tokenExpiresAt,
            followers_count: page.fan_count || 0,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,platform,account_id' }
        )

      if (!upsertError) {
        savedCount++
      } else {
        console.error('Error saving page:', page.name, upsertError.message)
      }
    }

    if (savedCount === 0) {
      return Response.redirect(
        new URL('/dashboard/connected-accounts?error=Failed+to+save+account+data', siteUrl)
      )
    }

    return Response.redirect(
      new URL(`/dashboard/connected-accounts?success=facebook&count=${savedCount}`, siteUrl)
    )
    
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    console.error('Facebook callback error:', message)
    return Response.redirect(
      new URL(`/dashboard/connected-accounts?error=${encodeURIComponent(message)}`, siteUrl)
    )
  }
}
