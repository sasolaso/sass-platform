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

  if (!user) {
    return NextResponse.redirect(
      new URL('/login', process.env.NEXT_PUBLIC_SITE_URL!)
    )
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  if (errorParam) {
    return NextResponse.redirect(
      new URL('/dashboard/accounts?error=facebook_denied', process.env.NEXT_PUBLIC_SITE_URL!)
    )
  }

  const storedState = request.cookies.get('fb_oauth_state')?.value
  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(
      new URL('/dashboard/accounts?error=invalid_state', process.env.NEXT_PUBLIC_SITE_URL!)
    )
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/facebook/callback`
    const shortToken = await exchangeCodeForAccessToken(code, redirectUri)
    const longToken = await getLongLivedToken(shortToken)
    const pages = await getUserPages(longToken)

    if (pages.length === 0) {
      return NextResponse.redirect(
        new URL('/dashboard/accounts?error=no_pages', process.env.NEXT_PUBLIC_SITE_URL!)
      )
    }

    const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

    for (const page of pages) {
      await supabase
        .from('connected_accounts')
        .upsert(
          {
            user_id: user.id,
            platform: 'facebook',
            account_id: page.id,
            page_id: page.id,
            account_name: page.name,
            account_username: page.name,
            avatar_url: page.picture?.data?.url || '',
            access_token: page.access_token,
            token_expires_at: tokenExpiresAt,
            is_active: true,
            followers_count: page.fan_count || 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,account_id' }
        )
    }

    const response = NextResponse.redirect(
      new URL('/dashboard/accounts?success=facebook_connected', process.env.NEXT_PUBLIC_SITE_URL!)
    )
    response.cookies.delete('fb_oauth_state')
    return response
  } catch (err) {
    console.error('Facebook callback error:', err)
    return NextResponse.redirect(
      new URL('/dashboard/accounts?error=oauth_failed', process.env.NEXT_PUBLIC_SITE_URL!)
    )
  }
}
