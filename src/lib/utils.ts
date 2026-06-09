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
  const seen = new Set<string>()

  // Action item patterns — covers Otter transcripts, bullet lists, and natural language
  const actionPatterns = [
    /^action item[s]?[:\-\s]+/i,
    /^[-*•◦▸→]\s+/,
    /^\d+\.\s+/,
    /\b(i will|we will|i'll|we'll|i'm going to|we're going to)\b/i,
    /\b(please|can you|could you|make sure|don't forget|remember to|need to|needs to)\b/i,
    /\b(follow.?up|follow up|reach out|send|schedule|set up|book|call|email|review|update|check|confirm|share|prepare|draft|create|add|remove|fix|look into)\b/i,
    /\b(assigned to|owner:|due:|deadline:|by [a-z]+day)\b/i,
    /\btake.?away[s]?\b/i,
    /\bnext step[s]?\b/i,
  ]

  // Noise patterns to skip — Otter speaker labels, timestamps, filler
  const skipPatterns = [
    /^[A-Z][a-z]+ [A-Z][a-z]+\s*\d+:\d+/,  // "John Smith 0:01"
    /^\d+:\d+/,                               // timestamps
    /^(um|uh|yeah|okay|ok|right|so|like|you know|i mean)[,\s]/i,
    /^(speaker \d+|participant \d+)/i,
  ]

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length < 8 || trimmed.length > 250) continue
    if (skipPatterns.some(p => p.test(trimmed))) continue

    const isAction = actionPatterns.some(p => p.test(trimmed))
    if (isAction) {
      const cleaned = trimmed
        .replace(/^action item[s]?[:\-\s]+/i, '')
        .replace(/^[-*•◦▸→]\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .replace(/^(next step[s]?|take.?away[s]?)[:\-\s]*/i, '')
        .trim()

      const key = cleaned.toLowerCase().slice(0, 40)
      if (cleaned.length > 8 && !seen.has(key)) {
        seen.add(key)
        items.push(cleaned)
      }
    }
  }
  return items.slice(0, 20)
}

export function extractTopics(text: string): string[] {
  const lines = text.split('\n')
  const topics: string[] = []
  const seen = new Set<string>()

  const topicPatterns = [
    /^#+\s+/,                                          // Markdown headings
    /^topic[:\-\s]+/i,
    /^(discussed|talking about|re:|regarding|agenda)[:\-\s]+/i,
    /^(question|concern|issue|update|status)[:\-\s]+/i,
    /\b(talked about|discussed|brought up|mentioned|raised|covered)\b/i,
  ]

  const skipPatterns = [
    /^[A-Z][a-z]+ [A-Z][a-z]+\s*\d+:\d+/,
    /^\d+:\d+/,
    /^(um|uh|yeah|okay|so)\b/i,
  ]

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length < 5 || trimmed.length > 150) continue
    if (skipPatterns.some(p => p.test(trimmed))) continue

    if (topicPatterns.some(p => p.test(trimmed))) {
      const cleaned = trimmed
        .replace(/^#+\s+/, '')
        .replace(/^(topic|discussed|re|regarding|agenda|question|concern|issue|update|status)[:\-\s]+/i, '')
        .trim()

      const key = cleaned.toLowerCase().slice(0, 40)
      if (cleaned.length > 4 && !seen.has(key)) {
        seen.add(key)
        topics.push(cleaned)
      }
    }
  }
  return topics.slice(0, 10)
}
