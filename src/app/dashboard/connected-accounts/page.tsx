'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import type { ConnectedAccount } from '@/types/database'
import { Link2, Users, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, Trash2, RefreshCw, Loader as Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

const PLATFORM_CONFIG = {
  facebook: {
    label: 'Facebook',
    color: '#1877F2',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  instagram: {
    label: 'Instagram',
    color: '#E4405F',
    bgClass: 'bg-pink-50',
    textClass: 'text-pink-700',
    borderClass: 'border-pink-200',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  tiktok: {
    label: 'TikTok',
    color: '#000000',
    bgClass: 'bg-slate-50',
    textClass: 'text-slate-800',
    borderClass: 'border-slate-200',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34l.01-8.55a8.27 8.27 0 004.83 1.55V4.86a4.85 4.85 0 01-1.07-.17z" />
      </svg>
    ),
  },
  linkedin: {
    label: 'LinkedIn',
    color: '#0A66C2',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-800',
    borderClass: 'border-sky-200',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
}

type PlatformKey = keyof typeof PLATFORM_CONFIG

function ConnectedAccountsContent() {
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  const loadAccounts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setAccounts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAccounts()

    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const warning = searchParams.get('warning')
    if (success) {
      const labels: Record<string, string> = {
        facebook: 'Facebook',
        instagram: 'Instagram',
        tiktok: 'TikTok',
        linkedin: 'LinkedIn',
      }
      showNotification('success', `${labels[success] || success} account connected successfully!`)
    }
    if (warning) {
      showNotification('error', decodeURIComponent(warning))
    }
    if (error) {
      showNotification('error', decodeURIComponent(error))
    }
  }, [searchParams, loadAccounts])

  async function handleDisconnect(accountId: string) {
    if (!confirm('Are you sure you want to disconnect this account?')) return
    setDisconnecting(accountId)

    const res = await fetch('/api/accounts/disconnect', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: accountId }),
    })

    if (res.ok) {
      setAccounts(prev => prev.filter(a => a.id !== accountId))
      showNotification('success', 'Account disconnected successfully.')
    } else {
      showNotification('error', 'Failed to disconnect account.')
    }

    setDisconnecting(null)
  }

  function isExpired(account: ConnectedAccount): boolean {
    if (!account.token_expires_at) return false
    return new Date(account.token_expires_at) < new Date()
  }

  function isExpiringSoon(account: ConnectedAccount): boolean {
    if (!account.token_expires_at) return false
    const expiresAt = new Date(account.token_expires_at)
    const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    return expiresAt > new Date() && expiresAt < threeDays
  }

  const connectButtons = [
    { platform: 'facebook', href: '/api/facebook/auth' },
    { platform: 'instagram', href: '/api/instagram/auth' },
    { platform: 'tiktok', href: '/api/tiktok/auth' },
    { platform: 'linkedin', href: '/api/linkedin/auth' },
  ] as const

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Connected Accounts</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage your social media connections</p>
      </div>

      {notification && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {notification.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />
          }
          {notification.message}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Connect a Platform</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {connectButtons.map(({ platform, href }) => {
            const config = PLATFORM_CONFIG[platform]
            return (
              <a
                key={platform}
                href={href}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 ${config.borderClass} ${config.bgClass} hover:opacity-80 transition-opacity`}
              >
                <div className={config.textClass}>{config.icon}</div>
                <span className={`text-sm font-semibold ${config.textClass}`}>{config.label}</span>
              </a>
            )
          })}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-slate-900 mb-4">
          Connected Accounts
          {accounts.length > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-400">({accounts.length})</span>
          )}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Link2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No accounts connected yet.</p>
            <p className="text-slate-400 text-xs mt-1">Click a platform above to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map(account => {
              const config = PLATFORM_CONFIG[account.platform as PlatformKey]
              const expired = isExpired(account)
              const expiringSoon = isExpiringSoon(account)

              return (
                <div
                  key={account.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4"
                >
                  <div className={`w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 ${config?.borderClass || 'border-slate-200'} flex items-center justify-center ${config?.bgClass || 'bg-slate-50'}`}>
                    {account.avatar_url ? (
                      <img src={account.avatar_url} alt={account.account_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className={config?.textClass}>{config?.icon}</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 truncate">{account.account_name}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config?.bgClass} ${config?.textClass}`}>
                        {config?.label || account.platform}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      {account.followers_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {account.followers_count.toLocaleString()} followers
                        </span>
                      )}
                      {account.token_expires_at && (
                        <span className={expired ? 'text-red-500' : expiringSoon ? 'text-amber-500' : ''}>
                          {expired
                            ? 'Token expired'
                            : expiringSoon
                            ? `Expires ${new Date(account.token_expires_at).toLocaleDateString()}`
                            : `Valid until ${new Date(account.token_expires_at).toLocaleDateString()}`
                          }
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {(expired || expiringSoon) && (
                      <a
                        href={`/api/${account.platform}/auth`}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reconnect
                      </a>
                    )}
                    <button
                      onClick={() => handleDisconnect(account.id)}
                      disabled={disconnecting === account.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      {disconnecting === account.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                      Disconnect
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ConnectedAccountsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}>
      <ConnectedAccountsContent />
    </Suspense>
  )
}
