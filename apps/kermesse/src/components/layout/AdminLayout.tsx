import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, CalendarDays, Clock, Menu, ShieldCheck, Tent, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AccountMenu } from '@/components/layout/AccountMenu'

const navItems = [
  { to: '/admin/dashboard', label: 'Tableau de bord', icon: BarChart3 },
  { to: '/admin/events', label: 'Événements', icon: CalendarDays },
  { to: '/admin/stands', label: 'Stands', icon: Tent },
  { to: '/admin/slots', label: 'Créneaux', icon: Clock },
  { to: '/admin/roles', label: 'Administrateurs', icon: ShieldCheck },
]

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-1" aria-label="Navigation admin">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium min-h-11',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-slate-700 hover:bg-slate-100',
            )
          }
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

// Layout admin : sidebar fixe sur desktop, drawer via hamburger sur mobile.
export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* En-tête mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-white px-4 h-14 md:pl-[256px]">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-slate-900">Admin Kermesse</span>
        </div>
        <AccountMenu />
      </header>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 md:border-r md:bg-white md:p-4">
        <div className="mb-6 flex items-center gap-2 px-3 font-semibold text-slate-900">
          <span aria-hidden="true">🎪</span>
          <span>AGPE</span>
        </div>
        <NavList />
      </aside>

      {/* Drawer mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80%] bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold text-slate-900">Menu</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen(false)}
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <NavList onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <main className="md:pl-64">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
