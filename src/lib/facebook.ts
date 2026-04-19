// src/lib/facebook.ts

const GRAPH_API = 'https://graph.facebook.com/v19.0'

export interface FacebookPage {
  id: string
  name: string
  access_token: string
  picture?: { data: { url: string } }
  fan_count?: number
}

export async function exchangeCodeForAccessToken(code: string): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://glistening-lolly-459fb1.netlify.app'
  
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!,  // ✅ تغيير هنا
    client_secret: process.env.FACEBOOK_APP_SECRET!,
    redirect_uri: `${siteUrl}/api/facebook/callback`,
    code,
  })
  
  const res = await fetch(`${GRAPH_API}/oauth/access_token?${params}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.access_token
}

export async function getLongLivedUserToken(shortLivedToken: string): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!,  // ✅ تغيير هنا
    client_secret: process.env.FACEBOOK_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  })
  
  const res = await fetch(`${GRAPH_API}/oauth/access_token?${params}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  
  const SIXTY_DAYS_SECONDS = 60 * 24 * 60 * 60
  const expiresIn = typeof data.expires_in === 'number' && data.expires_in > 7200
    ? data.expires_in
    : SIXTY_DAYS_SECONDS
    
  return { access_token: data.access_token, expires_in: expiresIn }
}

export async function getUserPages(userAccessToken: string): Promise<FacebookPage[]> {
  const params = new URLSearchParams({
    fields: 'id,name,access_token,picture,fan_count',
    access_token: userAccessToken,
  })
  
  const res = await fetch(`${GRAPH_API}/me/accounts?${params}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.data || []
}
