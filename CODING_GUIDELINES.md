# Coding Guidelines — App Kermesse AGPE
**Applicables à** : `apps/kermesse/` et `shared/`  
**Niveau** : Obligatoire — ces règles doivent être respectées dans chaque fichier produit

---

## 1. TypeScript

### Strict mode activé
`tsconfig.json` doit inclure :
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Règles
```typescript
// ❌ Interdit
const data: any = response
function getUser() { ... }                    // pas de type de retour explicite
const name = user?.profile?.firstName         // optionnel non géré

// ✅ Obligatoire
const data: SignupRow = response
function getUser(): Promise<UserProfile | null> { ... }
const name = user?.profile?.firstName ?? 'Bénévole'
```

### Types Supabase — génération automatique
Après toute modification du schéma, régénérer les types :
```bash
pnpm supabase gen types typescript --project-id <project-id> \
  > shared/types/supabase.ts
```
Importer depuis `@agpe/shared/types/supabase` — ne jamais écrire les types DB à la main.

---

## 2. Structure des fichiers React

### Règle : un composant = un fichier
```
components/
  volunteer/
    StandCard.tsx         ← composant + ses types locaux
    StandCard.test.tsx    ← tests (si implémentés)
```

### Nommage
| Élément | Convention | Exemple |
|---------|------------|---------|
| Fichiers composants | PascalCase | `StandCard.tsx` |
| Fichiers hooks | camelCase préfixé `use` | `useActiveEvent.ts` |
| Fichiers utilitaires | kebab-case | `csv-export.ts` |
| Variables/fonctions | camelCase | `activeEvent`, `handleSignup` |
| Types/Interfaces | PascalCase | `StandWithSlots` |
| Constantes | SCREAMING_SNAKE | `MAX_SLOTS_PER_STAND` |

### Structure type d'un composant
```typescript
// 1. Imports (externes d'abord, internes ensuite)
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useSignups } from '@/hooks/useSignups'
import type { SlotRow } from '@agpe/shared/types/supabase'

// 2. Types locaux
interface SlotRowProps {
  slot: SlotRow
  currentCount: number
  isSignedUp: boolean
  onSignup: (slotId: string) => Promise<void>
  onUnsignup: (slotId: string) => Promise<void>
  isPastEvent: boolean
}

// 3. Composant (function declaration, pas arrow function pour les exports)
export function SlotRow({
  slot,
  currentCount,
  isSignedUp,
  onSignup,
  onUnsignup,
  isPastEvent,
}: SlotRowProps) {
  // 3a. Hooks en premier
  const [loading, setLoading] = useState(false)

  // 3b. Dérivations (pas de state inutile)
  const isFull = currentCount >= slot.max_volunteers
  const remaining = slot.max_volunteers - currentCount

  // 3c. Handlers
  async function handleSignup() {
    setLoading(true)
    try {
      await onSignup(slot.id)
    } finally {
      setLoading(false)
    }
  }

  // 3d. Rendu
  return (
    // ...
  )
}
```

---

## 3. Hooks custom

### Règle : la logique Supabase va dans les hooks, pas dans les composants
```typescript
// ❌ Ne pas faire dans un composant
const { data } = await supabase.from('kermesse_stands').select('*')

// ✅ Faire dans un hook
// hooks/useStands.ts
export function useStands(eventId: string) {
  const [stands, setStands] = useState<StandRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const { data, error } = await supabase
        .from('kermesse_stands')
        .select('*, kermesse_slots(*)')
        .eq('event_id', eventId)

      if (error) setError(error.message)
      else setStands(data ?? [])
      setLoading(false)
    }
    void fetch()
  }, [eventId])

  return { stands, loading, error }
}
```

### Interface systématique des hooks de données
Tout hook de données retourne `{ data, loading, error }` ou variante nommée :
```typescript
return {
  stands,      // données (jamais undefined — tableau vide si rien)
  loading,     // boolean
  error,       // string | null
  refetch,     // () => void — déclencher un rechargement manuel
}
```

---

## 4. Gestion des erreurs

### Toujours typer les erreurs Supabase
```typescript
import type { PostgrestError } from '@supabase/supabase-js'

const { data, error } = await supabase
  .from('kermesse_signups')
  .insert({ slot_id, user_id: session.user.id })

if (error) {
  // Détecter l'erreur trigger "créneau complet"
  if (error.message.includes('Créneau complet')) {
    toast.error('Ce créneau vient d\'être complet. Choisissez un autre créneau.')
  } else if (error.code === '23505') {
    toast.error('Vous êtes déjà inscrit sur ce créneau.')
  } else {
    toast.error('Une erreur est survenue. Réessayez dans quelques instants.')
    console.error('[kermesse] signup error:', error)
  }
  return
}
toast.success('Inscription confirmée ✓')
```

### Ne jamais afficher les messages d'erreur DB bruts à l'utilisateur
Mapper les codes PostgreSQL vers des messages français lisibles.

---

## 5. Accès Supabase

### Une seule source d'import
```typescript
// ✅ Toujours
import { supabase } from '@agpe/shared/supabase-client'

// ❌ Jamais dans une app
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(...)
```

### Typer les requêtes avec les types générés
```typescript
import type { Database } from '@agpe/shared/types/supabase'
import { createClient } from '@supabase/supabase-js'

// Dans shared/supabase-client.ts uniquement :
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

---

## 6. Protection des routes

### Route guard — pattern obligatoire
```typescript
// lib/role-guard.ts
import { Navigate } from 'react-router-dom'
import { useAuth } from '@agpe/shared/auth/useAuth'

interface Props {
  children: React.ReactNode
  requiredRole: 'admin' | 'volunteer'
}

export function RoleGuard({ children, requiredRole }: Props) {
  const { session, role, loading } = useAuth()

  if (loading) return <LoadingSkeleton />
  if (!session) return <Navigate to="/login" replace />
  if (requiredRole === 'admin' && role !== 'admin') {
    return <Navigate to="/volunteer/stands" replace />
  }

  return <>{children}</>
}
```

---

## 7. Accessibilité (obligatoire)

```typescript
// ❌ Bouton icône sans label
<Button onClick={handleDelete}><Trash /></Button>

// ✅ aria-label obligatoire sur les boutons icônes
<Button onClick={handleDelete} aria-label="Supprimer le stand">
  <Trash className="h-4 w-4" />
</Button>

// ✅ États de chargement annoncés
<Button disabled={loading} aria-busy={loading}>
  {loading ? 'Inscription...' : 'S\'inscrire'}
</Button>

// ✅ Messages d'erreur liés aux champs
<Input id="email" aria-describedby="email-error" />
{error && <p id="email-error" role="alert">{error}</p>}
```

Règles minimales :
- Touch targets minimum `44px × 44px` sur mobile
- Contraste texte ≥ 4.5:1 (WCAG AA) — vérifier avec les tokens Tailwind retenus
- Navigation clavier fonctionnelle (Tab, Enter, Escape sur les modales)
- `role="alert"` sur les toasts et messages d'erreur

---

## 8. Patterns à proscrire

```typescript
// ❌ State dérivé inutile
const [isFull, setIsFull] = useState(false)
useEffect(() => setIsFull(count >= max), [count, max])
// ✅ Constante dérivée directe
const isFull = count >= max

// ❌ useEffect pour des transformations de données
useEffect(() => { setFilteredStands(stands.filter(...)) }, [stands])
// ✅ useMemo ou variable dérivée
const filteredStands = stands.filter(...)

// ❌ Logique dans le JSX
{stands.filter(s => s.event_id === activeEvent?.id).map(...)}
// ✅ Variable nommée avant le return
const activeStands = stands.filter(s => s.event_id === activeEvent?.id)

// ❌ Pas de void sur les Promises non attendues
useEffect(() => { fetchData() }, [])
// ✅
useEffect(() => { void fetchData() }, [])

// ❌ Non-null assertion sans filet
const id = user!.id
// ✅ Vérification explicite
if (!user) return null
const id = user.id
```

---

## 9. Variables d'environnement

```typescript
// Déclarer dans apps/kermesse/src/vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ADMIN_EMAIL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

Ne jamais écrire de valeur en dur (URL, clés) dans le code source.

---

## 10. Export CSV — règles spécifiques

Le CSV doit :
- Être généré **entièrement côté client** (pas de fetch serveur)
- Utiliser le **séparateur `;`** (compatibilité Excel FR)
- Inclure un **BOM UTF-8** (`\uFEFF`) en début de fichier pour éviter les problèmes d'accents dans Excel
- Se télécharger via `URL.createObjectURL` + clic programmatique sur `<a download>`

```typescript
// lib/csv-export.ts — structure attendue
export function generateCsv(rows: SignupExportRow[]): string {
  const BOM = '\uFEFF'
  const headers = ['Email;Prénom;Nom;Stand;Créneau;Date inscription']
  const lines = rows.map(r =>
    [r.email, r.firstName, r.lastName, r.standName,
     `${r.startTime} → ${r.endTime}`, r.createdAt].join(';')
  )
  return BOM + [headers, ...lines].join('\n')
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
```
