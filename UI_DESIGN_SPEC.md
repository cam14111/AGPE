# UI Design Spec — App Kermesse AGPE
**Framework** : shadcn/ui + Tailwind CSS  
**Cible** : mobile-first (375px iPhone SE minimum), utilisable sur desktop  
**Langue** : interface entièrement en français

---

## 1. Palette de couleurs

### Tokens principaux (configurer dans `tailwind.config.ts`)
```typescript
// Inspiration : fête foraine → chaleureux, festif, lisible en plein soleil
colors: {
  // Primaire — violet doux, associatif (ni trop corporate, ni trop enfantin)
  primary: {
    DEFAULT: '#6366f1', // indigo-500
    foreground: '#ffffff',
    hover: '#4f46e5',   // indigo-600
  },
  // Accent — ambre chaud, festif
  accent: {
    DEFAULT: '#f59e0b', // amber-400
    foreground: '#1c1917',
  },
  // Sémantique
  success: '#10b981',   // emerald-500  → créneau disponible
  warning: '#f97316',   // orange-500   → presque complet (>75%)
  danger:  '#ef4444',   // red-500      → complet / erreur
}
```

### Usage strict des couleurs sémantiques
| Contexte | Couleur | Classe Tailwind |
|----------|---------|----------------|
| Créneau disponible | success | `text-emerald-600 bg-emerald-50` |
| Créneau presque complet (≥75%) | warning | `text-orange-600 bg-orange-50` |
| Créneau complet | danger | `text-red-600 bg-red-50` |
| Action principale (s'inscrire) | primary | `bg-indigo-600 hover:bg-indigo-700` |
| Bouton destructif (supprimer) | danger | `bg-red-600 hover:bg-red-700` |
| Bouton secondaire | neutral | `variant="outline"` shadcn |
| Bannière info (profil optionnel) | accent | `bg-amber-50 border-amber-200` |

---

## 2. Typographie

```typescript
// vite.config.ts ou index.html — Google Fonts
// Display : Inter — propre, lisible, neutre
// Body : Inter (même famille, poids différents)

fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
}
```

### Échelle typographique
| Rôle | Classe | Usage |
|------|--------|-------|
| Titre de page | `text-2xl font-bold text-slate-900` | `<h1>` |
| Titre de section | `text-lg font-semibold text-slate-800` | `<h2>` |
| Nom de stand | `text-base font-semibold text-slate-800` | Card title |
| Corps de texte | `text-sm text-slate-600` | Descriptions |
| Méta-info | `text-xs text-slate-400` | Heure, lieu |
| Badge / Statut | `text-xs font-medium` | Status badges |

---

## 3. Composants shadcn/ui — mapping par feature

### Authentification
```
Page Login
├── Card           → Conteneur centré (max-w-sm mx-auto)
├── CardHeader     → Logo AGPE + titre "Connexion bénévole"
├── CardContent    → Input[type=email] + Button "Recevoir mon lien"
└── CardFooter     → Texte d'explication du magic link
```

### Vue bénévole — liste des stands
```
Page StandsList
├── Header sticky  → Logo + "Kermesse [nom]" + Button "Mon planning"
├── EventBanner    → Date, lieu (Card couleur accent/ambre)
└── Pour chaque stand :
    └── Card
        ├── CardHeader  → Emoji (text-3xl) + nom stand + lieu
        ├── CardContent → Description (optionnelle, texte court)
        └── SlotsList   → Pour chaque créneau :
            └── div flex → Heure | Badge statut | Button inscription
```

### Badges de statut créneau
```typescript
// 3 états possibles uniquement
function SlotBadge({ current, max }: { current: number; max: number }) {
  const isFull = current >= max
  const isAlmostFull = current / max >= 0.75

  if (isFull) {
    return <Badge variant="destructive">Complet</Badge>
  }
  if (isAlmostFull) {
    return <Badge className="bg-orange-100 text-orange-700 border-orange-200">
      {max - current} place{max - current > 1 ? 's' : ''}
    </Badge>
  }
  return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
    {max - current} place{max - current > 1 ? 's' : ''}
  </Badge>
}
```

### Tableau de bord admin
```
Page Dashboard
├── KPI Cards (grid 2 colonnes sur mobile, 4 sur desktop)
│   ├── Card "Bénévoles inscrits" → chiffre + icône Users
│   ├── Card "Créneaux complets" → X/Y + Progress
│   ├── Card "Créneaux non pourvus" → chiffre + couleur danger si > 0
│   └── Card "Stands incomplets" → chiffre
├── Button "Exporter CSV" → variant outline + icône Download
└── DataTable (Table shadcn/ui)
    ├── Colonnes : Stand | Créneau | Inscrits | Places restantes
    └── Tri par défaut : créneaux non pourvus en premier
```

### Formulaires CRUD admin
```
Pattern : Dialog (modale) pour les formulaires courts
├── DialogTrigger → Button "Nouveau stand" / "Modifier"
├── DialogContent
│   ├── DialogHeader → titre de l'action
│   ├── Form fields (Input, Textarea, Select shadcn/ui)
│   └── DialogFooter → Button "Annuler" + Button "Enregistrer"
└── Toast → confirmation ou erreur après submit
```

---

## 4. Layout et navigation

### Mobile (priorité absolue)

**Bénévoles** — Navigation par onglets en bas (bottom nav) :
```
┌─────────────────────────┐
│  Header : Kermesse 2026 │
│  [Logo] [Mon compte]    │
├─────────────────────────┤
│                         │
│   Contenu principal     │
│                         │
│                         │
├─────────────────────────┤
│  🎯 Stands │ 📅 Planning │  ← Bottom nav sticky
└─────────────────────────┘
```

**Admin** — Sidebar masquée sur mobile, accessible via hamburger :
```
┌─────────────────────────┐
│  ☰ Admin Kermesse       │  ← Header avec hamburger
├─────────────────────────┤
│                         │
│   Contenu principal     │
│   (tableau de bord,     │
│    formulaires...)      │
│                         │
└─────────────────────────┘

[Menu ouvert]
┌──────────────────────────────────┐
│  × Fermer                        │
│  ─────────────────               │
│  📊 Tableau de bord              │
│  📅 Événements                   │
│  🎯 Stands                       │
│  🕐 Créneaux                     │
└──────────────────────────────────┘
```

### Desktop (secondaire)
- Admin : sidebar fixe à gauche (240px), contenu à droite
- Bénévole : tabs en haut ou layout à une colonne centré (max-w-2xl)

---

## 5. États des composants (obligatoires)

Chaque composant qui charge des données doit gérer **3 états** :

### Loading — Skeleton (pas de spinner générique)
```typescript
// Utiliser le composant Skeleton de shadcn/ui
// Imiter la forme du contenu final
function StandCardSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <Skeleton className="h-6 w-1/3" />   {/* titre */}
      <Skeleton className="h-4 w-2/3" />   {/* description */}
      <Skeleton className="h-10 w-full" /> {/* créneau */}
      <Skeleton className="h-10 w-full" />
    </div>
  )
}
```

### Empty — Message orienté action
```typescript
// Pas de "Aucun résultat." sec
function EmptyStands() {
  return (
    <div className="text-center py-12 text-slate-500">
      <p className="text-lg">Aucun stand n'a encore été créé.</p>
      {isAdmin && (
        <Button className="mt-4" onClick={openCreateDialog}>
          Créer le premier stand
        </Button>
      )}
    </div>
  )
}
```

### Error — Message + action de récupération
```typescript
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center py-8">
      <p className="text-red-600">Impossible de charger les données.</p>
      <Button variant="outline" className="mt-3" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  )
}
```

---

## 6. Feedback utilisateur — règles Toast

Utiliser `sonner` (intégré avec shadcn/ui) :

| Action | Type | Message |
|--------|------|---------|
| Inscription réussie | `toast.success` | "Inscription confirmée ✓" |
| Désinscription réussie | `toast.success` | "Désinscription confirmée" |
| Créneau complet (trigger DB) | `toast.error` | "Ce créneau vient d'être complet. Choisissez-en un autre." |
| Déjà inscrit (conflict) | `toast.warning` | "Vous êtes déjà inscrit sur ce créneau." |
| Erreur générique | `toast.error` | "Une erreur est survenue. Réessayez dans quelques instants." |
| Magic link envoyé | `toast.info` | "Lien de connexion envoyé ! Vérifiez vos emails." |
| Sauvegarde admin réussie | `toast.success` | "Enregistré avec succès." |
| Suppression réussie | `toast.success` | "Supprimé." |

Position des toasts : `bottom-center` sur mobile, `bottom-right` sur desktop.

---

## 7. Bannière profil optionnel

```typescript
// Affichée si : session active ET agpe_users_profile.first_name est null/vide
// Masquée définitivement après remplissage du profil
function ProfileBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3
                    bg-amber-50 border-b border-amber-200 text-sm">
      <span>👋</span>
      <span className="text-amber-800 flex-1">
        Complétez votre profil pour que les organisateurs vous retrouvent facilement.
      </span>
      <Link to="/profil"
            className="text-amber-700 font-medium underline underline-offset-2">
        Compléter
      </Link>
    </div>
  )
}
```

---

## 8. Règles mobile strictes

| Règle | Valeur |
|-------|--------|
| Touch targets | Minimum `44px × 44px` — agrandir via `min-h-11 min-w-11` |
| Espacements entre éléments interactifs | Minimum `8px` |
| Texte lisible sans zoom | Minimum `16px` (`text-base`) pour les inputs |
| Empêcher le zoom iOS sur focus input | `font-size: 16px` sur les `<input>` |
| Bouton "S'inscrire" | Pleine largeur sur mobile (`w-full`) |
| Modales/Dialog | `max-h-[90vh] overflow-y-auto` pour éviter les débordements |
| Tableau admin | `overflow-x-auto` sur le wrapper — scrollable horizontalement |
