'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, RefreshCw, Check, CircleAlert as AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/modal'
import { cn, formatNumber } from '@/lib/utils'
import { getPlatformIcon } from '@/components/ui/platform-icons'
import { createClient } from '@/lib/supabase/client'

const PLATFORM_CONFIG = [
  { id: 'instagram', label: 'Instagram', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/30', desc: 'Share photos, videos, stories and reels' },
  { id: 'facebook', label: 'Facebook', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', desc: 'Pages, groups, and personal profiles' },
  { id: 'twitter', label: 'Twitter / X', color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-950/30', desc: 'Tweets, threads, and spaces' },
  { id: 'linkedin', label: 'LinkedIn', color: 'text-blue-700', bg: 'bg-blue-50 dark:bg-blue-950/30', desc: 'Professional content and company pages' },
  { id: 'tiktok', label: 'TikTok', color: 'text-gray-900 dark:text-gray-100', bg: 'bg-gray-50 dark:bg-gray-800', desc: 'Short-form video content' },
]

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnectId, setDisconnectId] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    setAccounts(data || [])
    setLoading(false)
  }

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId)
    await new Promise(r => setTimeout(r, 1500))

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('connected_accounts').insert({
        user_id: user.id,
        platform: platformId,
        account_id: `demo_${Date.now()}`,
        account_name: `My ${platformId.charAt(0).toUpperCase() + platformId.slice(1)} Account`,
        account_username: `@demo_user`,
        is_active: true,
        followers_count: Math.floor(Math.random() * 50000),
        following_count: Math.floor(Math.random() * 1000),
        posts_count: Math.floor(Math.random() * 500),
      }).select().maybeSingle()
      if (data) setAccounts(prev => [data, ...prev])
    }

    setConnecting(null)
    toast.success(`${platformId} connected successfully!`)
  }

  const handleDisconnect = async (id: string) => {
    const supabase = createClient()
    await supabase.from('connected_accounts').update({ is_active: false }).eq('id', id)
    setAccounts(accounts.filter(a => a.id !== id))
    setDisconnectId(null)
    toast.success('Account disconnected')
  }

  const connectedPlatforms = accounts.map(a => a.platform)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Connected Accounts</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {accounts.length} of 10 accounts connected (Pro plan).
        </p>
      </div>

      {/* Connected accounts */}
      {accounts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Connected</h2>
          {accounts.map(account => (
            <Card key={account.id} hover className="flex items-center gap-4">
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
                PLATFORM_CONFIG.find(p => p.id === account.platform)?.bg || 'bg-gray-50')}>
                <span className={cn('', PLATFORM_CONFIG.find(p => p.id === account.platform)?.color || 'text-gray-500')}>
                  {getPlatformIcon(account.platform, 22)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{account.account_name}</p>
                  <Badge variant="success" size="sm"><Check size={10} /> Connected</Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{account.account_username}</p>
                <div className="flex gap-4 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatNumber(account.followers_count)} followers</span>
                  <span>{formatNumber(account.posts_count)} posts</span>
                </div>
              </div>
              <button
                onClick={() => setDisconnectId(account.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* Available platforms */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Add More Accounts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORM_CONFIG.filter(p => !connectedPlatforms.includes(p.id)).map(platform => (
            <Card key={platform.id} hover>
              <div className="flex items-start gap-3">
                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0', platform.bg)}>
                  <span className={platform.color}>{getPlatformIcon(platform.id, 22)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">{platform.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{platform.desc}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    loading={connecting === platform.id}
                    onClick={() => handleConnect(platform.id)}
                  >
                    <Plus size={12} />
                    Connect
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {connectedPlatforms.length === PLATFORM_CONFIG.length && (
            <Card className="col-span-full text-center py-8 border-dashed">
              <Check size={24} className="mx-auto text-green-500 mb-2" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">All platforms connected!</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">You can connect additional accounts on higher plans.</p>
            </Card>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!disconnectId}
        onClose={() => setDisconnectId(null)}
        onConfirm={() => disconnectId && handleDisconnect(disconnectId)}
        title="Disconnect Account"
        message="Disconnecting will stop publishing to this account and disable analytics for it. You can reconnect anytime."
        confirmLabel="Disconnect"
        danger
      />
    </div>
  )
}
