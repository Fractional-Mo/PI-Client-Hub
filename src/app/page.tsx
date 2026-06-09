'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckSquare, MessageSquare, FileText, AlertCircle, Clock, TrendingUp, Plus, Loader2 } from 'lucide-react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { AppData, Client } from '@/lib/types'
import { fetchAllData, createClient } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { fmtRelative, cn } from '@/lib/utils'

const COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#64748b']

export default function Dashboard() {
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNewClient, setShowNewClient] = useState(false)

  const load = () => fetchAllData().then(setData).finally(() => setLoading(false))

  useEffect(() => {
    load()
    // Real-time: refresh when any table changes
    const channel = supabase.channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'action_items' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discussion_topics' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_notes' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  if (loading) return <AppShell><LoadingScreen /></AppShell>
  if (!data) return null

  const totalOpen = data.actionItems.filter(a => a.status !== 'done').length
  const totalDone = data.actionItems.filter(a => a.status === 'done').length
  const totalTopics = data.discussionTopics.filter(t => !t.resolved).length
  const totalNotes = data.meetingNotes.length

  const recentActivity = [
    ...data.actionItems.map(a => ({ type: 'action' as const, text: a.title, date: a.updatedAt, clientId: a.clientId })),
    ...data.meetingNotes.map(n => ({ type: 'note' as const, text: n.title, date: n.createdAt, clientId: n.clientId })),
    ...data.discussionTopics.map(t => ({ type: 'topic' as const, text: t.title, date: t.updatedAt, clientId: t.clientId })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8)

  const clientMap = Object.fromEntries(data.clients.map(c => [c.id, c]))

  return (
    <AppShell>
      <div className="px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Overview of all your personal injury clients</p>
          </div>
          <button onClick={() => setShowNewClient(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Plus size={16} /> Add Client
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard icon={<AlertCircle size={18} className="text-amber-500" />} label="Open Actions" value={totalOpen} sub="items to complete" color="amber" />
          <StatCard icon={<CheckSquare size={18} className="text-emerald-500" />} label="Completed" value={totalDone} sub="action items" color="emerald" />
          <StatCard icon={<MessageSquare size={18} className="text-blue-500" />} label="Open Topics" value={totalTopics} sub="to discuss" color="blue" />
          <StatCard icon={<FileText size={18} className="text-indigo-500" />} label="Meeting Notes" value={totalNotes} sub="total notes" color="indigo" />
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-500" />
              Clients ({data.clients.length})
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {data.clients.map(c => <ClientCard key={c.id} client={c} data={data} />)}
              <button onClick={() => setShowNewClient(true)} className="border-2 border-dashed border-slate-200 rounded-xl p-5 flex items-center justify-center gap-2 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors text-sm font-medium">
                <Plus size={16} /> Add Client
              </button>
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              Recent Activity
            </h2>
            <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">
              {recentActivity.length === 0 && (
                <p className="px-4 py-8 text-sm text-slate-400 text-center">No activity yet.<br />Open a client to get started.</p>
              )}
              {recentActivity.map((a, i) => {
                const client = clientMap[a.clientId]
                return (
                  <Link key={i} href={`/clients/${a.clientId}`} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <span className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0" style={{ background: client?.color ?? '#94a3b8' }} />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">{client?.shortName}</p>
                      <p className="text-sm text-slate-700 truncate">{a.text}</p>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0 ml-auto">{fmtRelative(a.date)}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <NewClientModal open={showNewClient} onClose={() => setShowNewClient(false)} onSave={async (c) => {
        await createClient(c)
        await load()
        setShowNewClient(false)
      }} />
    </AppShell>
  )
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
        <p className="text-sm">Loading...</p>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: number; sub: string; color: string }) {
  const bg = { amber: 'bg-amber-50', emerald: 'bg-emerald-50', blue: 'bg-blue-50', indigo: 'bg-indigo-50' }[color]
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', bg)}>{icon}</div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  )
}

function ClientCard({ client, data }: { client: Client; data: AppData }) {
  const actions = data.actionItems.filter(a => a.clientId === client.id)
  const open = actions.filter(a => a.status !== 'done').length
  const topics = data.discussionTopics.filter(t => t.clientId === client.id && !t.resolved).length
  const notes = data.meetingNotes.filter(n => n.clientId === client.id).length
  const highPriority = actions.filter(a => a.priority === 'high' && a.status !== 'done').length

  return (
    <Link href={`/clients/${client.id}`} className="bg-white rounded-xl border border-slate-100 p-5 hover:border-slate-300 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full" style={{ background: client.color }} />
          <h3 className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">{client.name}</h3>
        </div>
        {highPriority > 0 && (
          <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{highPriority} urgent</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label="Actions" value={open} active={open > 0} />
        <Metric label="Topics" value={topics} active={topics > 0} />
        <Metric label="Notes" value={notes} active={false} />
      </div>
    </Link>
  )
}

function Metric({ label, value, active }: { label: string; value: number; active: boolean }) {
  return (
    <div className={cn('rounded-lg py-1.5', active ? 'bg-slate-50' : '')}>
      <p className={cn('text-lg font-bold leading-tight', active ? 'text-slate-900' : 'text-slate-300')}>{value}</p>
      <p className="text-[10px] text-slate-400">{label}</p>
    </div>
  )
}

function NewClientModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (c: Omit<Client, 'id' | 'createdAt'>) => Promise<void> }) {
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), shortName: shortName.trim() || name.trim().split(' ')[0], color })
    setName(''); setShortName(''); setColor(COLORS[0]); setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Add New Client" size="sm">
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Firm Name *</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="e.g. Smith & Associates" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Short Name <span className="font-normal text-slate-400">(shown in sidebar)</span></label>
          <input value={shortName} onChange={e => setShortName(e.target.value)} placeholder={name.split(' ')[0] || 'e.g. Smith'} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} className={cn('w-7 h-7 rounded-full transition-transform', color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110')} style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={13} className="animate-spin" />} Add Client
          </button>
        </div>
      </div>
    </Modal>
  )
}
