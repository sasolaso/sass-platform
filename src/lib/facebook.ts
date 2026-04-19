const GRAPH_API = 'https://graph.facebook.com/v19.0'

export interface FacebookPage {
  id: string
  name: string
  access_token: string
  picture?: { data: { url: string } }
  fan_count?: number
}

export async function exchangeCodeForAccessToken(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!,
    client_secret: process.env.FACEBOOK_APP_SECRET!,
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/facebook/callback`,
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
    client_id: process.env.FACEBOOK_APP_ID!,
    client_secret: process.env.FACEBOOK_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  })
  const res = await fetch(`${GRAPH_API}/oauth/access_token?${params}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  // expires_in from Facebook is in seconds. Long-lived tokens last ~60 days (~5,184,000 s).
  // If the value is missing or suspiciously small (e.g. 2 hours = 7200), use 60 days.
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

export async function publishFacebookPost(
  pageId: string,
  content: string,
  mediaUrl: string | null,
  mediaType: 'none' | 'image' | 'video',
  accessToken: string,
  additionalImageUrls?: string[]
): Promise<{ id: string }> {
  // Multi-image carousel: upload each image as unpublished, then post them together
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

// Upload each image as an unpublished photo attachment, then publish all together as a multi-photo post
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

export async function sendFacebookReply(
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
