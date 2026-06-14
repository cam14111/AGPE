import { useEffect, useState } from 'react'
import { useAuth } from '@agpe/shared/auth/useAuth'
import { useProfile, type ProfileInput } from '@/hooks/useProfile'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { PageHeader } from '@/components/shared/PageHeader'

const EMPTY_FORM: ProfileInput = {
  first_name: '',
  last_name: '',
  phone: '',
  child_class: '',
}

export function Profile() {
  const { user } = useAuth()
  const { profile, loading, saveProfile } = useProfile()
  const [form, setForm] = useState<ProfileInput>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name ?? '',
        last_name: profile.last_name ?? '',
        phone: profile.phone ?? '',
        child_class: profile.child_class ?? '',
      })
    }
  }, [profile])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSaving(true)
    try {
      await saveProfile(form)
    } finally {
      setSaving(false)
    }
  }

  function update(field: keyof ProfileInput, value: string): void {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) return <LoadingSkeleton count={1} />

  return (
    <div>
      <PageHeader
        title="Mon profil"
        description="Optionnel — aide les organisateurs à vous reconnaître."
      />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email ?? ''} disabled />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={(e) => update('first_name', e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={(e) => update('last_name', e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="child_class">Classe de l'enfant</Label>
              <Input
                id="child_class"
                placeholder="ex : CP-A, CM2-B"
                value={form.child_class}
                onChange={(e) => update('child_class', e.target.value)}
              />
            </div>
            <Button type="submit" disabled={saving} aria-busy={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
