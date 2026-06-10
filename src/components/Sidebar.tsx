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
        <div className="flex items-center gap-3">
          {/* FM Logo Mark */}
          <div className="w-9 h-9 flex-shrink-0">
            <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <defs>
                <linearGradient id="fmG" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#F97316"/>
                  <stop offset="100%" stopColor="#FBBF24"/>
                </linearGradient>
              </defs>
              {/* Top diagonal wing / bar */}
              <path d="M4 16 L38 7 L38 13 L4 22 Z" fill="url(#fmG)"/>
              {/* Left M hump */}
              <path d="M4 24 L4 37 L10 37 L10 30 L14 37 L20 37 L20 24 L14 24 L11 30 L8 24 Z" fill="url(#fmG)"/>
              {/* Right M hump */}
              <path d="M22 24 L22 37 L28 37 L28 30 L32 37 L38 37 L38 24 L32 24 L29 30 L26 24 Z" fill="url(#fmG)"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight tracking-tight">Fractional Mo</p>
            <p className="text-[11px] leading-tight" style={{ color: 'rgba(255,255,255,0.4)' }}>Client Hub</p>
          </div>
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
