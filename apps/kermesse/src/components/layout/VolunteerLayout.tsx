import { NavLink, Outlet } from 'react-router-dom'
import { Calendar, Tent } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AccountMenu } from '@/components/layout/AccountMenu'
import { ProfileBanner } from '@/components/shared/ProfileBanner'

const navItems = [
  { to: '/volunteer/stands', label: 'Stands', icon: Tent },
  { to: '/volunteer/planning', label: 'Mon planning', icon: Calendar },
]

// Layout bénévole : en-tête + bannière profil + contenu + navigation basse (mobile-first).
export function VolunteerLayout() {
  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      <header className="sticky top-0 z-30 bg-white border-b">
        <div className="mx-auto max-w-2xl flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <span aria-hidden="true">🎪</span>
            <span>Événements AGPE</span>
          </div>
          <AccountMenu />
        </div>
      </header>

      <ProfileBanner />

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-6 pb-24">
        <Outlet />
      </main>

      <nav
        className="fixed bottom-0 inset-x-0 z-30 bg-white border-t"
        aria-label="Navigation principale"
      >
        <div className="mx-auto max-w-2xl grid grid-cols-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 py-2 min-h-14 text-xs font-medium',
                  isActive ? 'text-primary' : 'text-slate-500',
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
