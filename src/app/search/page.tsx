'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, CheckSquare, MessageSquare, FileText, Users, X } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { AppData } from '@/lib/types'
import { fetchAllData } from '@/lib/db'
import { fmtDate } from '@/lib/utils'

interface Result {
  type: 'action' | 'topic' | 'note' | 'client'
  clientId: string
  clientName: string
  clientColor: string
  title: string
  sub?: string
  href: string
}

export default function SearchPage() {
  const [data, setData] = useState<AppData | null>(null)
  const [query, setQuery] = useState('')
  const router = useRouter()

  useEffect(() => { fetchAllData().then(setData) }, [])

  const search = useCallback((q: string): Result[] => {
    if (!data || q.trim().length < 2) return []
    const lower = q.toLowerCase()
    const results: Result[] = []
    const clientMap = Object.fromEntries(data.clients.map(c => [c.id, c]))

    // Search clients
    data.clients.forEach(c => {
      if (c.name.toLowerCase().includes(lower) || (c.contactName ?? '').toLowerCase().includes(lower)) {
        results.push({ type: 'client', clientId: c.id, clientName: c.name, clientColor: c.color, title: c.name, sub: c.contactName, href: `/clients/${c.id}` })
      }
    })

    // Search action items
    data.actionItems.forEach(a => {
      const client = clientMap[a.clientId]
      if (!client) return
      if (a.title.toLowerCase().includes(lower) || (a.description ?? '').toLowerCase().includes(lower)) {
        results.push({ type: 'action', clientId: a.clientId, clientName: client.name, clientColor: client.color, title: a.title, sub: `${a.priority} priority · ${a.status.replace('_', ' ')}`, href: `/clients/${a.clientId}` })
      }
    })

    // Search topics
    data.discussionTopics.forEach(t => {
      const client = clientMap[t.clientId]
      if (!client) return
      if (t.title.toLowerCase().includes(lower) || (t.body ?? '').toLowerCase().includes(lower)) {
        results.push({ type: 'topic', clientId: t.clientId, clientName: client.name, clientColor: client.color, title: t.title, sub: t.resolved ? 'Resolved' : 'Open', href: `/clients/${t.clientId}` })
      }
    })

    // Search notes
    data.meetingNotes.forEach(n => {
      const client = clientMap[n.clientId]
      if (!client) return
      if (n.title.toLowerCase().includes(lower) || n.content.toLowerCase().includes(lower)) {
        // Highlight the matching excerpt
        const idx = n.content.toLowerCase().indexOf(lower)
        const excerpt = idx >= 0 ? '...' + n.content.slice(Math.max(0, idx - 30), idx + 80) + '...' : fmtDate(n.meetingDate)
        results.push({ type: 'note', clientId: n.clientId, clientName: client.name, clientColor: client.color, title: n.title, sub: excerpt, href: `/clients/${n.clientId}` })
      }
    })

    return results.slice(0, 30)
  }, [data])

  const results = search(query)

  const grouped = {
    client: results.filter(r => r.type === 'client'),
    action: results.filter(r => r.type === 'action'),
    topic: results.filter(r => r.type === 'topic'),
    note: results.filter(r => r.type === 'note'),
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Search</h1>
          <p className="text-slate-500 text-sm">Search across all clients, action items, topics, and notes</p>
        </div>

        {/* Search input */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search anything..."
            className="w-full pl-11 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </div>

        {/* No query state */}
        {!query && (
          <div className="text-center py-20 text-slate-400">
            <Search size={36} className="mx-auto mb-3 text-slate-200" />
            <p className="font-medium text-slate-400">Start typing to search</p>
            <p className="text-xs mt-1">Searches clients, action items, topics, and meeting notes</p>
          </div>
        )}

        {/* No results */}
        {query.length >= 2 && results.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <p className="font-medium">No results for &quot;{query}&quot;</p>
            <p className="text-xs mt-1">Try a different keyword</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-6">
            {grouped.client.length > 0 && (
              <ResultGroup label="Clients" icon={<Users size={14} />} results={grouped.client} query={query} onNavigate={(href) => router.push(href)} />
            )}
            {grouped.action.length > 0 && (
              <ResultGroup label="Action Items" icon={<CheckSquare size={14} />} results={grouped.action} query={query} onNavigate={(href) => router.push(href)} />
            )}
            {grouped.topic.length > 0 && (
              <ResultGroup label="Discussion Topics" icon={<MessageSquare size={14} />} results={grouped.topic} query={query} onNavigate={(href) => router.push(href)} />
            )}
            {grouped.note.length > 0 && (
              <ResultGroup label="Meeting Notes" icon={<FileText size={14} />} results={grouped.note} query={query} onNavigate={(href) => router.push(href)} />
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function ResultGroup({ label, icon, results, query, onNavigate }: {
  label: string; icon: React.ReactNode; results: Result[]; query: string; onNavigate: (href: string) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {icon} {label} <span className="text-slate-400 font-normal normal-case">({results.length})</span>
      </div>
      <div className="space-y-1">
        {results.map((r, i) => (
          <button key={i} onClick={() => onNavigate(r.href)} className="w-full text-left bg-white border border-slate-100 rounded-xl px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group">
            <div className="flex items-start gap-3">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: r.clientColor }} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400 mb-0.5">{r.clientName}</p>
                <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-700 transition-colors">
                  <Highlight text={r.title} query={query} />
                </p>
                {r.sub && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2"><Highlight text={r.sub} query={query} /></p>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}
