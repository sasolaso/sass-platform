import { createClient } from '@/lib/supabase/server'
import { buildOAuthUrl } from '@/lib/facebook'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const state = randomBytes(16).toString('hex')

  const response = NextResponse.redirect(
    buildOAuthUrl(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/facebook/callback`,
      state
    )
  )

  response.cookies.set('fb_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  return response
}
