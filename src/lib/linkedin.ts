const LINKEDIN_API = 'https://api.linkedin.com/v2'

export interface LinkedInProfile {
  id: string
  localizedFirstName: string
  localizedLastName: string
  profilePicture?: {
    'displayImage~': {
      elements: Array<{
        identifiers: Array<{ identifier: string }>
      }>
    }
  }
}

export function buildLinkedInAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/linkedin/callback`,
    state,
    scope: 'r_liteprofile r_emailaddress w_member_social w_organization_social',
  })
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`
}

export async function exchangeLinkedInCode(code: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/linkedin/callback`,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error_description || data.error)
  return data
}

export async function getLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const res = await fetch(
    `${LINKEDIN_API}/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await res.json()
  if (data.status === 401 || data.serviceErrorCode) throw new Error(data.message || 'Failed to get LinkedIn profile')
  return data
}

export async function getLinkedInEmail(accessToken: string): Promise<string> {
  const res = await fetch(
    `${LINKEDIN_API}/emailAddress?q=members&projection=(elements*(handle~))`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await res.json()
  return data.elements?.[0]?.['handle~']?.emailAddress || ''
}

function getLinkedInAvatarUrl(profile: LinkedInProfile): string {
  const elements = profile.profilePicture?.['displayImage~']?.elements
  if (!elements?.length) return ''
  const last = elements[elements.length - 1]
  return last?.identifiers?.[0]?.identifier || ''
}

export async function getLinkedInAccounts(accessToken: string): Promise<Array<{
  id: string
  name: string
  email: string
  avatar_url: string
}>> {
  const profile = await getLinkedInProfile(accessToken)
  const email = await getLinkedInEmail(accessToken)
  const name = `${profile.localizedFirstName} ${profile.localizedLastName}`

  return [{
    id: profile.id,
    name,
    email,
    avatar_url: getLinkedInAvatarUrl(profile),
  }]
}

export async function publishLinkedInPost(
  authorId: string,
  content: string,
  mediaUrl: string | null,
  mediaType: 'none' | 'image' | 'video',
  accessToken: string
): Promise<{ id: string }> {
  const postBody: Record<string, unknown> = {
    author: `urn:li:person:${authorId}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: content },
        shareMediaCategory: mediaType === 'none' ? 'NONE' : mediaType === 'image' ? 'IMAGE' : 'VIDEO',
        media: mediaUrl ? [{
          status: 'READY',
          originalUrl: mediaUrl,
        }] : [],
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  }

  const res = await fetch(`${LINKEDIN_API}/ugcPosts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postBody),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || `LinkedIn API error: ${res.status}`)
  }

  const postId = res.headers.get('x-restli-id') || ''
  return { id: postId }
}
