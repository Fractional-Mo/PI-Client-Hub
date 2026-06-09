'use client'
import { AppData, Client, ActionItem, DiscussionTopic, MeetingNote } from './types'

const STORAGE_KEY = 'pi_client_hub_data'

const DEFAULT_CLIENTS: Client[] = [
  { id: 'malman',    name: 'Malman Law',         shortName: 'Malman',    color: '#6366f1', createdAt: new Date().toISOString() },
  { id: 'goldblatt', name: 'Goldblatt + Singer',  shortName: 'Goldblatt', color: '#0ea5e9', createdAt: new Date().toISOString() },
  { id: 'dubin',     name: 'Dubin Law Group',     shortName: 'Dubin',     color: '#10b981', createdAt: new Date().toISOString() },
  { id: 'shulman',   name: 'Shulman & Hill',      shortName: 'Shulman',   color: '#f59e0b', createdAt: new Date().toISOString() },
  { id: 'parnall',   name: 'Parnall Law',         shortName: 'Parnall',   color: '#ef4444', createdAt: new Date().toISOString() },
  { id: 'burnetti',  name: 'Burnetti, P.A.',      shortName: 'Burnetti',  color: '#8b5cf6', createdAt: new Date().toISOString() },
]

const DEFAULT_DATA: AppData = {
  clients: DEFAULT_CLIENTS,
  actionItems: [],
  discussionTopics: [],
  meetingNotes: [],
}

export function loadData(): AppData {
  if (typeof window === 'undefined') return DEFAULT_DATA
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DATA
    const parsed = JSON.parse(raw) as AppData
    // Merge in any new default clients not yet in storage
    const existingIds = new Set(parsed.clients.map(c => c.id))
    for (const dc of DEFAULT_CLIENTS) {
      if (!existingIds.has(dc.id)) parsed.clients.push(dc)
    }
    return parsed
  } catch {
    return DEFAULT_DATA
  }
}

export function saveData(data: AppData): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Helpers that mutate + persist
export function addActionItem(data: AppData, item: Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt'>): AppData {
  const now = new Date().toISOString()
  const next = { ...data, actionItems: [...data.actionItems, { ...item, id: uid(), createdAt: now, updatedAt: now }] }
  saveData(next)
  return next
}

export function updateActionItem(data: AppData, id: string, patch: Partial<ActionItem>): AppData {
  const next = {
    ...data,
    actionItems: data.actionItems.map(a => a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a),
  }
  saveData(next)
  return next
}

export function deleteActionItem(data: AppData, id: string): AppData {
  const next = { ...data, actionItems: data.actionItems.filter(a => a.id !== id) }
  saveData(next)
  return next
}

export function addDiscussionTopic(data: AppData, topic: Omit<DiscussionTopic, 'id' | 'createdAt' | 'updatedAt'>): AppData {
  const now = new Date().toISOString()
  const next = { ...data, discussionTopics: [...data.discussionTopics, { ...topic, id: uid(), createdAt: now, updatedAt: now }] }
  saveData(next)
  return next
}

export function updateDiscussionTopic(data: AppData, id: string, patch: Partial<DiscussionTopic>): AppData {
  const next = {
    ...data,
    discussionTopics: data.discussionTopics.map(t => t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t),
  }
  saveData(next)
  return next
}

export function deleteDiscussionTopic(data: AppData, id: string): AppData {
  const next = { ...data, discussionTopics: data.discussionTopics.filter(t => t.id !== id) }
  saveData(next)
  return next
}

export function addMeetingNote(data: AppData, note: Omit<MeetingNote, 'id' | 'createdAt'>): AppData {
  const now = new Date().toISOString()
  const next = { ...data, meetingNotes: [...data.meetingNotes, { ...note, id: uid(), createdAt: now }] }
  saveData(next)
  return next
}

export function deleteMeetingNote(data: AppData, id: string): AppData {
  const next = { ...data, meetingNotes: data.meetingNotes.filter(n => n.id !== id) }
  saveData(next)
  return next
}

export function updateClient(data: AppData, id: string, patch: Partial<Client>): AppData {
  const next = { ...data, clients: data.clients.map(c => c.id === id ? { ...c, ...patch } : c) }
  saveData(next)
  return next
}

export function addClient(data: AppData, client: Omit<Client, 'id' | 'createdAt'>): AppData {
  const next = { ...data, clients: [...data.clients, { ...client, id: uid(), createdAt: new Date().toISOString() }] }
  saveData(next)
  return next
}

export function deleteClient(data: AppData, id: string): AppData {
  const next = {
    ...data,
    clients: data.clients.filter(c => c.id !== id),
    actionItems: data.actionItems.filter(a => a.clientId !== id),
    discussionTopics: data.discussionTopics.filter(t => t.clientId !== id),
    meetingNotes: data.meetingNotes.filter(n => n.clientId !== id),
  }
  saveData(next)
  return next
}
