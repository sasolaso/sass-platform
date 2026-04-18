const TIKTOK_API = 'https://open.tiktokapis.com/v2'
const TIKTOK_AUTH = 'https://www.tiktok.com/v2/auth/authorize'

export interface TikTokAccount {
  open_id: string
  display_name: string
  avatar_url: string
  follower_count: number
}

export function buildTikTokAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/tiktok/callback`,
    scope: 'user.info.basic,video.list,video.upload,comment.list,comment.manage',
    response_type: 'code',
    state,
  })
  return `${TIKTOK_AUTH}?${params}`
}

export async function exchangeTikTokCode(code: string): Promise<{
  access_token: string
  expires_in: number
  refresh_token: string
  refresh_expires_in: number
  open_id: string
}> {
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/tiktok/callback`,
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error_description || data.error)
  return data
}

export async function getTikTokUserInfo(accessToken: string): Promise<TikTokAccount> {
  const res = await fetch(`${TIKTOK_API}/user/info/?fields=open_id,display_name,avatar_url,follower_count`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  if (data.error?.code !== 'ok') throw new Error(data.error?.message || 'Failed to get TikTok user info')
  return data.data.user
}

export async function refreshTikTokToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
  refresh_token: string
  refresh_expires_in: number
}> {
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error_description || data.error)
  return data
}

export async function publishTikTokPost(
  openId: string,
  content: string,
  videoUrl: string,
  accessToken: string
): Promise<{ id: string }> {
  const initRes = await fetch(`${TIKTOK_API}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: content.slice(0, 150),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: videoUrl,
      },
    }),
  })
  const initData = await initRes.json()
  if (initData.error?.code !== 'ok') throw new Error(initData.error?.message || 'Failed to initiate TikTok upload')
  return { id: initData.data.publish_id }
}
