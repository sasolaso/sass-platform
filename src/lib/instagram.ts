const GRAPH_API = 'https://graph.facebook.com/v19.0'

export interface InstagramAccount {
  id: string
  name: string
  username: string
  profile_picture_url: string
  followers_count: number
  access_token: string
}

export function buildInstagramAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/instagram/callback`,
    scope: [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_comments',
      'instagram_manage_messages',
      'pages_read_engagement',
      'pages_manage_metadata',
      'pages_show_list',
    ].join(','),
    response_type: 'code',
    state,
  })
  return `https://www.facebook.com/v19.0/dialog/oauth?${params}`
}

export async function exchangeInstagramCode(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET!,
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/instagram/callback`,
    code,
  })
  const res = await fetch(`${GRAPH_API}/oauth/access_token?${params}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.access_token
}

export async function getLongLivedInstagramToken(shortToken: string): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET!,
    fb_exchange_token: shortToken,
  })
  const res = await fetch(`${GRAPH_API}/oauth/access_token?${params}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data
}

export async function getInstagramAccounts(userAccessToken: string): Promise<InstagramAccount[]> {
  const pagesRes = await fetch(
    `${GRAPH_API}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`
  )
  const pagesData = await pagesRes.json()
  if (pagesData.error) throw new Error(pagesData.error.message)

  const accounts: InstagramAccount[] = []

  for (const page of pagesData.data || []) {
    if (!page.instagram_business_account) continue

    const igId = page.instagram_business_account.id
    const igRes = await fetch(
      `${GRAPH_API}/${igId}?fields=id,name,username,profile_picture_url,followers_count&access_token=${page.access_token}`
    )
    const igData = await igRes.json()
    if (igData.error) continue

    accounts.push({
      id: igData.id,
      name: igData.name || igData.username,
      username: igData.username,
      profile_picture_url: igData.profile_picture_url || '',
      followers_count: igData.followers_count || 0,
      access_token: page.access_token,
    })
  }

  return accounts
}

export async function publishInstagramPost(
  igAccountId: string,
  content: string,
  mediaUrl: string | null,
  mediaType: 'none' | 'image' | 'video',
  accessToken: string
): Promise<{ id: string }> {
  if (mediaType === 'image' && mediaUrl) {
    const containerRes = await fetch(`${GRAPH_API}/${igAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: mediaUrl, caption: content, access_token: accessToken }),
    })
    const container = await containerRes.json()
    if (container.error) throw new Error(container.error.message)

    const publishRes = await fetch(`${GRAPH_API}/${igAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
    })
    const publishData = await publishRes.json()
    if (publishData.error) throw new Error(publishData.error.message)
    return publishData
  } else if (mediaType === 'video' && mediaUrl) {
    const containerRes = await fetch(`${GRAPH_API}/${igAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: mediaUrl, caption: content, media_type: 'REELS', access_token: accessToken }),
    })
    const container = await containerRes.json()
    if (container.error) throw new Error(container.error.message)

    await new Promise(r => setTimeout(r, 5000))

    const publishRes = await fetch(`${GRAPH_API}/${igAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
    })
    const publishData = await publishRes.json()
    if (publishData.error) throw new Error(publishData.error.message)
    return publishData
  } else {
    throw new Error('Instagram requires media (image or video) to publish a post')
  }
}
