'use client'
import { useEffect, useState } from 'react'
import { Settings, Save, CheckCircle, Download, Upload, Trash2, AlertTriangle } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { AppData, Client } from '@/lib/types'
import { loadData, saveData, updateClient } from '@/lib/store'
import { fmtDate } from '@/lib/utils'

export default function SettingsPage() {
  const [data, setData] = useState<AppData | null>(null)
  const [saved, setSaved] = useState('')
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => { setData(loadData()) }, [])
  if (!data) return null

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `pi-client-hub-backup-${new Date().toISOString().split('T')[0]}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as AppData
        saveData(parsed); setData(parsed)
        setSaved('Data imported successfully!'); setTimeout(() => setSaved(''), 3000)
      } catch { setSaved('Error: invalid backup file') }
    }
    reader.readAsText(file)
  }

  const clearAll = () => {
    if (!confirm('Are you sure? This will delete ALL data. This cannot be undone.')) return
    localStorage.removeItem('pi_client_hub_data')
    location.reload()
  }

  const saveClientInfo = (id: string, patch: Partial<Client>) => {
    setData(updateClient(data, id, patch))
    setEditing(null); setSaved('Saved!'); setTimeout(() => setSaved(''), 2000)
  }

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-3xl">
        <div className="mb-8 flex items-center gap-2">
          <Settings size={22} className="text-slate-500" />
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        </div>

        {saved && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 mb-6 text-sm font-medium">
            <CheckCircle size={16} /> {saved}
          </div>
        )}

        {/* Client info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-4">Client Details</h2>
          <div className="space-y-3">
            {data.clients.map(c => <ClientEditor key={c.id} client={c} editing={editing === c.id} onEdit={() => setEditing(c.id)} onSave={(patch) => saveClientInfo(c.id, patch)} onCancel={() => setEditing(null)} />)}
          </div>
        </div>

        {/* Data management */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-1">Data & Backup</h2>
          <p className="text-sm text-slate-500 mb-4">Your data is stored locally in your browser. Export regularly to avoid losing it.</p>
          <div className="flex gap-3 flex-wrap">
            <button onClick={exportData} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
              <Download size={15} /> Export Backup
            </button>
            <label className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 cursor-pointer transition-colors">
              <Upload size={15} /> Import Backup
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Action items: {data.actionItems.length} · Topics: {data.discussionTopics.length} · Notes: {data.meetingNotes.length}
            </p>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-xl border border-red-100 p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-500" />
            <h2 className="font-semibold text-red-700">Danger Zone</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">This will permanently delete all clients, action items, notes, and settings.</p>
          <button onClick={clearAll} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
            <Trash2 size={15} /> Clear All Data
          </button>
        </div>
      </div>
    </AppShell>
  )
}

function ClientEditor({ client, editing, onEdit, onSave, onCancel }: { client: Client; editing: boolean; onEdit: () => void; onSave: (p: Partial<Client>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ contactName: client.contactName ?? '', contactEmail: client.contactEmail ?? '', contactPhone: client.contactPhone ?? '', website: client.website ?? '' })
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  if (!editing) return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: client.color }} />
        <div>
          <p className="text-sm font-medium text-slate-800">{client.name}</p>
          {client.contactName && <p className="text-xs text-slate-400">{client.contactName} · {client.contactEmail}</p>}
        </div>
      </div>
      <button onClick={onEdit} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">Edit</button>
    </div>
  )

  return (
    <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: client.color }} />
        <p className="font-medium text-sm text-slate-800">{client.name}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {([['contactName', 'Contact Name'], ['contactEmail', 'Email'], ['contactPhone', 'Phone'], ['website', 'Website']] as const).map(([key, label]) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
            <input value={form[key]} onChange={f(key)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={() => onSave(form)} className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-medium"><Save size={12} /> Save</button>
        <button onClick={onCancel} className="text-xs text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-100">Cancel</button>
      </div>
    </div>
  )
}
