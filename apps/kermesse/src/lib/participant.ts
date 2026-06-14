import type { AdminSignupDetail } from '@/hooks/useAdminSignups'

// Libellé d'affichage d'un inscrit : « Prénom Nom », ou email en repli.
export function participantLabel(d: AdminSignupDetail): string {
  const name = [d.first_name, d.last_name].filter(Boolean).join(' ').trim()
  return name || d.email || 'Bénévole'
}
