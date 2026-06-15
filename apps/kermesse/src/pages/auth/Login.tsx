import { useState } from 'react'
import { supabase } from '@agpe/shared/supabase-client'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// URL de retour OAuth : base de l'app + route hash callback.
function buildRedirectUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}#/auth/callback`
}

// Logo Google multicolore (lucide-react ne fournit pas d'icône de marque).
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

export function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogle(): Promise<void> {
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: buildRedirectUrl() },
    })
    if (err) {
      setError('Connexion Google impossible. Réessayez.')
      console.error('[kermesse] signInWithOAuth error:', err)
      setLoading(false)
    }
    // En cas de succès, le navigateur est redirigé vers Google.
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2" aria-hidden="true">
            🎪
          </div>
          <CardTitle className="text-xl">Connexion bénévole</CardTitle>
          <CardDescription>
            Événements AGPE — connectez-vous avec votre compte Google.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void handleGoogle()}
              disabled={loading}
              aria-busy={loading}
            >
              <GoogleIcon />
              {loading ? 'Redirection…' : 'Se connecter avec Google'}
            </Button>
            {error && (
              <p role="alert" className="text-center text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-center text-xs text-slate-400">
            Connexion sécurisée via Google, sans mot de passe à retenir.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
