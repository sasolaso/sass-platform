// src/app/api/cron/publish-posts/route.ts

import { createClient } from '@/lib/supabase/server'
import { publishPost } from '@/lib/social'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // ✅ أضف await هنا
    const supabase = await createClient()

    const now = new Date().toISOString()

    const { data: posts, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select('*, post_platforms(*)')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)

    if (fetchError) {
      console.error('Error fetching scheduled posts:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ message: 'No pending scheduled posts', count: 0 })
    }

    let publishedCount = 0
    let failedCount = 0

    for (const post of posts) {
      try {
        for (const platform of post.post_platforms || []) {
          const account = await supabase
            .from('connected_accounts')
            .select('*')
            .eq('id', platform.connected_account_id)
            .single()

          if (account.data) {
            await publishPost(
              account.data,
              post.content,
              post.media_url,
              post.media_type,
              post.additional_image_urls || []
            )
          }
        }

        await supabase
          .from('scheduled_posts')
          .update({ status: 'published', published_at: new Date().toISOString() })
          .eq('id', post.id)

        publishedCount++
      } catch (err) {
        console.error(`Failed to publish post ${post.id}:`, err)
        await supabase
          .from('scheduled_posts')
          .update({ status: 'failed', error_message: String(err) })
          .eq('id', post.id)
        failedCount++
      }
    }

    return NextResponse.json({ published: publishedCount, failed: failedCount })
  } catch (err) {
    console.error('Cron job error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
