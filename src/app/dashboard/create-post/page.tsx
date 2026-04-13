'use client'

import React, { useState } from 'react'
import { Send, Save, Clock, Hash, X, Sparkles, Image as ImageIcon, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { cn, getCharLimit, getPlatformColor } from '@/lib/utils'
import { getPlatformIcon } from '@/components/ui/platform-icons'
import { createClient } from '@/lib/supabase/client'

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'twitter', label: 'Twitter / X' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'tiktok', label: 'TikTok' },
]

type PostStatus = 'draft' | 'scheduled' | 'published'

export default function CreatePostPage() {
  const [content, setContent] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram'])
  const [hashtags, setHashtags] = useState<string[]>([])
  const [hashtagInput, setHashtagInput] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [activePlatformPreview, setActivePlatformPreview] = useState('instagram')

  const charLimit = Math.min(...selectedPlatforms.map(p => getCharLimit(p)))
  const charsLeft = charLimit - content.length
  const isOverLimit = charsLeft < 0

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const addHashtag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = hashtagInput.trim().replace(/^#/, '')
      if (tag && !hashtags.includes(tag)) {
        setHashtags([...hashtags, tag])
      }
      setHashtagInput('')
    }
  }

  const removeHashtag = (tag: string) => setHashtags(hashtags.filter(h => h !== tag))

  const handleAISuggest = async () => {
    setAiLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    setContent("🚀 Exciting news! We're pushing boundaries and redefining what's possible. Our team has been working tirelessly to bring you something amazing. Stay tuned for the big reveal! #Innovation #ComingSoon")
    setHashtags(['Innovation', 'ComingSoon', 'Exciting', 'News'])
    setAiLoading(false)
    toast.success('AI content generated!')
  }

  const handleSave = async (status: PostStatus) => {
    if (!content.trim()) { toast.error('Post content cannot be empty'); return }
    if (selectedPlatforms.length === 0) { toast.error('Select at least one platform'); return }
    if (status === 'scheduled' && !scheduledAt) { toast.error('Please select a schedule date'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: post, error } = await supabase.from('scheduled_posts').insert({
      user_id: user.id,
      content: content + (hashtags.length ? '\n\n' + hashtags.map(h => `#${h}`).join(' ') : ''),
      hashtags,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      status,
      publish_now: status === 'published',
    }).select().maybeSingle()

    if (!error && post) {
      await Promise.all(selectedPlatforms.map(platform =>
        supabase.from('post_platforms').insert({
          post_id: post.id,
          user_id: user.id,
          platform,
          status: 'pending',
        })
      ))
    }

    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success(status === 'draft' ? 'Draft saved!' : status === 'scheduled' ? 'Post scheduled!' : 'Published!')
    setContent('')
    setHashtags([])
    setScheduledAt('')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Post</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Write and schedule content across multiple platforms.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-5">
          {/* Platform selector */}
          <Card>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Publish to</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all',
                    selectedPlatforms.includes(p.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  )}
                >
                  <span className="text-base">{getPlatformIcon(p.id, 16)}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Content editor */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Post Content</p>
              <Button variant="ghost" size="xs" onClick={handleAISuggest} loading={aiLoading} className="text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30">
                <Sparkles size={14} />
                AI Suggest
              </Button>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={8}
              placeholder="What's on your mind? Write your post here..."
              className="w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-400">{charLimit} char limit</span>
              <span className={cn('text-xs font-medium', isOverLimit ? 'text-red-500' : charsLeft < 50 ? 'text-amber-500' : 'text-gray-400')}>
                {charsLeft} left
              </span>
            </div>
          </Card>

          {/* Hashtags */}
          <Card>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Hash size={14} className="inline mr-1" />
              Hashtags
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {hashtags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs px-2.5 py-1 rounded-full">
                  #{tag}
                  <button onClick={() => removeHashtag(tag)} className="hover:text-red-500 transition-colors"><X size={12} /></button>
                </span>
              ))}
            </div>
            <input
              value={hashtagInput}
              onChange={e => setHashtagInput(e.target.value)}
              onKeyDown={addHashtag}
              placeholder="Type a hashtag and press Enter..."
              className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none border border-gray-200 dark:border-gray-700"
            />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Schedule */}
          <Card>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Clock size={14} className="inline mr-1" />
              Schedule
            </p>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Card>

          {/* Preview */}
          <Card>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Preview</p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 min-h-[120px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500" />
                <div>
                  <div className="text-xs font-medium text-gray-900 dark:text-white">Your Account</div>
                  <div className="text-xs text-gray-400">Just now</div>
                </div>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {content || 'Your post preview will appear here...'}
                {hashtags.length > 0 && '\n\n' + hashtags.map(h => `#${h}`).join(' ')}
              </p>
            </div>
          </Card>

          {/* Actions */}
          <div className="space-y-2.5">
            <Button className="w-full gap-2" onClick={() => handleSave('published')} loading={loading} disabled={isOverLimit}>
              <Send size={14} />
              Publish Now
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={() => handleSave('scheduled')} disabled={loading || isOverLimit}>
              <Clock size={14} />
              Schedule Post
            </Button>
            <Button variant="ghost" className="w-full gap-2" onClick={() => handleSave('draft')} disabled={loading}>
              <Save size={14} />
              Save Draft
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
