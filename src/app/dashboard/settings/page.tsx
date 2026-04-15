'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, Bell, Lock, Globe, Trash2, Moon, Sun, Monitor, Save, 
  LogOut, Upload, X, Loader2, Search, Reply, Heart, Star, 
  RefreshCw, Send, LayoutDashboard, Calendar, Image, Inbox, 
  Bot, BarChart3, TrendingUp, Link2, CreditCard, Settings, 
  HelpCircle, Plus, ChevronLeft, ChevronRight, Menu
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { ConfirmModal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { cn, formatRelativeTime } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/context'
import { updatePassword, signOutAll, getCurrentUser, getUserProfile, updateProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'
import type { Language } from '@/types'

const LANGUAGES: { code: Language; label: string; native: string; flag: string }[] = [
  { code: 'en', label: 'English', native: 'English', flag: '🇺🇸' },
  { code: 'ar', label: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  { code: 'fr', label: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Spanish', native: 'Español', flag: '🇪🇸' },
]

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'appearance', label: 'Appearance', icon: Globe },
  { id: 'data', label: 'Data & Privacy', icon: Trash2 },
]

// القائمة الجانبية
const SIDEBAR_MENU = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'create-post', label: 'Créer un post', icon: Plus, href: '/dashboard/create' },
  { id: 'content-calendar', label: 'Calendrier de contenu', icon: Calendar, href: '/dashboard/calendar' },
  { id: 'media-library', label: 'Médiathèque', icon: Image, href: '/dashboard/media' },
  { id: 'inbox', label: 'Boîte de réception', icon: Inbox, href: '/dashboard/inbox' },
  { id: 'ai-writer', label: 'Rédacteur IA', icon: Bot, href: '/dashboard/ai-writer' },
  { id: 'bot-settings', label: 'Paramètres du bot', icon: Settings, href: '/dashboard/bot' },
  { id: 'analytics', label: 'Analytique et rapports', icon: BarChart3, href: '/dashboard/analytics' },
  { id: 'competitors', label: 'Analyse des concurrents', icon: TrendingUp, href: '/dashboard/competitors' },
  { id: 'connected-accounts', label: 'Comptes connectés', icon: Link2, href: '/dashboard/accounts' },
  { id: 'billing', label: 'Facturation et plans', icon: CreditCard, href: '/dashboard/billing' },
  { id: 'settings', label: 'Paramètres', icon: Settings, href: '/dashboard/settings', active: true },
  { id: 'help', label: 'Aide et support', icon: HelpCircle, href: '/dashboard/help' },
]

export default function SettingsPage() {
  const router = useRouter()
  const { language, setLanguage } = useI18n()
  const [activeTab, setActiveTab] = useState('profile')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [timezone, setTimezone] = useState('America/New_York')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')
  const [deleteModal, setDeleteModal] = useState(false)
  const [signOutAllModal, setSignOutAllModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifs, setNotifs] = useState({
    postPublished: true,
    postFailed: true,
    botReplies: false,
    weeklyReport: true,
    planExpiring: true,
  })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [signOutAllLoading, setSignOutAllLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  // تحميل بيانات المستخدم
  useEffect(() => {
    loadUserData()
  }, [])

  // منع التمرير عند فتح القائمة على الموبايل
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  const loadUserData = async () => {
    setLoading(true)
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)
      setEmail(user.email || '')

      const profile = await getUserProfile(user.id)
      if (profile) {
        setDisplayName(profile.display_name || user.user_metadata?.full_name || '')
        if (profile.avatar_url) {
          setAvatarUrl(profile.avatar_url)
          setAvatarPreview(profile.avatar_url)
        }
      } else {
        setDisplayName(user.user_metadata?.full_name || '')
      }

      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'light'
      setTheme(savedTheme)
      if (savedTheme === 'dark') document.documentElement.classList.add('dark')
    } catch (error) {
      console.error('Error loading user data:', error)
      toast.error('Failed to load user data')
    } finally {
      setLoading(false)
    }
  }

  // رفع الصورة إلى Supabase Storage
  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!userId) {
      toast.error('User not found')
      return null
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
      return publicUrl
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error('Failed to upload image')
      return null
    }
  }

  const deleteOldAvatar = async (oldUrl: string | null) => {
    if (!oldUrl) return
    try {
      const path = oldUrl.split('/avatars/')[1]
      if (path) await supabase.storage.from('avatars').remove([path])
    } catch (error) {
      console.error('Error deleting old avatar:', error)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image (JPEG, PNG, GIF, or WEBP)')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB')
      return
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleRemoveAvatar = () => {
    if (avatarPreview && avatarPreview !== avatarUrl) {
      URL.revokeObjectURL(avatarPreview)
    }
    setAvatarFile(null)
    setAvatarPreview(avatarUrl)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSaveProfile = async () => {
    if (!userId) {
      toast.error('User not found')
      return
    }

    setSaving(true)

    try {
      let newAvatarUrl = avatarUrl

      if (avatarFile) {
        setUploading(true)
        const uploadedUrl = await uploadAvatar(avatarFile)
        setUploading(false)

        if (uploadedUrl) {
          await deleteOldAvatar(avatarUrl)
          newAvatarUrl = uploadedUrl
        } else {
          toast.error('Failed to upload image')
          setSaving(false)
          return
        }
      }

      const { error } = await updateProfile(userId, {
        display_name: displayName,
        avatar_url: newAvatarUrl ?? undefined,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      await supabase.auth.updateUser({
        data: { display_name: displayName, full_name: displayName },
      })

      setAvatarUrl(newAvatarUrl)
      setAvatarFile(null)
      toast.success('Profile saved successfully!')
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleTheme = (t: 'light' | 'dark' | 'system') => {
    setTheme(t)
    if (t === 'dark') {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else if (t === 'light') {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (systemDark) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'system')
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields')
      return
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setPasswordLoading(true)
    const { error } = await updatePassword(newPassword)
    setPasswordLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Password updated successfully')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleSignOutAll = async () => {
    setSignOutAllLoading(true)
    const { error } = await signOutAll()
    setSignOutAllLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }
    router.push('/login')
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error(error.message)
    } else {
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Input file مخفي */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleAvatarChange}
        className="hidden"
        disabled={uploading}
      />

      {/* زر القائمة للهواتف */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <Menu size={20} />
      </button>

      {/* القائمة الجانبية - سطح المكتب */}
      
<aside
        className={cn(
          "hidden lg:flex flex-col fixed right-0 top-0 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 transition-all duration-300 z-30",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* شعار التطبيق */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <LayoutDashboard size={18} className="text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-lg text-gray-900 dark:text-white">SocialAI</span>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* قائمة الروابط */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {SIDEBAR_MENU.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                item.active
                  ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* معلومات المستخدم في أسفل القائمة */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                displayName[0]?.toUpperCase() || 'U'
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {displayName || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{email}</p>
                <button
                  onClick={handleLogout}
                  className="text-xs text-red-500 hover:text-red-600 mt-1"
                >
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
      

      {/* القائمة الجانبية للهواتف (Drawer) */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed right-0 top-0 w-72 h-full bg-white dark:bg-gray-900 z-50 shadow-xl lg:hidden overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <LayoutDashboard size={18} className="text-white" />
                </div>
                <span className="font-bold text-lg text-gray-900 dark:text-white">SocialAI</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ✕
              </button>
            </div>

            <nav className="p-3 space-y-1">
              {SIDEBAR_MENU.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    router.push(item.href)
                    setMobileMenuOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    item.active
                      ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    displayName[0]?.toUpperCase() || 'U'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {displayName || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{email}</p>
                  <button
                    onClick={() => {
                      handleLogout()
                      setMobileMenuOpen(false)
                    }}
                    className="text-xs text-red-500 hover:text-red-600 mt-1"
                  >
                    Se déconnecter
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* المحتوى الرئيسي */}
      <main className={cn(
        "flex-1 transition-all duration-300 p-6",
        sidebarCollapsed ? "lg:mr-20" : "lg:mr-64"
      )}>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your account preferences.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* قائمة التبويبات الجانبية */}
            <nav className="space-y-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                >
                  <tab.icon size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* محتوى التبويب النشط */}
            <div className="lg:col-span-3">
              {/* تبويب الملف الشخصي */}
              {activeTab === 'profile' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                          {avatarPreview ? (
                            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            displayName[0]?.toUpperCase() || 'U'
                          )}
                        </div>
                        <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center cursor-pointer shadow-lg transition-colors">
                          {uploading ? (
                            <Loader2 size={14} className="text-white animate-spin" />
                          ) : (
                            <Upload size={14} className="text-white" />
                          )}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleAvatarChange}
                            className="hidden"
                            disabled={uploading}
                          />
                        </label>
                        {avatarFile && (
                          <button
                            onClick={handleRemoveAvatar}
                            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-colors"
                          >
                            <X size={12} className="text-white" />
                          </button>
                        )}
                      </div>

                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Change Photo
                        </Button>
                        <p className="text-xs text-gray-400 mt-1">JPG, PNG or GIF. Max 2MB.</p>
                        {uploading && <p className="text-xs text-blue-500 mt-1">Uploading...</p>}
                      </div>
                    </div>

                    <Input
                      label="Full Name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your full name"
                    />

                    <Input
                      label="Email"
                      value={email}
                      disabled
                      helperText="Contact support to change your email."
                    />

                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Timezone</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Toronto">Toronto (ET)</option>
                        <option value="America/Vancouver">Vancouver (PT)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Europe/Paris">Paris (CET)</option>
                        <option value="Asia/Dubai">Dubai (GST)</option>
                      </select>
                    </div>

                    <Button onClick={handleSaveProfile} loading={saving || uploading}>
                      <Save size={14} />
                      {saving || uploading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* تبويب الإشعارات */}
              {activeTab === 'notifications' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { key: 'postPublished', label: 'Post Published', desc: 'When your post is published successfully' },
                        { key: 'postFailed', label: 'Post Failed', desc: 'When a post fails to publish' },
                        { key: 'botReplies', label: 'Bot Replies', desc: 'For each automated reply sent' },
                        { key: 'weeklyReport', label: 'Weekly Report', desc: 'Weekly performance summaries by email' },
                        { key: 'planExpiring', label: 'Plan Expiring', desc: 'Before your plan expires' },
                      ].map(({ key, label, desc }) => (
                        <Toggle
                          key={key}
                          checked={notifs[key as keyof typeof notifs]}
                          onChange={(v) => setNotifs((prev) => ({ ...prev, [key]: v }))}
                          label={label}
                          description={desc}
                        />
                      ))}
                      <Button onClick={() => toast.success('Notification settings saved!')}>
                        <Save size={14} />Save
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* تبويب الأمان */}
              {activeTab === 'security' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Change Password</h4>
                      <div className="space-y-3">
                        <Input
                          label="Current Password"
                          type="password"
                          placeholder="••••••••"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                        <Input
                          label="New Password"
                          type="password"
                          placeholder="Min. 8 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <Input
                          label="Confirm New Password"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        {confirmPassword && newPassword !== confirmPassword && (
                          <p className="text-xs text-red-500">Passwords do not match</p>
                        )}
                        <Button onClick={handleChangePassword} loading={passwordLoading}>
                          <Save size={14} />Update Password
                        </Button>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Active Sessions</h4>
                      <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400 mb-4">
                        Current session &middot; Active now
                      </div>
                      <div className="flex items-center justify-between p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
                        <div>
                          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Sign Out From All Devices</p>
                          <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                            Revoke all active sessions across every device
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 gap-1.5"
                          onClick={() => setSignOutAllModal(true)}
                          loading={signOutAllLoading}
                        >
                          <LogOut size={14} />
                          Sign Out All
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* تبويب المظهر */}
              {activeTab === 'appearance' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Language &amp; Appearance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Interface Language</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {LANGUAGES.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => setLanguage(lang.code)}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-xl border-2 transition-all',
                              language === lang.code
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            )}
                          >
                            <span className="text-xl">{lang.flag}</span>
                            <div className="text-left">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{lang.native}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{lang.label}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Theme</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {(
                          [
                            ['light', Sun, 'Light'],
                            ['dark', Moon, 'Dark'],
                            ['system', Monitor, 'System'],
                          ] as const
                        ).map(([t, Icon, label]) => (
                          <button
                            key={t}
                            onClick={() => handleTheme(t)}
                            className={cn(
                              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                              theme === t
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                                : 'border-gray-200 dark:border-gray-700'
                            )}
                          >
                            <Icon size={20} className={theme === t ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* تبويب البيانات والخصوصية */}
              {activeTab === 'data' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Data &amp; Privacy</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
                      We comply with CCPA (California Consumer Privacy Act) and PIPEDA (Canada). You have the right to access, export,
                      and delete your data.
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 dark:border-gray-800">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Export My Data</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Download all your data in JSON format</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => toast.info('Preparing data export...')}>
                          Export
                        </Button>
                      </div>
                      <div className="flex items-center justify-between p-3.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                        <div>
                          <p className="text-sm font-medium text-red-700 dark:text-red-400">Delete My Account</p>
                          <p className="text-xs text-red-600/70 dark:text-red-400/70">
                            Permanently delete all your data. Cannot be undone.
                          </p>
                        </div>
                        <Button variant="danger" size="sm" onClick={() => setDeleteModal(true)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* نوافذ التأكيد */}
      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={() => {
          setDeleteModal(false)
          toast.error('Account deletion requested. You will receive a confirmation email.')
        }}
        title="Delete Account"
        message="This will permanently delete your account and all associated data including posts, analytics, and settings. This action cannot be undone."
        confirmLabel="Delete My Account"
        cancelLabel="Keep Account"
        danger
      />

      <ConfirmModal
        isOpen={signOutAllModal}
        onClose={() => setSignOutAllModal(false)}
        onConfirm={() => {
          setSignOutAllModal(false)
          handleSignOutAll()
        }}
        title="Sign Out From All Devices"
        message="This will immediately end all active sessions on every device. You will need to sign in again on this device."
        confirmLabel="Sign Out All Devices"
        cancelLabel="Cancel"
        danger
      />
    </div>
  )
}
