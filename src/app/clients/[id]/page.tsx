'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Plus, CheckSquare, MessageSquare, FileText, ChevronDown,
  Trash2, Check, Edit3, Mic2, Calendar, Loader2, Briefcase,
  ArrowUpRight, Clock, AlertCircle, MoreHorizontal,
} from 'lucide-react'
import AppShell from '@/components/AppShell'
import Modal from '@/components/Modal'
import Badge from '@/components/Badge'
import { ActionItem, DiscussionTopic, MeetingNote, Priority, Status, Client, Project, ProjectStatus } from '@/lib/types'
import {
  fetchClients, fetchActionItems, fetchTopics, fetchNotes, fetchProjects,
  createActionItem, patchActionItem, removeActionItem,
  createTopic, patchTopic, removeTopic,
  createNote, removeNote,
  createProject, patchProject, removeProject,
} from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { cn, priorityColor, statusColor, fmtDate, fmtRelative, extractActionItems, extractTopics } from '@/lib/utils'

type Tab = 'projects' | 'actions' | 'topics' | 'notes'

interface PageData {
  client: Client
  actions: ActionItem[]
  topics: DiscussionTopic[]
  notes: MeetingNote[]
  projects: Project[]
}

export default function ClientPage() {
  const { id } = useParams<{ id: string }>()
  const [pd, setPd] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('projects')
  const [showNewAction, setShowNewAction] = useState(false)
  const [showNewTopic, setShowNewTopic] = useState(false)
  const [showNewNote, setShowNewNote] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [clients, actions, topics, notes, projects] = await Promise.all([
      fetchClients(), fetchActionItems(id), fetchTopics(id), fetchNotes(id), fetchProjects(id),
    ])
    const client = clients.find(c => c.id === id)
    if (client) setPd({ client, actions, topics, notes, projects })
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
    const channel = supabase.channel(`client-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'action_items', filter: `client_id=eq.${id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discussion_topics', filter: `client_id=eq.${id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_notes', filter: `client_id=eq.${id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `client_id=eq.${id}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, load])

  if (loading) return <AppShell><LoadingScreen /></AppShell>
  if (!pd) return <AppShell><div className="p-8 text-red-500">Client not found.</div></AppShell>

  const { client, actions, topics, notes, projects } = pd

  const openActions = actions.filter(a => a.status === 'open')
  const inProgressActions = actions.filter(a => a.status === 'in_progress')
  const doneActions = actions.filter(a => a.status === 'done')
  const openTopics = topics.filter(t => !t.resolved).length
  const activeProjects = projects.filter(p => p.status === 'active').length

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: `${client.color}20` }}>
              <div className="w-5 h-5 rounded-full" style={{ background: client.color }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
              {client.contactName && <p className="text-sm text-slate-500 mt-0.5">{client.contactName}</p>}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3">
            <StatPill icon={<Briefcase size={13} />} value={activeProjects} label="active" color="#F97316" />
            <StatPill icon={<AlertCircle size={13} />} value={openActions.length + inProgressActions.length} label="open" color="#6366f1" />
            <StatPill icon={<MessageSquare size={13} />} value={openTopics} label="topics" color="#0ea5e9" />
            <StatPill icon={<FileText size={13} />} value={notes.length} label="notes" color="#10b981" />
          </div>
        </div>

        {/* Tabs + Add button row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            <TabBtn label="Projects" icon={<Briefcase size={13} />} count={activeProjects} active={tab === 'projects'} onClick={() => setTab('projects')} />
            <TabBtn label="Action Items" icon={<CheckSquare size={13} />} count={openActions.length + inProgressActions.length} active={tab === 'actions'} onClick={() => setTab('actions')} />
            <TabBtn label="Discussion Topics" icon={<MessageSquare size={13} />} count={openTopics} active={tab === 'topics'} onClick={() => setTab('topics')} />
            <TabBtn label="Meeting Notes" icon={<FileText size={13} />} count={notes.length} active={tab === 'notes'} onClick={() => setTab('notes')} />
          </div>
          <div>
            {tab === 'projects' && <AddBtn label="New Project" onClick={() => setShowNewProject(true)} />}
            {tab === 'actions' && <AddBtn label="Add Action Item" onClick={() => setShowNewAction(true)} />}
            {tab === 'topics' && <AddBtn label="Add Topic" onClick={() => setShowNewTopic(true)} />}
            {tab === 'notes' && <AddBtn label="Add Meeting Note" onClick={() => setShowNewNote(true)} />}
          </div>
        </div>

        {/* ── PROJECTS TAB ── */}
        {tab === 'projects' && (
          <div>
            {projects.length === 0 && (
              <EmptyState icon={<Briefcase size={36} />} label="No projects yet" sub="Track ongoing matters, cases, and initiatives for this client" />
            )}
            {projects.length > 0 && (
              <div className="space-y-6">
                {/* Active */}
                {projects.filter(p => p.status === 'active').length > 0 && (
                  <Section label="Active" count={projects.filter(p => p.status === 'active').length} color="#F97316">
                    <div className="grid grid-cols-2 gap-3">
                      {projects.filter(p => p.status === 'active').map(p => (
                        <ProjectCard key={p.id} project={p}
                          onUpdate={async (patch) => { await patchProject(p.id, patch); load() }}
                          onDelete={async () => { await removeProject(p.id); load() }} />
                      ))}
                    </div>
                  </Section>
                )}
                {/* On Hold */}
                {projects.filter(p => p.status === 'on_hold').length > 0 && (
                  <Section label="On Hold" count={projects.filter(p => p.status === 'on_hold').length} color="#f59e0b">
                    <div className="grid grid-cols-2 gap-3">
                      {projects.filter(p => p.status === 'on_hold').map(p => (
                        <ProjectCard key={p.id} project={p}
                          onUpdate={async (patch) => { await patchProject(p.id, patch); load() }}
                          onDelete={async () => { await removeProject(p.id); load() }} />
                      ))}
                    </div>
                  </Section>
                )}
                {/* Completed */}
                {projects.filter(p => p.status === 'completed').length > 0 && (
                  <Section label="Completed" count={projects.filter(p => p.status === 'completed').length} color="#10b981">
                    <div className="grid grid-cols-2 gap-3">
                      {projects.filter(p => p.status === 'completed').map(p => (
                        <ProjectCard key={p.id} project={p}
                          onUpdate={async (patch) => { await patchProject(p.id, patch); load() }}
                          onDelete={async () => { await removeProject(p.id); load() }} />
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ACTION ITEMS TAB ── */}
        {tab === 'actions' && (
          <div className="space-y-6">
            {actions.length === 0 && (
              <EmptyState icon={<CheckSquare size={36} />} label="No action items yet" sub="Click 'Add Action Item' to track tasks for this client" />
            )}

            {/* Open */}
            {openActions.length > 0 && (
              <Section label="Open" count={openActions.length} color="#ef4444">
                <div className="space-y-2">
                  {openActions
                    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]))
                    .map(a => (
                      <ActionItemRow key={a.id} item={a}
                        onUpdate={async (patch) => { await patchActionItem(a.id, patch); load() }}
                        onDelete={async () => { await removeActionItem(a.id); load() }} />
                    ))}
                </div>
              </Section>
            )}

            {/* In Progress */}
            {inProgressActions.length > 0 && (
              <Section label="In Progress" count={inProgressActions.length} color="#6366f1">
                <div className="space-y-2">
                  {inProgressActions
                    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]))
                    .map(a => (
                      <ActionItemRow key={a.id} item={a}
                        onUpdate={async (patch) => { await patchActionItem(a.id, patch); load() }}
                        onDelete={async () => { await removeActionItem(a.id); load() }} />
                    ))}
                </div>
              </Section>
            )}

            {/* Done — collapsible */}
            {doneActions.length > 0 && (
              <CollapsibleSection label="Completed" count={doneActions.length} color="#10b981">
                <div className="space-y-2">
                  {doneActions.map(a => (
                    <ActionItemRow key={a.id} item={a}
                      onUpdate={async (patch) => { await patchActionItem(a.id, patch); load() }}
                      onDelete={async () => { await removeActionItem(a.id); load() }} />
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </div>
        )}

        {/* ── TOPICS TAB ── */}
        {tab === 'topics' && (
          <div className="space-y-6">
            {topics.length === 0 && (
              <EmptyState icon={<MessageSquare size={36} />} label="No discussion topics yet" sub="Track questions, concerns, and agenda items here" />
            )}

            {topics.filter(t => !t.resolved).length > 0 && (
              <Section label="Open" count={topics.filter(t => !t.resolved).length} color="#0ea5e9">
                <div className="space-y-2">
                  {topics.filter(t => !t.resolved).map(t => (
                    <TopicRow key={t.id} topic={t}
                      onUpdate={async (patch) => { await patchTopic(t.id, patch); load() }}
                      onDelete={async () => { await removeTopic(t.id); load() }} />
                  ))}
                </div>
              </Section>
            )}

            {topics.filter(t => t.resolved).length > 0 && (
              <CollapsibleSection label="Resolved" count={topics.filter(t => t.resolved).length} color="#10b981">
                <div className="space-y-2">
                  {topics.filter(t => t.resolved).map(t => (
                    <TopicRow key={t.id} topic={t}
                      onUpdate={async (patch) => { await patchTopic(t.id, patch); load() }}
                      onDelete={async () => { await removeTopic(t.id); load() }} />
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </div>
        )}

        {/* ── NOTES TAB ── */}
        {tab === 'notes' && (
          <div className="space-y-4">
            {notes.length === 0 && (
              <EmptyState icon={<FileText size={36} />} label="No meeting notes yet" sub="Add a note or paste an Otter.ai transcript to get started" />
            )}
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

      <NewProjectModal open={showNewProject} onClose={() => setShowNewProject(false)} onSave={async (p) => { await createProject({ ...p, clientId: id }); load(); setShowNewProject(false) }} />
      <NewActionModal open={showNewAction} onClose={() => setShowNewAction(false)} onSave={async (item) => { await createActionItem({ ...item, clientId: id }); load(); setShowNewAction(false) }} />
      <NewTopicModal open={showNewTopic} onClose={() => setShowNewTopic(false)} onSave={async (topic) => { await createTopic({ ...topic, clientId: id }); load(); setShowNewTopic(false) }} />
      <NewNoteModal open={showNewNote} onClose={() => setShowNewNote(false)} onSave={async (note) => { await createNote({ ...note, clientId: id }); load(); setShowNewNote(false) }} />
    </AppShell>
  )
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function Section({ label, count, color, children }: { label: string; count: number; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}18`, color }}>{count}</span>
        <div className="flex-1 h-px bg-slate-100 ml-1" />
      </div>
      {children}
    </div>
  )
}

function CollapsibleSection({ label, count, color, children }: { label: string; count: number; color: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2.5 mb-3 w-full group">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-sm font-semibold text-slate-400 group-hover:text-slate-600 transition-colors">{label}</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color: color + 'aa' }}>{count}</span>
        <div className="flex-1 h-px bg-slate-100 ml-1" />
        <ChevronDown size={14} className={cn('text-slate-300 transition-transform', open && 'rotate-180')} />
      </button>
      {open && children}
    </div>
  )
}

function StatPill({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  if (value === 0) return null
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: `${color}12`, color }}>
      {icon} {value} {label}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
    </div>
  )
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-sm" style={{ background: 'linear-gradient(135deg, #F97316, #FBBF24)' }}>
      <Plus size={15} /> {label}
    </button>
  )
}

function TabBtn({ label, icon, count, active, onClick }: { label: string; icon: React.ReactNode; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all', active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
      {icon} {label}
      {count > 0 && (
        <span className={cn('text-[11px] px-1.5 py-0.5 rounded-full font-bold', active ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-500')}>
          {count}
        </span>
      )}
    </button>
  )
}

// ── Project Card ─────────────────────────────────────────────────────────────

const projectStatusConfig: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',    color: '#F97316', bg: '#FFF7ED' },
  on_hold:   { label: 'On Hold',   color: '#f59e0b', bg: '#FFFBEB' },
  completed: { label: 'Completed', color: '#10b981', bg: '#ECFDF5' },
}

function ProjectCard({ project, onUpdate, onDelete }: { project: Project; onUpdate: (p: Partial<Project>) => Promise<void>; onDelete: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(project.title)
  const [desc, setDesc] = useState(project.description ?? '')
  const cfg = projectStatusConfig[project.status]

  const save = async () => { await onUpdate({ title, description: desc || undefined }); setEditing(false) }

  return (
    <div className={cn('bg-white rounded-2xl border p-5 group transition-all hover:shadow-md', project.status === 'completed' ? 'border-slate-100 opacity-70' : 'border-slate-200')}>
      <div className="flex items-start justify-between mb-3">
        {editing ? (
          <input value={title} onChange={e => setTitle(e.target.value)} className="font-semibold text-slate-900 text-sm w-full border-b border-indigo-300 focus:outline-none pb-0.5 bg-transparent" />
        ) : (
          <h3 className={cn('font-semibold text-sm text-slate-900 leading-snug', project.status === 'completed' && 'line-through text-slate-400')}>{project.title}</h3>
        )}
        <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
          <div className="opacity-0 group-hover:opacity-100 transition-all flex gap-1">
            <button onClick={() => setEditing(!editing)} className="text-slate-300 hover:text-indigo-500 transition-colors"><Edit3 size={13} /></button>
            <button onClick={onDelete} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
          </div>
        </div>
      </div>

      {editing ? (
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Description..." className="w-full text-xs text-slate-600 border border-slate-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-200 mb-2" />
      ) : (
        project.description && <p className="text-xs text-slate-500 leading-relaxed mb-3">{project.description}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <select
          value={project.status}
          onChange={e => onUpdate({ status: e.target.value as ProjectStatus })}
          className="text-[11px] font-medium rounded-lg px-2 py-1 border border-slate-100 bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-200 text-slate-600"
        >
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
        </select>

        {editing && (
          <div className="flex gap-2">
            <button onClick={save} className="text-xs text-white px-3 py-1 rounded-lg font-medium" style={{ background: 'linear-gradient(135deg, #F97316, #FBBF24)' }}>Save</button>
            <button onClick={() => { setEditing(false); setTitle(project.title); setDesc(project.description ?? '') }} className="text-xs text-slate-500 px-3 py-1 rounded-lg hover:bg-slate-100">Cancel</button>
          </div>
        )}

        {!editing && <p className="text-[10px] text-slate-400">{fmtRelative(project.updatedAt)}</p>}
      </div>
    </div>
  )
}

// ── Action Item Row ───────────────────────────────────────────────────────────

function ActionItemRow({ item, onUpdate, onDelete }: { item: ActionItem; onUpdate: (p: Partial<ActionItem>) => Promise<void>; onDelete: () => Promise<void> }) {
  const done = item.status === 'done'
  const overdue = item.dueDate && new Date(item.dueDate) < new Date() && !done

  return (
    <div className={cn('bg-white rounded-xl border px-5 py-4 flex items-start gap-4 group transition-all hover:shadow-sm', done ? 'border-slate-100 opacity-50' : 'border-slate-200 hover:border-slate-300')}>
      <button
        onClick={() => onUpdate({ status: done ? 'open' : 'done' })}
        className={cn('mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all', done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-orange-400')}
      >
        {done && <Check size={11} className="text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn('font-medium text-slate-900 text-sm', done && 'line-through text-slate-400')}>{item.title}</p>
        {item.description && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.description}</p>}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <PriorityBadge priority={item.priority} />
          <StatusSelect value={item.status} onChange={(s) => onUpdate({ status: s })} />
          {item.dueDate && (
            <span className={cn('text-xs flex items-center gap-1 font-medium', overdue ? 'text-red-500' : 'text-slate-400')}>
              <Calendar size={11} /> {fmtDate(item.dueDate)}{overdue && ' · Overdue'}
            </span>
          )}
        </div>
      </div>

      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all mt-0.5 flex-shrink-0">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = { high: { bg: '#FEF2F2', color: '#DC2626', dot: '#EF4444' }, medium: { bg: '#FFFBEB', color: '#D97706', dot: '#F59E0B' }, low: { bg: '#F8FAFC', color: '#64748B', dot: '#94A3B8' } }[priority]
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  )
}

function StatusSelect({ value, onChange }: { value: Status; onChange: (s: Status) => void }) {
  const cfg: Record<Status, { bg: string; color: string }> = {
    open: { bg: '#F1F5F9', color: '#475569' },
    in_progress: { bg: '#EEF2FF', color: '#4F46E5' },
    done: { bg: '#ECFDF5', color: '#059669' },
  }
  const c = cfg[value]
  return (
    <select value={value} onChange={e => onChange(e.target.value as Status)} className="text-[11px] font-semibold rounded-full px-2 py-0.5 border-0 cursor-pointer focus:outline-none" style={{ background: c.bg, color: c.color }}>
      <option value="open">Open</option>
      <option value="in_progress">In Progress</option>
      <option value="done">Done</option>
    </select>
  )
}

// ── Topic Row ─────────────────────────────────────────────────────────────────

function TopicRow({ topic, onUpdate, onDelete }: { topic: DiscussionTopic; onUpdate: (p: Partial<DiscussionTopic>) => Promise<void>; onDelete: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(topic.body ?? '')
  const save = async () => { await onUpdate({ body }); setEditing(false) }

  return (
    <div className={cn('bg-white rounded-xl border px-5 py-4 group transition-all hover:shadow-sm', topic.resolved ? 'border-slate-100 opacity-50' : 'border-slate-200 hover:border-slate-300')}>
      <div className="flex items-start gap-3">
        <button onClick={() => onUpdate({ resolved: !topic.resolved })} className={cn('mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all', topic.resolved ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400')}>
          {topic.resolved && <Check size={11} className="text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium text-sm text-slate-900', topic.resolved && 'line-through text-slate-400')}>{topic.title}</p>
          {editing ? (
            <div className="mt-2">
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} className="w-full text-sm border border-slate-200 rounded-xl p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-200" placeholder="Add notes..." />
              <div className="flex gap-2 mt-2">
                <button onClick={save} className="text-xs text-white px-3 py-1.5 rounded-lg font-medium" style={{ background: 'linear-gradient(135deg, #F97316, #FBBF24)' }}>Save</button>
                <button onClick={() => setEditing(false)} className="text-xs text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-100">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {topic.body && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{topic.body}</p>}
              <p className="text-[10px] text-slate-400 mt-1.5">{fmtRelative(topic.updatedAt)}</p>
            </>
          )}
        </div>
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={() => setEditing(true)} className="text-slate-300 hover:text-indigo-500 transition-colors"><Edit3 size={13} /></button>
          <button onClick={onDelete} className="text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  )
}

// ── Note Card ─────────────────────────────────────────────────────────────────

function NoteCard({ note, expanded, onToggle, onDelete, onImportActions, onImportTopics }: {
  note: MeetingNote; expanded: boolean; onToggle: () => void; onDelete: () => Promise<void>
  onImportActions: (items: string[]) => Promise<void>; onImportTopics: (items: string[]) => Promise<void>
}) {
  const extracted = extractActionItems(note.content)
  const extTopics = extractTopics(note.content)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-sm transition-all">
      <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: note.source === 'otter' ? '#EEF2FF' : '#F8FAFC' }}>
            {note.source === 'otter' ? <Mic2 size={16} className="text-indigo-500" /> : <FileText size={16} className="text-slate-400" />}
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-900">{note.title}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{fmtDate(note.meetingDate)} · {note.source === 'otter' ? 'Otter.ai' : 'Manual'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {extracted.length > 0 && <span className="text-[11px] font-semibold bg-orange-50 text-orange-600 px-2.5 py-0.5 rounded-full border border-orange-100">{extracted.length} actions found</span>}
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="text-slate-300 hover:text-red-400 transition-colors p-1"><Trash2 size={13} /></button>
          <ChevronDown size={16} className={cn('text-slate-400 transition-transform', expanded && 'rotate-180')} />
        </div>
      </div>
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4">
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{note.content}</pre>
          {(extracted.length > 0 || extTopics.length > 0) && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
              {extracted.length > 0 && (
                <button onClick={() => onImportActions(extracted)} className="text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-4 py-2 rounded-xl hover:bg-orange-100 transition-colors">
                  + Import {extracted.length} action item{extracted.length > 1 ? 's' : ''}
                </button>
              )}
              {extTopics.length > 0 && (
                <button onClick={() => onImportTopics(extTopics)} className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors">
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
      <div className="mb-4 text-slate-200">{icon}</div>
      <p className="font-semibold text-slate-500">{label}</p>
      <p className="text-sm text-slate-400 mt-1">{sub}</p>
    </div>
  )
}

// ── Modals ────────────────────────────────────────────────────────────────────

function NewProjectModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (p: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'clientId'>) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('active')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!title.trim()) return
    setSaving(true)
    await onSave({ title, description: description || undefined, status })
    setTitle(''); setDescription(''); setStatus('active'); setSaving(false)
  }
  return (
    <Modal open={open} onClose={onClose} title="New Project" size="sm">
      <div className="p-6 space-y-4">
        <Field label="Project Name *"><input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="e.g. Q3 Case Referrals" className={inputCls} /></Field>
        <Field label="Description"><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this project about?" rows={3} className={inputCls + ' resize-none'} /></Field>
        <Field label="Status">
          <select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)} className={inputCls}>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-5 py-2 text-sm text-white rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #F97316, #FBBF24)' }}>
            {saving && <Loader2 size={13} className="animate-spin" />} Add Project
          </button>
        </div>
      </div>
    </Modal>
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
        <Field label="What needs to be done? *"><input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="e.g. Send contract to client" className={inputCls} /></Field>
        <Field label="Details"><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Any additional context..." rows={2} className={inputCls + ' resize-none'} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Priority">
            <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className={inputCls}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </Field>
          <Field label="Due Date"><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-5 py-2 text-sm text-white rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #F97316, #FBBF24)' }}>
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
    <Modal open={open} onClose={onClose} title="New Discussion Topic" size="sm">
      <div className="p-6 space-y-4">
        <Field label="Topic *"><input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="What needs to be discussed?" className={inputCls} /></Field>
        <Field label="Notes"><textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Background or context..." rows={3} className={inputCls + ' resize-none'} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-5 py-2 text-sm text-white rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #F97316, #FBBF24)' }}>
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
    setExtracted({ actionItems: extractActionItems(content), topics: extractTopics(content) })
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
          <textarea value={content} onChange={e => { setContent(e.target.value); setExtracted(null) }} placeholder="Paste your Otter.ai transcript or meeting notes here. Click 'Extract' to automatically pull out action items and topics." rows={10} className={inputCls + ' resize-none font-mono text-xs'} />
        </Field>
        {content.trim() && !extracted && (
          <button onClick={extract} className="w-full flex items-center justify-center gap-2 bg-orange-50 text-orange-700 border border-orange-200 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-100 transition-colors">
            ✨ Extract Action Items & Topics
          </button>
        )}
        {extracted && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
            <p className="text-xs font-semibold text-slate-600">✨ Extracted — will be imported when you save</p>
            {extracted.actionItems.length > 0 && (
              <div>
                <p className="text-xs font-bold text-orange-700 mb-1.5">Action Items ({extracted.actionItems.length})</p>
                <ul className="space-y-1">{extracted.actionItems.map((a, i) => <li key={i} className="text-xs text-slate-700 flex gap-2"><span className="text-orange-400 flex-shrink-0">•</span>{a}</li>)}</ul>
              </div>
            )}
            {extracted.topics.length > 0 && (
              <div>
                <p className="text-xs font-bold text-indigo-700 mb-1.5">Discussion Topics ({extracted.topics.length})</p>
                <ul className="space-y-1">{extracted.topics.map((t, i) => <li key={i} className="text-xs text-slate-700 flex gap-2"><span className="text-indigo-400 flex-shrink-0">•</span>{t}</li>)}</ul>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={reset} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-5 py-2 text-sm text-white rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #F97316, #FBBF24)' }}>
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

const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white'
