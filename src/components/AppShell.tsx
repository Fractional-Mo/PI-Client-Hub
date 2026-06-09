'use client'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import { Client } from '@/lib/types'
import { fetchClients } from '@/lib/db'
import { supabase } from '@/lib/supabase'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>([])

  useEffect(() => {
    fetchClients().then(setClients).catch(console.error)

    // Live updates: when another user adds/edits a client, sidebar refreshes
    const channel = supabase
      .channel('clients-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        fetchClients().then(setClients)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="flex min-h-screen">
      <Sidebar clients={clients} />
      <main className="flex-1 ml-[260px] min-h-screen">
        {children}
      </main>
    </div>
  )
}
