// STUB — Edge Function non implémentée
//
// Objectif : envoyer un email de confirmation à chaque inscription bénévole.
//
// Pour activer :
// 1. Implémenter la logique d'envoi email (Resend, SendGrid, ou SMTP Supabase)
// 2. Créer un trigger Supabase sur INSERT dans kermesse_signups
//    qui appelle cette Edge Function via pg_net ou un webhook
// 3. Configurer les secrets : RESEND_API_KEY (ou équivalent)
//
// Schéma du payload attendu :
// {
//   user_email: string,
//   user_name: string,
//   stand_name: string,
//   slot_start: string,
//   slot_end: string,
//   event_name: string,
//   event_date: string
// }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (_req) => {
  // TODO: implémenter l'envoi d'email de confirmation
  return new Response('Not implemented', { status: 501 })
})
