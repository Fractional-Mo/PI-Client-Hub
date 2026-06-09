import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Priority, Status } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function priorityColor(p: Priority) {
  return { low: 'text-slate-500 bg-slate-100', medium: 'text-amber-700 bg-amber-100', high: 'text-red-700 bg-red-100' }[p]
}

export function statusColor(s: Status) {
  return { open: 'text-slate-600 bg-slate-100', in_progress: 'text-blue-700 bg-blue-100', done: 'text-emerald-700 bg-emerald-100' }[s]
}

export function statusLabel(s: Status) {
  return { open: 'Open', in_progress: 'In Progress', done: 'Done' }[s]
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return fmtDate(iso)
}

export function extractActionItems(text: string): string[] {
  const lines = text.split('\n')
  const items: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^[-*•]\s+/i.test(trimmed) || /^action item/i.test(trimmed) || /\bwill\b|\bneed to\b|\bfollow.?up\b|\bassign/i.test(trimmed)) {
      const cleaned = trimmed.replace(/^[-*•]\s+/, '').replace(/^action item:?\s*/i, '')
      if (cleaned.length > 5 && cleaned.length < 200) items.push(cleaned)
    }
  }
  return items.slice(0, 20)
}

export function extractTopics(text: string): string[] {
  const lines = text.split('\n')
  const topics: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^#+\s+/.test(trimmed) || /^topic[:\s]/i.test(trimmed) || /^discuss/i.test(trimmed)) {
      const cleaned = trimmed.replace(/^#+\s+/, '').replace(/^topic:?\s*/i, '')
      if (cleaned.length > 3 && cleaned.length < 150) topics.push(cleaned)
    }
  }
  return topics.slice(0, 10)
}
