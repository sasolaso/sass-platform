'use client'

import React, { useState } from 'react'
import { Bot, Plus, Trash2, MessageSquare, Settings, History, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Toggle } from '@/components/ui/toggle'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'

const SAMPLE_RULES = [
  { id: '1', name: 'Pricing Inquiry', keywords: ['price', 'cost', 'how much', 'pricing'], reply: 'Thanks for asking! Check out our pricing at socialai.com/pricing or DM us for a custom quote.', active: true, triggers: 142 },
  { id: '2', name: 'Positive Feedback', keywords: ['love', 'amazing', 'great', 'awesome', 'perfect'], reply: 'Thank you so much! Your support means the world to us! We work hard to deliver the best.', active: true, triggers: 89 },
  { id: '3', name: 'Support Request', keywords: ['help', 'issue', 'problem', 'not working', 'broken'], reply: "We're sorry to hear that! Please DM us directly and our support team will help right away.", active: false, triggers: 34 },
]

const RECENT_REPLIES = [
  { user: '@john_doe', comment: 'How much does it cost?', reply: 'Thanks for asking! Check out our pricing...', platform: 'instagram', time: '2 min ago', ai: false },
  { user: '@sarah_smith', comment: 'This is amazing! Love it!', reply: 'Thank you so much! Your support means...', platform: 'facebook', time: '15 min ago', ai: false },
  { user: '@user123', comment: 'Having an issue with my account', reply: "We're sorry! Please DM us directly...", platform: 'twitter', time: '1 hour ago', ai: true },
]

type Tab = 'settings' | 'rules' | 'logs'

export default function BotPage() {
  const [botEnabled, setBotEnabled] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [rules, setRules] = useState(SAMPLE_RULES)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('settings')
  const [newRule, setNewRule] = useState({ name: '', keywords: '', reply: '' })

  const addRule = () => {
    if (!newRule.name || !newRule.keywords || !newRule.reply) { toast.error('Fill in all fields'); return }
    setRules([...rules, {
      id: Date.now().toString(),
      name: newRule.name,
      keywords: newRule.keywords.split(',').map(k => k.trim()),
      reply: newRule.reply,
      active: true,
      triggers: 0,
    }])
    setNewRule({ name: '', keywords: '', reply: '' })
    setShowModal(false)
    toast.success('Reply rule added!')
  }

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }

  const deleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id))
    toast.success('Rule deleted')
  }

  const tabs = [
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
    { id: 'rules' as Tab, label: 'Reply Rules', icon: MessageSquare },
    { id: 'logs' as Tab, label: 'Reply Logs', icon: History },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Auto-Reply Bot</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Automatically reply to comments and messages.</p>
        </div>
        <div className={cn('flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors', botEnabled ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20' : 'border-gray-200 dark:border-gray-800')}>
          <Bot size={16} className={botEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
          <span className={cn('text-sm font-medium', botEnabled ? 'text-green-700 dark:text-green-400' : 'text-gray-500')}>
            {botEnabled ? 'Bot Active' : 'Bot Inactive'}
          </span>
          <Toggle checked={botEnabled} onChange={v => { setBotEnabled(v); toast.success(v ? 'Bot enabled!' : 'Bot disabled') }} size="sm" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Bot Configuration</h3>
            <div className="space-y-4">
              <Toggle
                checked={botEnabled}
                onChange={v => { setBotEnabled(v); toast.success(v ? 'Bot enabled!' : 'Bot disabled') }}
                label="Auto-Reply Bot"
                description="Automatically reply to comments matching your rules"
              />
              <Toggle
                checked={aiEnabled}
                onChange={v => { setAiEnabled(v); toast.success(v ? 'AI replies enabled!' : 'AI replies disabled') }}
                label="AI-Powered Replies"
                description="Use GPT-4 for context-aware intelligent replies"
              />
            </div>
          </Card>
          <Card>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Statistics</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Replies Sent', value: '265', color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Active Rules', value: rules.filter(r => r.active).length.toString(), color: 'text-green-600 dark:text-green-400' },
                { label: 'Replies Today', value: '14', color: 'text-amber-600 dark:text-amber-400' },
                { label: 'AI Replies', value: '47', color: 'text-purple-600 dark:text-purple-400' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{s.label}</span>
                  <span className={cn('font-bold text-lg', s.color)}>{s.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowModal(true)}>
              <Plus size={14} />
              Add Rule
            </Button>
          </div>
          {rules.map(rule => (
            <Card key={rule.id}>
              <div className="flex items-start gap-4">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', rule.active ? 'bg-green-50 dark:bg-green-950/30' : 'bg-gray-50 dark:bg-gray-800')}>
                  <MessageSquare size={18} className={rule.active ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">{rule.name}</h4>
                    <Badge variant={rule.active ? 'success' : 'default'} size="sm">{rule.active ? 'Active' : 'Paused'}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(Array.isArray(rule.keywords) ? rule.keywords : []).map((kw: string) => (
                      <span key={kw} className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">{kw}</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{rule.reply}</p>
                  <p className="text-xs text-gray-400 mt-1.5">{rule.triggers} triggers</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Toggle checked={rule.active} onChange={() => toggleRule(rule.id)} size="sm" />
                  <button onClick={() => deleteRule(rule.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'logs' && (
        <Card>
          <CardHeader><CardTitle>Recent Bot Replies</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {RECENT_REPLIES.map((log, i) => (
                <div key={i} className="flex gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold flex-shrink-0">
                    {log.user[1].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{log.user}</span>
                      <Badge variant="info" size="sm">{log.platform}</Badge>
                      {log.ai && <Badge variant="warning" size="sm">AI</Badge>}
                      <span className="text-xs text-gray-400 ml-auto">{log.time}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">&ldquo;{log.comment}&rdquo;</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Bot: &ldquo;{log.reply}&rdquo;</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Reply Rule">
        <div className="space-y-4">
          <Input label="Rule Name" value={newRule.name} onChange={e => setNewRule({ ...newRule, name: e.target.value })} placeholder="e.g. Pricing Inquiry" />
          <Input label="Trigger Keywords (comma separated)" value={newRule.keywords} onChange={e => setNewRule({ ...newRule, keywords: e.target.value })} placeholder="price, cost, how much" />
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Reply Template</label>
            <textarea value={newRule.reply} onChange={e => setNewRule({ ...newRule, reply: e.target.value })} rows={4} placeholder="The automatic reply that will be sent..." className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={addRule}>Add Rule</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
