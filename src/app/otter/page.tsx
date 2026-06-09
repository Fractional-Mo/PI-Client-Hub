'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { Mic2, RefreshCw, Key, CheckCircle, AlertCircle, ChevronRight, Loader2 } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { Client } from '@/lib/types'
import { fetchClients, createNote } from '@/lib/db'
import { fmtDate } from '@/lib/utils'

interface OtterMeeting {
  id: string
  title: string
  created_at: number
  summary?: string
  transcript?: string
}

export default function OtterPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [apiKey, setApiKey] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [meetings, setMeetings] = useState<OtterMeeting[]>([])
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [keywords, setKeywords] = useState<Record<string, string>>({})
  const [lastSync, setLastSync] = useState('')

  useEffect(() => {
    fetchClients().then(setClients)
    const savedKey = localStorage.getItem('otter_api_key') ?? ''
    const savedKw = JSON.parse(localStorage.getItem('otter_keywords') ?? '{}')
    const savedSync = localStorage.getItem('otter_last_sync') ?? ''
    setApiKey(savedKey)
    setKeywords(savedKw)
    setLastSync(savedSync)
  }, [])

  const saveSettings = () => {
    localStorage.setItem('otter_api_key', apiKey)
    localStorage.setItem('otter_keywords', JSON.stringify(keywords))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const sync = async () => {
    if (!apiKey) { setError('Please save your API key first.'); return }
    setSyncing(true); setError('')
    try {
      // Call our server-side proxy to avoid CORS issues
      const res = await fetch('/api/otter', {
        headers: { 'x-otter-key': apiKey }
      })
      const json = await res.json()
      if (!res.ok) throw new Error(JSON.stringify(json.error ?? 'Unknown error'))
      const fetched: OtterMeeting[] = (json.speeches ?? json.data ?? []).map((s: Record<string, unknown>) => ({
        id: String(s.otid ?? s.id ?? ''),
        title: String(s.title ?? 'Untitled Meeting'),
        created_at: typeof s.created_at === 'number' ? s.created_at : Date.now() / 1000,
        summary: String(s.summary ?? ''),
        transcript: String(s.transcript ?? ''),
      }))
      setMeetings(fetched)
      const now = new Date().toISOString()
      setLastSync(now)
      localStorage.setItem('otter_last_sync', now)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSyncing(false)
    }
  }

  const importMeeting = async (meeting: OtterMeeting, clientId: string) => {
    const content = meeting.transcript || meeting.summary || '(No content)'
    await createNote({
      clientId,
      title: meeting.title,
      content,
      source: 'otter',
      otterMeetingId: meeting.id,
      meetingDate: new Date(meeting.created_at * 1000).toISOString().split('T')[0],
    })
    setMeetings(prev => prev.filter(m => m.id !== meeting.id))
  }

  const matchClient = (meeting: OtterMeeting): Client | undefined => {
    const lower = (meeting.title + ' ' + meeting.summary).toLowerCase()
    for (const client of clients) {
      const kws: string[] = (keywords[client.id] ?? '').split(',').map(s => s.trim()).filter(Boolean)
      if (kws.some(k => lower.includes(k.toLowerCase()))) return client
    }
    return undefined
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Mic2 size={22} className="text-indigo-500" />
            <h1 className="text-2xl font-bold text-slate-900">Otter.ai Sync</h1>
          </div>
          <p className="text-slate-500 text-sm">Pull meeting transcripts from Otter.ai and assign them to clients.</p>
        </div>

        {/* API Key section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Key size={16} className="text-slate-500" />
            <h2 className="font-semibold text-slate-800">API Configuration</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Otter.ai API Key</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="your-otter-api-key" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <p className="text-xs text-slate-400 mt-1.5">Find your API key at <span className="font-mono text-indigo-600">otter.ai → Settings → API</span>. Requires Otter Business plan.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Client Keywords (auto-matching)</label>
              <p className="text-xs text-slate-400 mb-3">When a meeting title contains these words, it auto-assigns to that client.</p>
              <div className="space-y-2">
                {clients.map(c => (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-36 flex-shrink-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                      <span className="text-xs font-medium text-slate-700 truncate">{c.shortName}</span>
                    </div>
                    <input value={keywords[c.id] ?? ''} onChange={e => setKeywords(prev => ({ ...prev, [c.id]: e.target.value }))} placeholder={`e.g. ${c.shortName.toLowerCase()}`} className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={saveSettings} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                Save Settings
              </button>
              {saved && <span className="text-sm text-emerald-600 flex items-center gap-1"><CheckCircle size={14} /> Saved!</span>}
            </div>
          </div>
        </div>

        {/* Sync section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-800">Recent Meetings</h2>
              {lastSync && <p className="text-xs text-slate-400 mt-0.5">Last synced {fmtDate(lastSync)}</p>}
            </div>
            <button onClick={sync} disabled={syncing} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors">
              {syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Sync failed</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {meetings.length === 0 && !syncing && !error && (
            <div className="text-center py-12 text-slate-400">
              <Mic2 size={32} className="mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-400">No meetings fetched yet</p>
              <p className="text-xs mt-1">Click &quot;Sync Now&quot; to pull your recent Otter.ai meetings</p>
            </div>
          )}

          <div className="space-y-2">
            {meetings.map(meeting => {
              const matched = matchClient(meeting)
              return (
                <div key={meeting.id} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">{meeting.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{fmtDate(new Date(meeting.created_at * 1000).toISOString())}</p>
                      {meeting.summary && <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{meeting.summary}</p>}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {matched && (
                        <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: matched.color + '20', color: matched.color }}>
                          → {matched.shortName}
                        </span>
                      )}
                      <ImportSelect clients={clients} defaultClientId={matched?.id} onImport={(clientId) => importMeeting(meeting, clientId)} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function ImportSelect({ clients, defaultClientId, onImport }: { clients: Client[]; defaultClientId?: string; onImport: (id: string) => void }) {
  const [clientId, setClientId] = useState(defaultClientId ?? clients[0]?.id ?? '')
  return (
    <div className="flex items-center gap-1">
      <select value={clientId} onChange={e => setClientId(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button onClick={() => onImport(clientId)} className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-medium transition-colors">
        Import <ChevronRight size={12} />
      </button>
    </div>
  )
}
