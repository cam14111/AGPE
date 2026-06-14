import { useNavigate } from 'react-router-dom'
import { LogOut, UserRound } from 'lucide-react'
import { useAuth } from '@agpe/shared/auth/useAuth'
import { Button } from '@/components/ui/button'

// Actions de compte : accès au profil + déconnexion. Réutilisé dans les en-têtes.
export function AccountMenu() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut(): Promise<void> {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/profil')}
        aria-label="Mon profil"
      >
        <UserRound className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => void handleSignOut()}
        aria-label="Se déconnecter"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  )
}
