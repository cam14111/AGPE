import { supabase } from '@agpe/shared/supabase-client'
import type { User } from '@supabase/supabase-js'

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

// Extrait prénom / nom depuis les métadonnées d'identité (Google : given_name,
// family_name, ou full_name/name à découper).
function extractName(user: User): { firstName: string | null; lastName: string | null } {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>

  let firstName = asString(meta.given_name) ?? asString(meta.first_name)
  let lastName = asString(meta.family_name) ?? asString(meta.last_name)

  if (!firstName) {
    const full = asString(meta.full_name) ?? asString(meta.name)
    if (full) {
      const parts = full.split(/\s+/)
      firstName = parts[0] ?? null
      lastName = lastName ?? (parts.slice(1).join(' ') || null)
    }
  }

  return { firstName, lastName }
}

// Renseigne agpe_users_profile à partir de l'identité (Google) si le prénom
// n'est pas déjà défini — ne jamais écraser une saisie manuelle de l'utilisateur.
export async function syncProfileFromIdentity(user: User): Promise<void> {
  const { firstName, lastName } = extractName(user)
  if (!firstName && !lastName) return

  const { data: existing } = await supabase
    .from('agpe_users_profile')
    .select('first_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing?.first_name) return // profil déjà renseigné : on respecte la saisie

  const { error } = await supabase
    .from('agpe_users_profile')
    .upsert(
      { user_id: user.id, first_name: firstName, last_name: lastName },
      { onConflict: 'user_id' },
    )
  if (error) {
    console.error('[kermesse] syncProfileFromIdentity error:', error)
  }
}
