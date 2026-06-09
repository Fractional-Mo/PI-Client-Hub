import { supabase } from './supabase'
import { Client, ActionItem, DiscussionTopic, MeetingNote, AppData, Priority, Status } from './types'

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase.from('clients').select('*').order('created_at')
  if (error) throw error
  return (data ?? []).map(rowToClient)
}

export async function createClient(c: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
  const { data, error } = await supabase.from('clients').insert({
    id: uid(), name: c.name, short_name: c.shortName, color: c.color,
    website: c.website, contact_name: c.contactName, contact_email: c.contactEmail, contact_phone: c.contactPhone, notes: c.notes,
  }).select().single()
  if (error) throw error
  return rowToClient(data)
}

export async function patchClient(id: string, patch: Partial<Client>): Promise<void> {
  const { error } = await supabase.from('clients').update({
    name: patch.name, short_name: patch.shortName, color: patch.color,
    website: patch.website, contact_name: patch.contactName, contact_email: patch.contactEmail,
    contact_phone: patch.contactPhone, notes: patch.notes,
  }).eq('id', id)
  if (error) throw error
}

export async function removeClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw error
}

// ─── Action Items ─────────────────────────────────────────────────────────────

export async function fetchActionItems(clientId?: string): Promise<ActionItem[]> {
  let q = supabase.from('action_items').select('*').order('created_at', { ascending: false })
  if (clientId) q = q.eq('client_id', clientId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(rowToActionItem)
}

export async function createActionItem(item: Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ActionItem> {
  const now = new Date().toISOString()
  const { data, error } = await supabase.from('action_items').insert({
    id: uid(), client_id: item.clientId, title: item.title, description: item.description,
    priority: item.priority, status: item.status, due_date: item.dueDate,
    source_note_id: item.sourceNoteId, created_at: now, updated_at: now,
  }).select().single()
  if (error) throw error
  return rowToActionItem(data)
}

export async function patchActionItem(id: string, patch: Partial<ActionItem>): Promise<void> {
  const { error } = await supabase.from('action_items').update({
    title: patch.title, description: patch.description, priority: patch.priority,
    status: patch.status, due_date: patch.dueDate, updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) throw error
}

export async function removeActionItem(id: string): Promise<void> {
  const { error } = await supabase.from('action_items').delete().eq('id', id)
  if (error) throw error
}

// ─── Discussion Topics ────────────────────────────────────────────────────────

export async function fetchTopics(clientId?: string): Promise<DiscussionTopic[]> {
  let q = supabase.from('discussion_topics').select('*').order('created_at', { ascending: false })
  if (clientId) q = q.eq('client_id', clientId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(rowToTopic)
}

export async function createTopic(t: Omit<DiscussionTopic, 'id' | 'createdAt' | 'updatedAt'>): Promise<DiscussionTopic> {
  const now = new Date().toISOString()
  const { data, error } = await supabase.from('discussion_topics').insert({
    id: uid(), client_id: t.clientId, title: t.title, body: t.body,
    resolved: t.resolved, source_note_id: t.sourceNoteId, created_at: now, updated_at: now,
  }).select().single()
  if (error) throw error
  return rowToTopic(data)
}

export async function patchTopic(id: string, patch: Partial<DiscussionTopic>): Promise<void> {
  const { error } = await supabase.from('discussion_topics').update({
    title: patch.title, body: patch.body, resolved: patch.resolved, updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) throw error
}

export async function removeTopic(id: string): Promise<void> {
  const { error } = await supabase.from('discussion_topics').delete().eq('id', id)
  if (error) throw error
}

// ─── Meeting Notes ────────────────────────────────────────────────────────────

export async function fetchNotes(clientId?: string): Promise<MeetingNote[]> {
  let q = supabase.from('meeting_notes').select('*').order('meeting_date', { ascending: false })
  if (clientId) q = q.eq('client_id', clientId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(rowToNote)
}

export async function createNote(n: Omit<MeetingNote, 'id' | 'createdAt'>): Promise<MeetingNote> {
  const { data, error } = await supabase.from('meeting_notes').insert({
    id: uid(), client_id: n.clientId, title: n.title, content: n.content,
    source: n.source, otter_meeting_id: n.otterMeetingId, meeting_date: n.meetingDate,
    extracted_action_items: n.extractedActionItems, extracted_topics: n.extractedTopics,
    created_at: new Date().toISOString(),
  }).select().single()
  if (error) throw error
  return rowToNote(data)
}

export async function removeNote(id: string): Promise<void> {
  const { error } = await supabase.from('meeting_notes').delete().eq('id', id)
  if (error) throw error
}

// ─── Full data load ───────────────────────────────────────────────────────────

export async function fetchAllData(): Promise<AppData> {
  const [clients, actionItems, discussionTopics, meetingNotes] = await Promise.all([
    fetchClients(), fetchActionItems(), fetchTopics(), fetchNotes(),
  ])
  return { clients, actionItems, discussionTopics, meetingNotes }
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToClient(r: any): Client {
  return { id: r.id, name: r.name, shortName: r.short_name, color: r.color, website: r.website, contactName: r.contact_name, contactEmail: r.contact_email, contactPhone: r.contact_phone, notes: r.notes, createdAt: r.created_at }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToActionItem(r: any): ActionItem {
  return { id: r.id, clientId: r.client_id, title: r.title, description: r.description, priority: r.priority as Priority, status: r.status as Status, dueDate: r.due_date, sourceNoteId: r.source_note_id, createdAt: r.created_at, updatedAt: r.updated_at }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTopic(r: any): DiscussionTopic {
  return { id: r.id, clientId: r.client_id, title: r.title, body: r.body, resolved: r.resolved, sourceNoteId: r.source_note_id, createdAt: r.created_at, updatedAt: r.updated_at }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToNote(r: any): MeetingNote {
  return { id: r.id, clientId: r.client_id, title: r.title, content: r.content, source: r.source, otterMeetingId: r.otter_meeting_id, meetingDate: r.meeting_date, createdAt: r.created_at, extractedActionItems: r.extracted_action_items, extractedTopics: r.extracted_topics }
}
