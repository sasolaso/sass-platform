import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'  // ✅ مسار صحيح
import { createServiceClient } from '@/lib/supabase'
import { publishPost } from '@/lib/social'

export async function POST(request: NextRequest) {
  const supabase = createClient()  // ✅ استخدم createClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    connected_account_id: string
    content: string
    media_url?: string
    media_type?: 'none' | 'image' | 'video'
    additional_image_urls?: string[]
  }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { connected_account_id, content, media_url, media_type = 'none', additional_image_urls } = body

  if (!connected_account_id || !content) {
    return Response.json({ error: 'connected_account_id and content are required' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  const { data: account, error: accountError } = await serviceClient
    .from('connected_accounts')
    .select('*')
    .eq('id', connected_account_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (accountError || !account) {
    return Response.json({ error: 'Account not found' }, { status: 404 })
  }

  const { data: post, error: insertError } = await serviceClient
    .from('scheduled_posts')
    .insert({
      user_id: user.id,
      connected_account_id,
      content,
      media_url: media_url || '',
      media_type,
      status: 'draft',
      publish_now: true,
    })
    .select()
    .single()

  if (insertError || !post) {
    return Response.json({ error: 'Failed to create post record' }, { status: 500 })
  }

  try {
    const result = await publishPost(account, content, media_url || null, media_type, additional_image_urls)

    await serviceClient.from('scheduled_posts').update({
      status: 'published',
      published_at: new Date().toISOString(),
    }).eq('id', post.id)

    return Response.json({ success: true, external_id: result.id, post_id: post.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    await serviceClient.from('scheduled_posts').update({
      status: 'failed',
      error_message: message,
    }).eq('id', post.id)

    return Response.json({ error: message }, { status: 500 })
  }
}
