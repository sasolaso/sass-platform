'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Zap, Eye, EyeOff, Check, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { signUp } from '@/lib/auth'
import { useI18n } from '@/lib/i18n/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  const passwordStrength = password.length >= 8 ? (password.match(/[A-Z]/) && password.match(/[0-9]/) ? 'strong' : 'medium') : password.length > 0 ? 'weak' : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) { toast.error('Please fill in all fields'); return }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (!agreed) { toast.error('Please agree to the terms'); return }
    setLoading(true)
    const { data, error } = await signUp(email, password, name)
    setLoading(false)
    if (error) { toast.error(error.message); return }
    if (data.user) {
      router.push(`/verify-email?email=${encodeURIComponent(email)}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">SocialAI</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.auth.createAccount}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Start your 14-day free trial. No credit card required.</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
          {/* Benefits */}
          <div className="flex gap-4 mb-6 text-xs text-gray-500 dark:text-gray-400">
            {['Free 14-day trial', 'No credit card', 'Cancel anytime'].map(b => (
              <div key={b} className="flex items-center gap-1">
                <Check size={12} className="text-green-500" />
                {b}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t.auth.fullName}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Doe"
              autoComplete="name"
              required
            />
            <Input
              label={t.auth.email}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <div>
              <Input
                label={t.auth.password}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                required
                rightIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              {passwordStrength && (
                <div className="mt-2 flex gap-1">
                  {['weak', 'medium', 'strong'].map((s, i) => (
                    <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
                      passwordStrength === 'weak' && i === 0 ? 'bg-red-400' :
                      passwordStrength === 'medium' && i <= 1 ? 'bg-amber-400' :
                      passwordStrength === 'strong' ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  ))}
                  <span className="text-xs text-gray-400 ml-1 capitalize">{passwordStrength}</span>
                </div>
              )}
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {t.auth.agreeToTerms}
              </span>
            </label>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              {t.auth.createAccount}
              <ArrowRight size={16} />
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          {t.auth.hasAccount}{' '}
          <Link href="/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
            {t.auth.signIn}
          </Link>
        </p>
      </div>
    </div>
  )
}
