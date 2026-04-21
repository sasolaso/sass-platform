// src/lib/facebook.ts

const GRAPH_API = 'https://graph.facebook.com/v25.0'

// ✅ إضافة aliases للأسماء المطلوبة
export async function publishPost(
  pageId: string,
  content: string,
  mediaUrl: string | null,
  mediaType: 'none' | 'image' | 'video',
  accessToken: string,
  additionalImageUrls?: string[]
): Promise<{ id: string }> {
  // Multi-image carousel
  const allImages = [
    ...(mediaUrl && mediaType === 'image' ? [mediaUrl] : []),
    ...(additionalImageUrls || []),
  ]

  if (allImages.length > 1) {
    return publishFacebookCarousel(pageId, content, allImages, accessToken)
  }

  let url: string
  let body: Record<string, string>

  if (mediaType === 'image' && mediaUrl) {
    url = `${GRAPH_API}/${pageId}/photos`
    body = { url: mediaUrl, caption: content, access_token: accessToken }
  } else if (mediaType === 'video' && mediaUrl) {
    url = `${GRAPH_API}/${pageId}/videos`
    body = { file_url: mediaUrl, description: content, access_token: accessToken }
  } else {
    url = `${GRAPH_API}/${pageId}/feed`
    body = { message: content, access_token: accessToken }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data
}

export async function publishFacebookCarousel(
  pageId: string,
  content: string,
  imageUrls: string[],
  accessToken: string
): Promise<{ id: string }> {
  const photoIds: string[] = []

  for (const imgUrl of imageUrls) {
    const res = await fetch(`${GRAPH_API}/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imgUrl, published: false, access_token: accessToken }),
    })
    const data = await res.json()
    if (data.error) throw new Error(`Photo upload failed: ${data.error.message}`)
    photoIds.push(data.id)
  }

  const attachedMedia = photoIds.map(id => ({ media_fbid: id }))
  const feedRes = await fetch(`${GRAPH_API}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: content,
      attached_media: attachedMedia,
      access_token: accessToken,
    }),
  })
  const feedData = await feedRes.json()
  if (feedData.error) throw new Error(feedData.error.message)
  return feedData
}

export async function sendReply(
  pageAccessToken: string,
  recipientId: string,
  messageText: string
): Promise<void> {
  const res = await fetch(`${GRAPH_API}/me/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: messageText },
      access_token: pageAccessToken,
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
}

export async function getLongLivedToken(shortLivedToken: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!,
    client_secret: process.env.FACEBOOK_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  })

  const res = await fetch(`${GRAPH_API}/oauth/access_token?${params}`)
  const json = await res.json()

  if (!res.ok || json.error) {
    throw new Error(json.error?.message || 'Failed to get long-lived token')
  }

  return json.access_token as string
}

// ✅ إعادة تصدير الدوال الموجودة بأسماء متوافقة مع social.ts
export { exchangeCodeForAccessToken, getUserPages } from './facebook'

// ✅ Aliases للتوافق مع social.ts
export const publishFacebookPost = publishPost
export const sendFacebookReply = sendReply
export const getLongLivedUserToken = getLongLivedToken
