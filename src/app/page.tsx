'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckSquare, MessageSquare, FileText, AlertCircle, Clock, Plus, Loader2, ArrowUpRight } from 'lucide-react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import { AppData, Client } from '@/lib/types'
import { fetchAllData, createClient } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { fmtRelative, cn } from '@/lib/utils'

const COLORS = ['#F97316','#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#64748b']

export default function Dashboard() {
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNewClient, setShowNewClient] = useState(false)

  const load = () => fetchAllData().then(setData).finally(() => setLoading(false))

  useEffect(() => {
    load()
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
      {/* Hero header */}
      <div className="px-8 pt-8 pb-6">
        <div className="rounded-2xl px-8 py-7 flex items-center justify-between mb-8" style={{ background: 'linear-gradient(135deg, #0B1829 0%, #1a2f4a 100%)' }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#FBBF24' }}>Fractional Mo</p>
            <h1 className="text-2xl font-bold text-white leading-tight">Personal Injury Client Hub</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {data.clients.length} clients · {totalOpen} open actions · {totalNotes} meeting notes
            </p>
          </div>
          <button
            onClick={() => setShowNewClient(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #F97316, #FBBF24)' }}
          >
            <Plus size={15} /> Add Client
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard icon={<AlertCircle size={17} />} label="Open Actions" value={totalOpen} sub="need attention" accent="#F97316" light="#FFF7ED" />
          <StatCard icon={<CheckSquare size={17} />} label="Completed" value={totalDone} sub="action items" accent="#10b981" light="#ECFDF5" />
          <StatCard icon={<MessageSquare size={17} />} label="Open Topics" value={totalTopics} sub="to discuss" accent="#6366f1" light="#EEF2FF" />
          <StatCard icon={<FileText size={17} />} label="Meeting Notes" value={totalNotes} sub="total notes" accent="#0ea5e9" light="#F0F9FF" />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 text-sm">Clients <span className="text-slate-400 font-normal">({data.clients.length})</span></h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {data.clients.map(c => <ClientCard key={c.id} client={c} data={data} />)}
              <button onClick={() => setShowNewClient(true)} className="border-2 border-dashed border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-orange-300 hover:text-orange-500 transition-all text-sm font-medium hover:bg-orange-50/50">
                <div className="w-9 h-9 rounded-full border-2 border-dashed border-current flex items-center justify-center">
                  <Plus size={16} />
                </div>
                Add Client
              </button>
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <Clock size={14} className="text-slate-400" /> Recent Activity
            </h2>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {recentActivity.length === 0 && (
                <p className="px-4 py-8 text-sm text-slate-400 text-center">No activity yet.<br />Open a client to get started.</p>
              )}
              {recentActivity.map((a, i) => {
                const client = clientMap[a.clientId]
                const typeIcon = a.type === 'action' ? '✓' : a.type === 'note' ? '📝' : '💬'
                return (
                  <Link key={i} href={`/clients/${a.clientId}`} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                    <span className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: client?.color ?? '#94a3b8' }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-slate-400 mb-0.5">{client?.shortName}</p>
                      <p className="text-xs text-slate-700 truncate leading-snug">{a.text}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">{fmtRelative(a.date)}</span>
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
        <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
        <p className="text-sm">Loading...</p>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, accent, light }: { icon: React.ReactNode; label: string; value: number; sub: string; accent: string; light: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: light, color: accent }}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm font-semibold text-slate-700 mt-0.5">{label}</p>
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
    <Link href={`/clients/${client.id}`} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition-all group shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ background: client.color }} />
          <h3 className="font-semibold text-sm text-slate-900 leading-tight">{client.name}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {highPriority > 0 && (
            <span className="text-[10px] font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100">{highPriority} urgent</span>
          )}
          <ArrowUpRight size={14} className="text-slate-300 group-hover:text-orange-400 transition-colors" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MetricBox label="Actions" value={open} color={open > 0 ? '#F97316' : undefined} />
        <MetricBox label="Topics" value={topics} color={topics > 0 ? '#6366f1' : undefined} />
        <MetricBox label="Notes" value={notes} color={notes > 0 ? '#0ea5e9' : undefined} />
      </div>
    </Link>
  )
}

function MetricBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl py-2 px-1 text-center" style={{ background: color ? `${color}12` : '#f8fafc' }}>
      <p className="text-lg font-bold leading-tight" style={{ color: value > 0 && color ? color : '#cbd5e1' }}>{value}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
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
          <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="e.g. Smith & Associates" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Short Name <span className="font-normal text-slate-400">(shown in sidebar)</span></label>
          <input value={shortName} onChange={e => setShortName(e.target.value)} placeholder={name.split(' ')[0] || 'e.g. Smith'} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
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
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-5 py-2 text-sm text-white rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2 transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #F97316, #FBBF24)' }}>
            {saving && <Loader2 size={13} className="animate-spin" />} Add Client
          </button>
        </div>
      </div>
    </Modal>
  )
}
