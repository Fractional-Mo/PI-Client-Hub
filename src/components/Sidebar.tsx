'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Settings, Mic2, Search } from 'lucide-react'
import { Client } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  clients: Client[]
}

export default function Sidebar({ clients }: Props) {
  const path = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-slate-900 text-slate-100 flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">PI</div>
          <div>
            <p className="font-semibold text-sm leading-tight">Client Hub</p>
            <p className="text-xs text-slate-400 leading-tight">Personal Injury</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-0.5">
        <NavItem href="/" icon={<LayoutDashboard size={16} />} label="Dashboard" active={path === '/'} />
        <NavItem href="/search" icon={<Search size={16} />} label="Search" active={path === '/search'} />
        <NavItem href="/otter" icon={<Mic2 size={16} />} label="Otter.ai Sync" active={path === '/otter'} />

        <p className="px-3 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Clients</p>
        {clients.map(c => (
          <ClientNavItem key={c.id} client={c} active={path === `/clients/${c.id}`} />
        ))}

        <div className="pt-4">
          <NavItem href="/settings" icon={<Settings size={16} />} label="Settings" active={path === '/settings'} />
        </div>
      </nav>

      <div className="px-5 py-3 border-t border-slate-700/60 text-xs text-slate-500">
        Synced via Supabase
      </div>
    </aside>
  )
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={cn(
      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
      active ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    )}>
      {icon}
      {label}
    </Link>
  )
}

function ClientNavItem({ client, active }: { client: Client; active: boolean }) {
  return (
    <Link href={`/clients/${client.id}`} className={cn(
      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
      active ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    )}>
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: client.color }} />
      <span className="truncate">{client.name}</span>
    </Link>
  )
}
