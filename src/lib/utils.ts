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

  // Junk patterns — observations, context, and filler that are NOT action items
  const junkPatterns = [
    /\b(mentions|noted|notes|validates|confirms|acknowledges|explains|describes|outlines|highlights|states|says|said|believes|thinks|feels|agrees|disagrees)\b/i,
    /\b(is particularly|is very|is quite|creating a|could delay|pending his|pending her)\b/i,
    /^(and\s+)/i,
    /^[A-Z][a-z]+ [A-Z][a-z]+ (mentions|notes|outlines|explains|describes)/i, // "John Smith mentions..."
    /\b(blocker|difficulty|schedule is|unpredictable|busy)\b/i,
  ]

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length < 10 || trimmed.length > 300) continue

    // HIGHEST PRIORITY: Otter checkbox action items [ ] @person
    const isOtterCheckbox = /^\[\s*\]/.test(trimmed)
    if (isOtterCheckbox) {
      const cleaned = trimmed
        .replace(/^\[\s*\]\s*/, '')
        .replace(/^@\w+\s*-?\s*/i, '')
        .trim()
      const key = cleaned.toLowerCase().slice(0, 50)
      if (cleaned.length > 8 && !seen.has(key)) {
        seen.add(key)
        items.push(cleaned)
      }
      continue
    }

    // Skip junk observations
    if (junkPatterns.some(p => p.test(trimmed))) continue

    // Strong action signals only
    const strongActionPatterns = [
      /^[-*•]\s+@/,                                          // bullet + @mention
      /\b(will|needs to|need to|should|must|is going to)\s+(send|share|review|update|schedule|call|email|book|confirm|prepare|draft|create|follow.?up|reach out|check|present|discuss|inform|keep)\b/i,
      /\b(action item|next step|follow.?up|take.?away)[:\s]/i,
    ]

    if (strongActionPatterns.some(p => p.test(trimmed))) {
      const cleaned = trimmed
        .replace(/^[-*•◦▸→]\s+/, '')
        .replace(/^(action item|next step|take.?away)[:\-\s]*/i, '')
        .trim()
      const key = cleaned.toLowerCase().slice(0, 50)
      if (cleaned.length > 10 && !seen.has(key)) {
        seen.add(key)
        items.push(cleaned)
      }
    }
  }
  return items.slice(0, 15)
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
