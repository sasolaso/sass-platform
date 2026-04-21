// src/lib/social.ts

// ✅ تغيير الاستيرادات لتتناسب مع الأسماء الموجودة فعلاً
export { publishPost as publishFacebookPost, sendReply as sendFacebookReply, getUserPages, exchangeCodeForAccessToken, getLongLivedToken as getLongLivedUserToken } from './facebook'
export { publishInstagramPost, getInstagramAccounts, exchangeInstagramCode, getLongLivedInstagramToken } from './instagram'
export { publishTikTokPost, getTikTokUserInfo, exchangeTikTokCode } from './tiktok'
export { publishLinkedInPost, getLinkedInAccounts, exchangeLinkedInCode } from './linkedin'

import type { ConnectedAccount } from '@/types/database'

export async function publishPost(
  account: ConnectedAccount,
  content: string,
  mediaUrl: string | null,
  mediaType: 'none' | 'image' | 'video',
  additionalImageUrls?: string[]
): Promise<{ id: string }> {
  // ✅ استخدم الأسماء الصحيحة
  const { publishFacebookPost } = await import('./facebook')
  const { publishInstagramPost } = await import('./instagram')
  const { publishTikTokPost } = await import('./tiktok')
  const { publishLinkedInPost } = await import('./linkedin')

  switch (account.platform) {
    case 'facebook':
      return publishFacebookPost(account.page_id || account.account_id, content, mediaUrl, mediaType, account.access_token, additionalImageUrls)

    case 'instagram':
      return publishInstagramPost(account.account_id, content, mediaUrl, mediaType, account.access_token)

    case 'tiktok':
      if (!mediaUrl) throw new Error('TikTok requires a video URL')
      return publishTikTokPost(account.account_id, content, mediaUrl, account.access_token)

    case 'linkedin':
      return publishLinkedInPost(account.account_id, content, mediaUrl, mediaType, account.access_token)

    default:
      throw new Error(`Unsupported platform: ${account.platform}`)
  }
}

export const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  facebook: 63206,
  instagram: 2200,
  tiktok: 150,
  linkedin: 3000,
}

export const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
}

export const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  tiktok: '#000000',
  linkedin: '#0A66C2',
}
