export type Priority = 'low' | 'medium' | 'high'
export type Status = 'open' | 'in_progress' | 'done'

export interface ActionItem {
  id: string
  clientId: string
  title: string
  description?: string
  priority: Priority
  status: Status
  dueDate?: string
  createdAt: string
  updatedAt: string
  sourceNoteId?: string
}

export interface DiscussionTopic {
  id: string
  clientId: string
  title: string
  body?: string
  resolved: boolean
  dueDate?: string
  createdAt: string
  updatedAt: string
  sourceNoteId?: string
}

export interface MeetingNote {
  id: string
  clientId: string
  title: string
  content: string
  source: 'manual' | 'otter'
  otterMeetingId?: string
  meetingDate: string
  createdAt: string
  extractedActionItems?: string[]
  extractedTopics?: string[]
}

export interface Client {
  id: string
  name: string
  shortName: string
  color: string
  website?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  notes?: string
  createdAt: string
}

export type ProjectStatus = 'active' | 'on_hold' | 'completed'

export interface Project {
  id: string
  clientId: string
  title: string
  description?: string
  status: ProjectStatus
  dueDate?: string
  createdAt: string
  updatedAt: string
}

export interface OtterSettings {
  apiKey: string
  lastSyncAt?: string
  clientKeywords: Record<string, string[]>
}

export interface AppData {
  clients: Client[]
  actionItems: ActionItem[]
  discussionTopics: DiscussionTopic[]
  meetingNotes: MeetingNote[]
  projects: Project[]
  otterSettings?: OtterSettings
}
