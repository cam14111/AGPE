import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@agpe/shared/auth/useAuth'
import { RoleGuard } from '@/lib/role-guard'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { VolunteerLayout } from '@/components/layout/VolunteerLayout'
import { Login } from '@/pages/auth/Login'
import { Callback } from '@/pages/auth/Callback'
import { Profile } from '@/pages/Profile'
import { Dashboard } from '@/pages/admin/Dashboard'
import { Supervision } from '@/pages/admin/Supervision'
import { Events } from '@/pages/admin/Events'
import { Stands } from '@/pages/admin/Stands'
import { Slots } from '@/pages/admin/Slots'
import { Roles } from '@/pages/admin/Roles'
import { History } from '@/pages/admin/History'
import { StandsList } from '@/pages/volunteer/StandsList'
import { MyPlanning } from '@/pages/volunteer/MyPlanning'

// Redirige la racine selon l'état d'authentification et le rôle.
function RootRedirect() {
  const { session, role, loading } = useAuth()
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <LoadingSkeleton />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  return (
    <Navigate
      to={role === 'admin' ? '/admin/dashboard' : '/volunteer/stands'}
      replace
    />
  )
}

// Choisit le layout selon le rôle (utilisé pour /profil, accessible aux deux rôles)
// afin qu'un admin conserve sa navigation admin et un bénévole la sienne.
function RoleLayout() {
  const { role } = useAuth()
  return role === 'admin' ? <AdminLayout /> : <VolunteerLayout />
}

// Empêche un utilisateur déjà connecté de revoir /login.
function LoginRoute() {
  const { session, role, loading } = useAuth()
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <LoadingSkeleton count={1} />
      </div>
    )
  }
  if (session) {
    return (
      <Navigate
        to={role === 'admin' ? '/admin/dashboard' : '/volunteer/stands'}
        replace
      />
    )
  }
  return <Login />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/auth/callback" element={<Callback />} />

      {/* Profil — tout utilisateur authentifié */}
      <Route
        path="/profil"
        element={
          <RoleGuard requiredRole="volunteer">
            <RoleLayout />
          </RoleGuard>
        }
      >
        <Route index element={<Profile />} />
      </Route>

      {/* Espace bénévole */}
      <Route
        path="/volunteer"
        element={
          <RoleGuard requiredRole="volunteer">
            <VolunteerLayout />
          </RoleGuard>
        }
      >
        <Route index element={<Navigate to="/volunteer/stands" replace />} />
        <Route path="stands" element={<StandsList />} />
        <Route path="planning" element={<MyPlanning />} />
      </Route>

      {/* Espace admin */}
      <Route
        path="/admin"
        element={
          <RoleGuard requiredRole="admin">
            <AdminLayout />
          </RoleGuard>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="supervision" element={<Supervision />} />
        <Route path="events" element={<Events />} />
        <Route path="stands" element={<Stands />} />
        <Route path="slots" element={<Slots />} />
        <Route path="planning" element={<MyPlanning />} />
        <Route path="roles" element={<Roles />} />
        <Route path="history" element={<History />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
