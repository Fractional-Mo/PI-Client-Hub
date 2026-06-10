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
    <aside className="fixed left-0 top-0 h-screen w-[270px] flex flex-col z-30" style={{ background: '#0B1829' }}>
      {/* Logo / Brand */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'linear-gradient(135deg, #F97316, #FBBF24)' }} />
            <p className="font-bold text-white text-sm tracking-tight">Fractional Mo</p>
          </div>
          <p className="text-[11px] pl-3.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Client Hub</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-0.5">
        <NavItem href="/" icon={<LayoutDashboard size={15} />} label="Dashboard" active={path === '/'} />
        <NavItem href="/search" icon={<Search size={15} />} label="Search" active={path === '/search'} />
        <NavItem href="/otter" icon={<Mic2 size={15} />} label="Otter.ai Sync" active={path === '/otter'} />

        <div className="px-3 pt-6 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Clients</p>
        </div>
        {clients.map(c => (
          <ClientNavItem key={c.id} client={c} active={path === `/clients/${c.id}`} />
        ))}

        <div className="pt-4">
          <NavItem href="/settings" icon={<Settings size={15} />} label="Settings" active={path === '/settings'} />
        </div>
      </nav>

      <div className="px-5 py-3 border-t text-[11px]" style={{ borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.25)' }}>
        Synced via Supabase · Real-time
      </div>
    </aside>
  )
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={cn(
      'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all font-medium',
      active
        ? 'text-white'
        : 'hover:text-white transition-colors'
    )}
    style={active
      ? { background: 'linear-gradient(135deg, #F97316, #FBBF24)', color: 'white' }
      : { color: 'rgba(255,255,255,0.5)' }
    }
    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '' }}
    >
      {icon}
      {label}
    </Link>
  )
}

function ClientNavItem({ client, active }: { client: Client; active: boolean }) {
  return (
    <Link href={`/clients/${client.id}`}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all font-medium',
        active ? 'text-white' : ''
      )}
      style={active
        ? { background: 'rgba(249,115,22,0.18)', color: 'white', borderLeft: '2px solid #F97316' }
        : { color: 'rgba(255,255,255,0.5)' }
      }
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '' }}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: client.color }} />
      <span className="truncate">{client.name}</span>
    </Link>
  )
}
