'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { ConnectedAccount } from '@/types/database'
import { Image as ImageIcon, Video, X, Calendar, Send, Clock, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, Loader as Loader2, ChevronDown, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { PLATFORM_CHAR_LIMITS } from '@/lib/social'

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
}

const PLATFORM_COLORS: Record<string, string> = {
  facebook: 'text-blue-600',
  instagram: 'text-pink-600',
  tiktok: 'text-slate-800',
  linkedin: 'text-sky-700',
}

interface PlatformMediaConfig {
  image: boolean
  video: boolean
  multiImage: boolean
  accepts: string
  maxImages: number
}

const PLATFORM_MEDIA: Record<string, PlatformMediaConfig> = {
  facebook: { image: true, video: true, multiImage: true, accepts: 'image/jpeg,image/png,image/gif,video/mp4,video/mov', maxImages: 4 },
  instagram: { image: true, video: true, multiImage: false, accepts: 'image/jpeg,image/png,video/mp4,video/mov', maxImages: 1 },
  tiktok: { image: false, video: true, multiImage: false, accepts: 'video/mp4', maxImages: 1 },
  linkedin: { image: true, video: true, multiImage: false, accepts: 'image/jpeg,image/png,video/mp4', maxImages: 1 },
}

interface MediaItem {
  preview: string
  url: string
  type: 'image' | 'video'
}

export default function CreatePostPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [content, setContent] = useState('')
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const selectedAccount = accounts.find(a => a.id === selectedAccountId)
  const platform = selectedAccount?.platform || 'facebook'
  const charLimit = PLATFORM_CHAR_LIMITS[platform] || 2000
  const mediaConfig: PlatformMediaConfig = PLATFORM_MEDIA[platform] ?? PLATFORM_MEDIA.facebook
  const primaryMedia = mediaItems[0] ?? null
  const isCarousel = mediaConfig.multiImage && mediaItems.length > 1

  function showNotification(type: 'success' | 'error', message: string) {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 6000)
  }

  const loadAccounts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('platform', { ascending: true })
    setAccounts(data || [])
    if (data?.length) setSelectedAccountId(data[0].id)
    setAccountsLoading(false)
  }, [])

  useEffect(() => { loadAccounts() }, [loadAccounts])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const remaining = mediaConfig.maxImages - mediaItems.length
    if (remaining <= 0) {
      showNotification('error', `Maximum ${mediaConfig.maxImages} file(s) allowed for ${PLATFORM_LABELS[platform]}`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const toAdd = files.slice(0, remaining)
    const newItems: MediaItem[] = []

    for (const file of toAdd) {
      const isVideo = file.type.startsWith('video/')
      const isImage = file.type.startsWith('image/')
      if (!isVideo && !isImage) continue
      if (isVideo && !mediaConfig.video) { showNotification('error', `${PLATFORM_LABELS[platform]} does not support video`); continue }
      if (isImage && !mediaConfig.image) { showNotification('error', `${PLATFORM_LABELS[platform]} requires video only`); continue }
      const objectUrl = URL.createObjectURL(file)
      newItems.push({ preview: objectUrl, url: objectUrl, type: isVideo ? 'video' : 'image' })
    }

    if (newItems.length > 0) {
      setMediaItems(prev => {
        const updated = [...prev, ...newItems]
        setCarouselIndex(updated.length - 1)
        return updated
      })
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeMedia(index: number) {
    setMediaItems(prev => {
      const updated = prev.filter((_, i) => i !== index)
      setCarouselIndex(i => Math.min(i, Math.max(0, updated.length - 1)))
      return updated
    })
  }

  function clearAllMedia() {
    setMediaItems([])
    setCarouselIndex(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handlePublishNow() {
    if (!selectedAccountId) { showNotification('error', 'Please select an account'); return }
    if (!content.trim() && mediaItems.length === 0) { showNotification('error', 'Please add content or media'); return }
    if (platform === 'tiktok' && (mediaItems.length === 0 || mediaItems[0]?.type !== 'video')) {
      showNotification('error', 'TikTok requires a video'); return
    }
    if (platform === 'instagram' && mediaItems.length === 0) {
      showNotification('error', 'Instagram requires an image or video'); return
    }

    setLoading(true)
    try {
      const mediaType = (primaryMedia?.type ?? 'none') as 'none' | 'image' | 'video'
      const additionalImageUrls = mediaItems.slice(1).filter(m => m.type === 'image').map(m => m.url)

      const res = await fetch('/api/posts/publish-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connected_account_id: selectedAccountId,
          content: content.trim(),
          media_url: primaryMedia?.url,
          media_type: mediaType,
          additional_image_urls: additionalImageUrls.length > 0 ? additionalImageUrls : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to publish')
      showNotification('success', 'Post published successfully!')
      setContent('')
      clearAllMedia()
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to publish post')
    } finally {
      setLoading(false)
    }
  }

  async function handleSchedule() {
    if (!selectedAccountId) { showNotification('error', 'Please select an account'); return }
    if (!content.trim() && mediaItems.length === 0) { showNotification('error', 'Please add content or media'); return }
    if (!scheduledAt) { showNotification('error', 'Please select a date and time'); return }
    if (new Date(scheduledAt) <= new Date()) { showNotification('error', 'Scheduled time must be in the future'); return }

    setLoading(true)
    try {
      const mediaType = (primaryMedia?.type ?? 'none') as 'none' | 'image' | 'video'
      const additionalImageUrls = mediaItems.slice(1).filter(m => m.type === 'image').map(m => m.url)

      const res = await fetch('/api/posts/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connected_account_id: selectedAccountId,
          content: content.trim(),
          media_url: primaryMedia?.url,
          media_type: mediaType,
          additional_image_urls: additionalImageUrls.length > 0 ? additionalImageUrls : undefined,
          scheduled_at: scheduledAt,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to schedule')
      showNotification('success', `Post scheduled for ${new Date(scheduledAt).toLocaleString()}`)
      setContent('')
      setScheduledAt('')
      clearAllMedia()
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to schedule post')
    } finally {
      setLoading(false)
    }
  }

  const charsUsed = content.length
  const charsLeft = charLimit - charsUsed
  const isOverLimit = charsLeft < 0
  const isNearLimit = charsLeft < 50 && !isOverLimit

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create Post</h1>
        <p className="text-slate-500 mt-1 text-sm">Publish or schedule content across your platforms</p>
      </div>

      {notification && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${
          notification.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />
          }
          {notification.message}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {/* Account selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Account</label>
          {accountsLoading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />Loading accounts...
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              No connected accounts.{' '}
              <a href="/connected-accounts" className="underline font-medium">Connect one first</a>
            </div>
          ) : (
            <div className="relative">
              <select
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="w-full pl-3.5 pr-9 py-2.5 appearance-none rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white"
              >
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {PLATFORM_LABELS[account.platform] || account.platform} — {account.account_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>

        {selectedAccount && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className={`font-medium ${PLATFORM_COLORS[platform]}`}>{PLATFORM_LABELS[platform]}</span>
            <span>·</span>
            <span>Max {charLimit.toLocaleString()} characters</span>
            {platform === 'instagram' && <span>· Requires image or video</span>}
            {platform === 'tiktok' && <span>· Video only</span>}
            {mediaConfig.multiImage && (
              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">
                Up to {mediaConfig.maxImages} images (carousel)
              </span>
            )}
          </div>
        )}

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Content</label>
          <div className="relative">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your post content..."
              rows={5}
              className="w-full px-3.5 py-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
            />
            <div className={`absolute bottom-3 right-3 text-xs font-mono ${
              isOverLimit ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-slate-300'
            }`}>
              {charsUsed}/{charLimit}
            </div>
          </div>
        </div>

        {/* Media */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">
              Media
              {mediaItems.length > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {mediaItems.length}/{mediaConfig.maxImages}
                </span>
              )}
            </label>
            {mediaItems.length > 0 && (
              <button onClick={clearAllMedia} className="text-xs text-red-500 hover:text-red-700 font-medium">
                Remove all
              </button>
            )}
          </div>

          {mediaItems.length > 0 ? (
            <div className="space-y-3">
              {/* Main viewer with carousel controls */}
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 min-h-48 flex items-center justify-center">
                {mediaItems[carouselIndex]?.type === 'image' ? (
                  <img
                    src={mediaItems[carouselIndex].preview}
                    alt={`Media ${carouselIndex + 1}`}
                    className="max-h-72 w-full object-contain"
                  />
                ) : (
                  <video src={mediaItems[carouselIndex]?.preview} controls className="max-h-72 w-full" />
                )}

                <button
                  onClick={() => removeMedia(carouselIndex)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {isCarousel && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full font-medium">
                    Carousel · {mediaItems.length} images
                  </div>
                )}

                {mediaItems.length > 1 && (
                  <>
                    <button
                      onClick={() => setCarouselIndex(i => Math.max(0, i - 1))}
                      disabled={carouselIndex === 0}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 disabled:opacity-20 text-white rounded-full flex items-center justify-center transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCarouselIndex(i => Math.min(mediaItems.length - 1, i + 1))}
                      disabled={carouselIndex === mediaItems.length - 1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 disabled:opacity-20 text-white rounded-full flex items-center justify-center transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {mediaItems.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCarouselIndex(i)}
                          className={`w-2 h-2 rounded-full transition-colors ${i === carouselIndex ? 'bg-white' : 'bg-white/50'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail strip + add more */}
              {(mediaItems.length > 1 || (mediaConfig.multiImage && mediaItems.length < mediaConfig.maxImages)) && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {mediaItems.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setCarouselIndex(i)}
                      className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        i === carouselIndex ? 'border-sky-500' : 'border-slate-200 opacity-60 hover:opacity-100'
                      }`}
                    >
                      {item.type === 'image' ? (
                        <img src={item.preview} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                          <Video className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                  {mediaConfig.multiImage && mediaItems.length < mediaConfig.maxImages && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 hover:border-sky-400 hover:bg-sky-50 flex items-center justify-center transition-all"
                      title="Add more images"
                    >
                      <Plus className="w-5 h-5 text-slate-400" />
                    </button>
                  )}
                </div>
              )}

              {/* Add more hint for single item */}
              {mediaItems.length === 1 && mediaConfig.multiImage && mediaItems.length < mediaConfig.maxImages && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add more images for carousel ({mediaConfig.maxImages - mediaItems.length} remaining)
                </button>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 cursor-pointer transition-all"
            >
              <div className="flex gap-3 text-slate-300">
                {mediaConfig.image && <ImageIcon className="w-7 h-7" />}
                {mediaConfig.video && <Video className="w-7 h-7" />}
              </div>
              <p className="text-sm text-slate-500">Click to upload media</p>
              {mediaConfig.multiImage && (
                <p className="text-xs text-sky-500 font-medium">Carousel: upload up to {mediaConfig.maxImages} images</p>
              )}
              <p className="text-xs text-slate-400">{mediaConfig.accepts.replace(/,/g, ', ')}</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={mediaConfig.accepts}
            multiple={mediaConfig.multiImage}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Schedule Date & Time
            <span className="text-slate-400 font-normal ml-1">(optional for publish now)</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={handlePublishNow}
            disabled={loading || accounts.length === 0 || isOverLimit}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publish Now
          </button>
          <button
            onClick={handleSchedule}
            disabled={loading || accounts.length === 0 || !scheduledAt || isOverLimit}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
            Schedule
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Platform Guidelines</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { platform: 'Facebook', limit: '63,206 chars', media: 'Images, Videos · Carousel (2–4 images)', color: 'text-blue-600' },
            { platform: 'Instagram', limit: '2,200 chars', media: 'Image/Video required', color: 'text-pink-600' },
            { platform: 'TikTok', limit: '150 chars', media: 'Video only', color: 'text-slate-800' },
            { platform: 'LinkedIn', limit: '3,000 chars', media: 'Images & Videos', color: 'text-sky-700' },
          ].map(({ platform, limit, media, color }) => (
            <div key={platform} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className={`text-sm font-semibold ${color}`}>{platform}</div>
              <div className="text-xs text-slate-500 mt-0.5">{limit} · {media}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
