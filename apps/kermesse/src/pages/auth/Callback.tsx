import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@agpe/shared/supabase-client'
import { useAuth } from '@agpe/shared/auth/useAuth'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { syncProfileFromIdentity } from '@/lib/profile-sync'

// Récupère la session après le clic sur le magic link, promeut l'admin si besoin,
// garantit un rôle bénévole, puis redirige selon le rôle.
export function Callback() {
  const navigate = useNavigate()
  const { refreshRole } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run(): Promise<void> {
      // detectSessionInUrl échange automatiquement le ?code= ; on attend la session.
      let session = (await supabase.auth.getSession()).data.session

      if (!session) {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 5000)
          const { data } = supabase.auth.onAuthStateChange((_event, s) => {
            if (s) {
              clearTimeout(timeout)
              data.subscription.unsubscribe()
              resolve()
            }
          })
        })
        session = (await supabase.auth.getSession()).data.session
      }

      if (cancelled) return

      if (!session) {
        setError(
          'Lien de connexion invalide ou expiré. Demandez un nouveau lien.',
        )
        return
      }

      // Renseigne le profil (prénom/nom) depuis l'identité Google si disponible.
      await syncProfileFromIdentity(session.user)

      // Promotion du premier admin (idempotent, sans effet si un admin existe).
      const { error: bootstrapErr } = await supabase.rpc(
        'kermesse_bootstrap_admin',
        { admin_email: import.meta.env.VITE_ADMIN_EMAIL },
      )
      if (bootstrapErr) {
        console.error('[kermesse] bootstrap_admin error:', bootstrapErr)
      }

      // Attribution du rôle bénévole pour les nouveaux parents (no-op sinon).
      const { error: volunteerErr } = await supabase.rpc(
        'kermesse_ensure_volunteer_role',
      )
      if (volunteerErr) {
        console.error('[kermesse] ensure_volunteer_role error:', volunteerErr)
      }

      // Récupère le rôle effectif pour décider de la redirection.
      const { data: roleRow } = await supabase
        .from('kermesse_user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle()

      await refreshRole()
      if (cancelled) return

      navigate(
        roleRow?.role === 'admin' ? '/admin/dashboard' : '/volunteer/stands',
        { replace: true },
      )
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [navigate, refreshRole])

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="max-w-sm w-full">
          <ErrorMessage
            message={error}
            onRetry={() => navigate('/login', { replace: true })}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-4">
        <img
          src={`${import.meta.env.BASE_URL}logo-agpe-icon.png`}
          alt=""
          aria-hidden="true"
          className="mx-auto h-16 w-16 object-contain"
        />
        <p className="text-slate-600">Connexion en cours…</p>
        <LoadingSkeleton count={1} />
      </div>
    </div>
  )
}
