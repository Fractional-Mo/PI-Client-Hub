'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Plus, CheckSquare, MessageSquare, FileText, ChevronDown, Trash2, Check, Edit3, Mic2, Calendar, Loader2 } from 'lucide-react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import Badge from '@/components/Badge'
import { ActionItem, DiscussionTopic, MeetingNote, Priority, Status, Client } from '@/lib/types'
import {
  fetchClients, fetchActionItems, fetchTopics, fetchNotes,
  createActionItem, patchActionItem, removeActionItem,
  createTopic, patchTopic, removeTopic,
  createNote, removeNote,
} from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { cn, priorityColor, statusColor, fmtDate, fmtRelative, extractActionItems, extractTopics } from '@/lib/utils'

type Tab = 'actions' | 'topics' | 'notes'

interface PageData {
  client: Client
  actions: ActionItem[]
  topics: DiscussionTopic[]
  notes: MeetingNote[]
}

export default function ClientPage() {
  const { id } = useParams<{ id: string }>()
  const [pd, setPd] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('actions')
  const [showNewAction, setShowNewAction] = useState(false)
  const [showNewTopic, setShowNewTopic] = useState(false)
  const [showNewNote, setShowNewNote] = useState(false)
  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [clients, actions, topics, notes] = await Promise.all([
      fetchClients(), fetchActionItems(id), fetchTopics(id), fetchNotes(id),
    ])
    const client = clients.find(c => c.id === id)
    if (client) setPd({ client, actions, topics, notes })
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
    const channel = supabase.channel(`client-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'action_items', filter: `client_id=eq.${id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discussion_topics', filter: `client_id=eq.${id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_notes', filter: `client_id=eq.${id}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, load])

  if (loading) return <AppShell><LoadingScreen /></AppShell>
  if (!pd) return <AppShell><div className="p-8 text-red-500">Client not found.</div></AppShell>

  const { client, actions, topics, notes } = pd

  const sortedActions = [...actions].sort((a, b) => {
    const prio = { high: 0, medium: 1, low: 2 }
    const sp = { open: 0, in_progress: 1, done: 2 }
    return (sp[a.status] - sp[b.status]) || (prio[a.priority] - prio[b.priority])
  })
  const sortedTopics = [...topics].sort((a, b) => (a.resolved ? 1 : 0) - (b.resolved ? 1 : 0))
  const openActions = actions.filter(a => a.status !== 'done').length

  return (
    <AppShell>
      <div className="px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full" style={{ background: client.color }} />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
              {client.contactName && <p className="text-sm text-slate-500">Contact: {client.contactName}</p>}
            </div>
          </div>
          <div>
            {tab === 'actions' && <AddBtn label="Add Action Item" onClick={() => setShowNewAction(true)} />}
            {tab === 'topics' && <AddBtn label="Add Topic" onClick={() => setShowNewTopic(true)} />}
            {tab === 'notes' && <AddBtn label="Add Meeting Note" onClick={() => setShowNewNote(true)} />}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
          <TabBtn label="Action Items" icon={<CheckSquare size={14} />} count={openActions} active={tab === 'actions'} onClick={() => setTab('actions')} />
          <TabBtn label="Discussion Topics" icon={<MessageSquare size={14} />} count={topics.filter(t => !t.resolved).length} active={tab === 'topics'} onClick={() => setTab('topics')} />
          <TabBtn label="Meeting Notes" icon={<FileText size={14} />} count={notes.length} active={tab === 'notes'} onClick={() => setTab('notes')} />
        </div>

        {tab === 'actions' && (
          <div className="space-y-2">
            {sortedActions.length === 0 && <EmptyState icon={<CheckSquare size={32} className="text-slate-300" />} label="No action items yet" sub="Click 'Add Action Item' to create one" />}
            {sortedActions.map(a => (
              <ActionItemRow key={a.id} item={a}
                onUpdate={async (patch) => { await patchActionItem(a.id, patch); load() }}
                onDelete={async () => { await removeActionItem(a.id); load() }} />
            ))}
          </div>
        )}

        {tab === 'topics' && (
          <div className="space-y-2">
            {sortedTopics.length === 0 && <EmptyState icon={<MessageSquare size={32} className="text-slate-300" />} label="No discussion topics yet" sub="Click 'Add Topic' to create one" />}
            {sortedTopics.map(t => (
              <TopicRow key={t.id} topic={t}
                onUpdate={async (patch) => { await patchTopic(t.id, patch); load() }}
                onDelete={async () => { await removeTopic(t.id); load() }} />
            ))}
          </div>
        )}

        {tab === 'notes' && (
          <div className="space-y-4">
            {notes.length === 0 && <EmptyState icon={<FileText size={32} className="text-slate-300" />} label="No meeting notes yet" sub="Click 'Add Meeting Note' or sync from Otter.ai" />}
            {notes.map(n => (
              <NoteCard key={n.id} note={n}
                expanded={expandedNote === n.id}
                onToggle={() => setExpandedNote(expandedNote === n.id ? null : n.id)}
                onDelete={async () => { await removeNote(n.id); load() }}
                onImportActions={async (items) => {
                  await Promise.all(items.map(title => createActionItem({ clientId: id, title, priority: 'medium', status: 'open', sourceNoteId: n.id })))
                  load(); setTab('actions')
                }}
                onImportTopics={async (items) => {
                  await Promise.all(items.map(title => createTopic({ clientId: id, title, resolved: false, sourceNoteId: n.id })))
                  load(); setTab('topics')
                }} />
            ))}
          </div>
        )}
      </div>

      <NewActionModal open={showNewAction} onClose={() => setShowNewAction(false)} onSave={async (item) => { await createActionItem({ ...item, clientId: id }); load(); setShowNewAction(false) }} />
      <NewTopicModal open={showNewTopic} onClose={() => setShowNewTopic(false)} onSave={async (topic) => { await createTopic({ ...topic, clientId: id }); load(); setShowNewTopic(false) }} />
      <NewNoteModal open={showNewNote} onClose={() => setShowNewNote(false)} onSave={async (note) => { await createNote({ ...note, clientId: id }); load(); setShowNewNote(false) }} />
    </AppShell>
  )
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 size={28} className="animate-spin text-indigo-400" />
    </div>
  )
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
      <Plus size={16} /> {label}
    </button>
  )
}

function TabBtn({ label, icon, count, active, onClick }: { label: string; icon: React.ReactNode; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors', active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
      {icon} {label}
      {count > 0 && <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-semibold', active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600')}>{count}</span>}
    </button>
  )
}

function ActionItemRow({ item, onUpdate, onDelete }: { item: ActionItem; onUpdate: (p: Partial<ActionItem>) => Promise<void>; onDelete: () => Promise<void> }) {
  const done = item.status === 'done'
  return (
    <div className={cn('bg-white rounded-xl border px-5 py-4 flex items-start gap-4 group transition-colors', done ? 'border-slate-100 opacity-60' : 'border-slate-200 hover:border-slate-300')}>
      <button onClick={() => onUpdate({ status: done ? 'open' : 'done' })} className={cn('mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors', done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-indigo-400')}>
        {done && <Check size={12} className="text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium text-slate-900', done && 'line-through text-slate-400')}>{item.title}</p>
        {item.description && <p className="text-sm text-slate-500 mt-0.5">{item.description}</p>}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge label={item.priority} className={priorityColor(item.priority)} />
          <StatusSelect value={item.status} onChange={(s) => onUpdate({ status: s })} />
          {item.dueDate && (
            <span className={cn('text-xs flex items-center gap-1', new Date(item.dueDate) < new Date() && !done ? 'text-red-600 font-medium' : 'text-slate-400')}>
              <Calendar size={11} /> {fmtDate(item.dueDate)}
            </span>
          )}
        </div>
      </div>
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all ml-2 flex-shrink-0">
        <Trash2 size={15} />
      </button>
    </div>
  )
}

function StatusSelect({ value, onChange }: { value: Status; onChange: (s: Status) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as Status)} className={cn('text-xs font-medium rounded-full px-2 py-0.5 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300', statusColor(value))}>
      <option value="open">Open</option>
      <option value="in_progress">In Progress</option>
      <option value="done">Done</option>
    </select>
  )
}

function TopicRow({ topic, onUpdate, onDelete }: { topic: DiscussionTopic; onUpdate: (p: Partial<DiscussionTopic>) => Promise<void>; onDelete: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(topic.body ?? '')
  const save = async () => { await onUpdate({ body }); setEditing(false) }

  return (
    <div className={cn('bg-white rounded-xl border px-5 py-4 group transition-colors', topic.resolved ? 'border-slate-100 opacity-60' : 'border-slate-200 hover:border-slate-300')}>
      <div className="flex items-start gap-3">
        <button onClick={() => onUpdate({ resolved: !topic.resolved })} className={cn('mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors', topic.resolved ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400')}>
          {topic.resolved && <Check size={12} className="text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium text-slate-900', topic.resolved && 'line-through text-slate-400')}>{topic.title}</p>
          {editing ? (
            <div className="mt-2">
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} className="w-full text-sm border border-slate-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Add notes..." />
              <div className="flex gap-2 mt-2">
                <button onClick={save} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">Save</button>
                <button onClick={() => setEditing(false)} className="text-xs text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-100">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {topic.body && <p className="text-sm text-slate-500 mt-1">{topic.body}</p>}
              <p className="text-xs text-slate-400 mt-1.5">{fmtRelative(topic.updatedAt)}</p>
            </>
          )}
        </div>
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={() => setEditing(true)} className="text-slate-300 hover:text-indigo-500"><Edit3 size={14} /></button>
          <button onClick={onDelete} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  )
}

function NoteCard({ note, expanded, onToggle, onDelete, onImportActions, onImportTopics }: {
  note: MeetingNote; expanded: boolean; onToggle: () => void; onDelete: () => Promise<void>
  onImportActions: (items: string[]) => Promise<void>; onImportTopics: (items: string[]) => Promise<void>
}) {
  const extracted = extractActionItems(note.content)
  const extTopics = extractTopics(note.content)

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-3">
          {note.source === 'otter' ? <Mic2 size={16} className="text-indigo-500" /> : <FileText size={16} className="text-slate-400" />}
          <div>
            <p className="font-medium text-slate-900">{note.title}</p>
            <p className="text-xs text-slate-400">{fmtDate(note.meetingDate)} · {note.source === 'otter' ? 'Otter.ai' : 'Manual'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {extracted.length > 0 && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{extracted.length} actions detected</span>}
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
          <ChevronDown size={16} className={cn('text-slate-400 transition-transform', expanded && 'rotate-180')} />
        </div>
      </div>
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4">
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{note.content}</pre>
          {(extracted.length > 0 || extTopics.length > 0) && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
              {extracted.length > 0 && (
                <button onClick={() => onImportActions(extracted)} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 font-medium transition-colors">
                  + Import {extracted.length} action item{extracted.length > 1 ? 's' : ''}
                </button>
              )}
              {extTopics.length > 0 && (
                <button onClick={() => onImportTopics(extTopics)} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium transition-colors">
                  + Import {extTopics.length} topic{extTopics.length > 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4">{icon}</div>
      <p className="font-medium text-slate-500">{label}</p>
      <p className="text-sm text-slate-400 mt-1">{sub}</p>
    </div>
  )
}

function NewActionModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (item: Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt' | 'clientId'>) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!title.trim()) return
    setSaving(true)
    await onSave({ title, description: description || undefined, priority, status: 'open', dueDate: dueDate || undefined })
    setTitle(''); setDescription(''); setPriority('medium'); setDueDate(''); setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="New Action Item">
      <div className="p-6 space-y-4">
        <Field label="Title *"><input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="What needs to be done?" className={inputCls} /></Field>
        <Field label="Description"><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional details..." rows={2} className={inputCls + ' resize-none'} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Priority">
            <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className={inputCls}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </Field>
          <Field label="Due Date"><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={13} className="animate-spin" />} Add Action Item
          </button>
        </div>
      </div>
    </Modal>
  )
}

function NewTopicModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (t: Omit<DiscussionTopic, 'id' | 'createdAt' | 'updatedAt' | 'clientId'>) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!title.trim()) return
    setSaving(true)
    await onSave({ title, body: body || undefined, resolved: false })
    setTitle(''); setBody(''); setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="New Discussion Topic">
      <div className="p-6 space-y-4">
        <Field label="Topic *"><input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="What needs to be discussed?" className={inputCls} /></Field>
        <Field label="Notes"><textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Optional background or context..." rows={3} className={inputCls + ' resize-none'} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={13} className="animate-spin" />} Add Topic
          </button>
        </div>
      </div>
    </Modal>
  )
}

function NewNoteModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (n: Omit<MeetingNote, 'id' | 'createdAt' | 'clientId'>) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [extracted, setExtracted] = useState<{ actionItems: string[]; topics: string[] } | null>(null)

  const extract = () => {
    if (!content.trim()) return
    const actionItems = extractActionItems(content)
    const topics = extractTopics(content)
    setExtracted({ actionItems, topics })
  }

  const submit = async () => {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    await onSave({ title, content, source: 'manual', meetingDate, extractedActionItems: extracted?.actionItems ?? extractActionItems(content), extractedTopics: extracted?.topics ?? extractTopics(content) })
    setTitle(''); setContent(''); setMeetingDate(new Date().toISOString().split('T')[0]); setExtracted(null); setSaving(false)
  }

  const reset = () => { setTitle(''); setContent(''); setExtracted(null); onClose() }

  return (
    <Modal open={open} onClose={reset} title="Add Meeting Note" size="lg">
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Title *"><input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Meeting name or summary" className={inputCls} /></Field>
          <Field label="Meeting Date"><input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Notes / Transcript *">
          <textarea value={content} onChange={e => { setContent(e.target.value); setExtracted(null) }} placeholder={"Paste your full Otter.ai transcript here and click 'Extract with AI' — Claude will automatically pull out action items and topics."} rows={10} className={inputCls + ' resize-none font-mono text-xs'} />
        </Field>

        {/* AI Extract button */}
        {content.trim() && !extracted && (
          <button onClick={extract} className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">
            ✨ Extract Action Items & Topics
          </button>
        )}

        {/* Extracted preview */}
        {extracted && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">✨ AI Extracted — will be imported after saving</p>
            {extracted.actionItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-1.5">Action Items ({extracted.actionItems.length})</p>
                <ul className="space-y-1">
                  {extracted.actionItems.map((a, i) => <li key={i} className="text-xs text-slate-700 flex gap-2"><span className="text-amber-500 flex-shrink-0">•</span>{a}</li>)}
                </ul>
              </div>
            )}
            {extracted.topics.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-blue-700 mb-1.5">Discussion Topics ({extracted.topics.length})</p>
                <ul className="space-y-1">
                  {extracted.topics.map((t, i) => <li key={i} className="text-xs text-slate-700 flex gap-2"><span className="text-blue-500 flex-shrink-0">•</span>{t}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={reset} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={13} className="animate-spin" />} Save Note
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>{children}</div>
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white'
