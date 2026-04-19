import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { exchangeCodeForAccessToken, getLongLivedUserToken, getUserPages } from '@/lib/facebook'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorReason = searchParams.get('error_reason')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    const msg = errorDescription || errorReason || error
    return Response.redirect(
      new URL(`/connected-accounts?error=${encodeURIComponent(msg)}`, request.url)
    )
  }

  const cookieStore = await cookies()
  const savedState = cookieStore.get('fb_oauth_state')?.value
  cookieStore.delete('fb_oauth_state')

  if (!state || state !== savedState) {
    return Response.redirect(
      new URL('/connected-accounts?error=Security+check+failed.+Please+try+again.', request.url)
    )
  }

  if (!code) {
    return Response.redirect(
      new URL('/connected-accounts?error=No+authorization+code+received.', request.url)
    )
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.redirect(new URL('/login', request.url))
  }

  try {
    // Step 1: Exchange short-lived code for short-lived user token
    let shortToken: string
    try {
      shortToken = await exchangeCodeForAccessToken(code)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to exchange authorization code'
      return Response.redirect(
        new URL(`/connected-accounts?error=${encodeURIComponent(msg)}`, request.url)
      )
    }

    // Step 2: Upgrade to long-lived user token (~60 days)
    let longToken: string
    let expiresIn: number
    try {
      const result = await getLongLivedUserToken(shortToken)
      longToken = result.access_token
      expiresIn = result.expires_in
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to obtain long-lived token'
      return Response.redirect(
        new URL(`/connected-accounts?error=${encodeURIComponent(msg)}`, request.url)
      )
    }

    // Step 3: Fetch connected Facebook pages
    let pages: Awaited<ReturnType<typeof getUserPages>>
    try {
      pages = await getUserPages(longToken)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch Facebook pages'
      return Response.redirect(
        new URL(`/connected-accounts?error=${encodeURIComponent(msg)}`, request.url)
      )
    }

    if (pages.length === 0) {
      return Response.redirect(
        new URL(
          '/connected-accounts?error=No+Facebook+Pages+found.+Make+sure+you+are+an+admin+of+at+least+one+Facebook+Page.',
          request.url
        )
      )
    }

    const serviceClient = createServiceClient()
    // Token expiry: use what the API returned (already validated to be 60 days worth)
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    const saveErrors: string[] = []

    for (const page of pages) {
      const avatarUrl = page.picture?.data?.url || ''

      const { error: upsertError } = await serviceClient
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
            // Page tokens from /me/accounts are permanent (never expire) when the user token is long-lived
            access_token: page.access_token,
            token_expires_at: expiresAt,
            followers_count: page.fan_count || 0,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,platform,account_id' }
        )

      if (upsertError) {
        saveErrors.push(`Page "${page.name}": ${upsertError.message}`)
      }
    }

    if (saveErrors.length > 0 && saveErrors.length === pages.length) {
      // All pages failed to save
      const msg = `Failed to save account data: ${saveErrors[0]}`
      return Response.redirect(
        new URL(`/connected-accounts?error=${encodeURIComponent(msg)}`, request.url)
      )
    }

    // Partial success or full success
    const successCount = pages.length - saveErrors.length
    if (saveErrors.length > 0) {
      return Response.redirect(
        new URL(
          `/connected-accounts?success=facebook&warning=${encodeURIComponent(`${successCount} page(s) connected. ${saveErrors.length} failed to save.`)}`,
          request.url
        )
      )
    }

    return Response.redirect(
      new URL('/connected-accounts?success=facebook', request.url)
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return Response.redirect(
      new URL(`/connected-accounts?error=${encodeURIComponent(message)}`, request.url)
    )
  }
}
