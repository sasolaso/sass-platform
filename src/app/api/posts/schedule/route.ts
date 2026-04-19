import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    connected_account_id: string
    content: string
    media_url?: string
    media_type?: 'none' | 'image' | 'video'
    scheduled_at: string
  }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { connected_account_id, content, media_url, media_type = 'none', scheduled_at } = body

  if (!connected_account_id || !content || !scheduled_at) {
    return Response.json(
      { error: 'connected_account_id, content, and scheduled_at are required' },
      { status: 400 }
    )
  }

  const scheduledDate = new Date(scheduled_at)
  if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
    return Response.json({ error: 'scheduled_at must be a future date' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  const { data: account } = await serviceClient
    .from('connected_accounts')
    .select('id')
    .eq('id', connected_account_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!account) {
    return Response.json({ error: 'Account not found' }, { status: 404 })
  }

  const { data: post, error } = await serviceClient
    .from('scheduled_posts')
    .insert({
      user_id: user.id,
      connected_account_id,
      content,
      media_url: media_url || '',
      media_type,
      scheduled_at,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error || !post) {
    return Response.json({ error: 'Failed to schedule post' }, { status: 500 })
  }

  return Response.json({ success: true, post_id: post.id, scheduled_at })
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = createServiceClient()
  const { data: posts, error } = await serviceClient
    .from('scheduled_posts')
    .select('*, connected_accounts(account_name, platform, avatar_url)')
    .eq('user_id', user.id)
    .order('scheduled_at', { ascending: true })

  if (error) {
    return Response.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }

  return Response.json({ posts })
}
