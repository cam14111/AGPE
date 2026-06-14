# PRD — App Kermesse AGPE
**Version** : 1.0 — MVP  
**Statut** : Validé  
**Dernière mise à jour** : juin 2026

---

## 1. Vision & objectif produit

Permettre à l'AGPE d'organiser sa kermesse annuelle sans dépendre d'un outil tiers,
en offrant aux organisateurs un tableau de bord simple et aux parents bénévoles
une expérience d'inscription fluide en moins de 30 secondes sur mobile.

**Problème résolu** : aujourd'hui, la coordination des bénévoles se fait par email
et tableau Excel partagé — source de conflits de données, d'inscriptions en double,
et de créneaux non pourvus découverts le jour J.

**Indicateurs de succès MVP** :
- 100 % des créneaux visibles par les parents via un lien partagé (WhatsApp, email)
- Zéro dépassement de capacité par créneau (garanti par la DB)
- L'admin peut exporter la liste complète des inscrits en 1 clic
- Un parent non technique s'inscrit sans aide en < 60 secondes

---

## 2. Périmètre MVP

### Inclus ✅
- Création et gestion de l'événement kermesse (date, lieu, horaires)
- Création et gestion des stands (nom, emoji, emplacement)
- Création et gestion des créneaux horaires par stand (heure, capacité)
- Inscription / désinscription des parents bénévoles
- Vue "Mon planning" pour les bénévoles
- Tableau de bord admin avec indicateurs de remplissage
- Export CSV des inscriptions
- Authentification sans mot de passe (magic link email)
- Support multi-éditions (kermesse 2026, 2027…)

### Exclu du MVP ❌
- Paiements, adhésions, billetterie
- Chat ou messagerie entre membres
- Application mobile native (iOS / Android)
- Notifications SMS
- Intégration calendrier (Google Calendar, Outlook)
- Gestion des présences le jour J
- Interface multilingue
- Statistiques historiques multi-années

---

## 3. Personas

### Marie — Organisatrice AGPE (rôle : admin)
- 42 ans, enseignante, trésorière de l'AGPE
- Prépare la kermesse 6 semaines à l'avance
- Utilise principalement un PC sous Windows
- Frustration actuelle : relancer individuellement chaque bénévole, gérer les conflits d'inscription
- Besoin clé : voir en temps réel qui s'est inscrit où, identifier les manques, exporter la liste

### Sophie — Parent bénévole (rôle : volunteer)
- 35 ans, salariée, 1 enfant en CE2
- Reçoit le lien de la kermesse par le groupe WhatsApp de classe
- Utilise son iPhone 13, souvent entre deux réunions
- Frustration actuelle : devoir créer un compte sur chaque site de l'école
- Besoin clé : s'inscrire sur un créneau en moins de 30 secondes, sans mot de passe

---

## 4. User stories

### Authentification

| ID | En tant que | Je veux | Pour |
|----|-------------|---------|------|
| AUTH-01 | Tout utilisateur | Recevoir un lien de connexion par email | Me connecter sans mémoriser un mot de passe |
| AUTH-02 | Tout utilisateur | Rester connecté lors de mes visites suivantes | Ne pas devoir me reconnecter à chaque fois |
| AUTH-03 | Admin | Être reconnu automatiquement comme admin dès ma première connexion | Accéder immédiatement au tableau de bord |

**Critères d'acceptation AUTH-01** :
- La page `/login` affiche un champ email + bouton "Recevoir mon lien"
- Un toast confirme l'envoi ("Vérifiez vos emails")
- Le lien reçu redirige vers l'app et établit la session sans saisie supplémentaire
- Si l'email est invalide, un message d'erreur s'affiche immédiatement

---

### Gestion événement (admin)

| ID | En tant que | Je veux | Pour |
|----|-------------|---------|------|
| EVT-01 | Admin | Créer une kermesse avec nom, date, lieu et horaires | Initialiser l'édition annuelle |
| EVT-02 | Admin | Modifier les informations d'une kermesse existante | Corriger une erreur ou mettre à jour le lieu |
| EVT-03 | Admin | Activer une édition de la kermesse | Rendre les stands visibles aux bénévoles |
| EVT-04 | Admin | Gérer plusieurs éditions (2026, 2027…) | Préparer la prochaine année sans perdre l'historique |

**Critères d'acceptation EVT-03** :
- Un seul événement peut être actif simultanément (garanti en base de données)
- Le toggle "Activer" sur une édition désactive automatiquement l'édition précédente
- Un message de confirmation est demandé avant activation
- Les bénévoles voient immédiatement le nouvel événement actif sans action de leur part

---

### Gestion stands & créneaux (admin)

| ID | En tant que | Je veux | Pour |
|----|-------------|---------|------|
| STD-01 | Admin | Créer un stand avec nom, description, emplacement et emoji | Donner une identité visuelle à chaque activité |
| STD-02 | Admin | Modifier ou supprimer un stand | Corriger les informations ou supprimer une activité annulée |
| STD-03 | Admin | Créer des créneaux horaires pour chaque stand | Définir les rotations de bénévoles |
| STD-04 | Admin | Définir le nombre de bénévoles nécessaires par créneau | Adapter la capacité à l'activité |
| STD-05 | Admin | Voir le taux de remplissage de chaque créneau en un coup d'œil | Identifier rapidement les manques |

**Critères d'acceptation STD-05** :
- Chaque créneau affiche "X / Y inscrits" (ex : "2 / 3")
- Une barre de progression ou un badge coloré indique le statut (vert = dispo, rouge = complet)
- Les créneaux sans aucun inscrit sont visuellement mis en avant

---

### Inscription bénévole

| ID | En tant que | Je veux | Pour |
|----|-------------|---------|------|
| VOL-01 | Bénévole | Voir tous les stands et créneaux de la kermesse active | Choisir où je veux aider |
| VOL-02 | Bénévole | Voir clairement les créneaux disponibles vs. complets | Ne pas tenter de m'inscrire sur un créneau plein |
| VOL-03 | Bénévole | M'inscrire sur un créneau en 1 clic | Aller vite entre deux obligations |
| VOL-04 | Bénévole | Me désinscrire d'un créneau avant la date de la kermesse | Libérer ma place si mes disponibilités changent |
| VOL-05 | Bénévole | Voir un récapitulatif de mes inscriptions ("Mon planning") | Vérifier mes engagements avant le jour J |

**Critères d'acceptation VOL-03** :
- Le bouton "S'inscrire" est désactivé si le créneau est complet
- L'inscription est confirmée par un toast immédiat ("Inscription confirmée ✓")
- Si le créneau se remplit entre l'affichage et le clic (race condition), le trigger DB renvoie une erreur lisible : "Ce créneau vient d'être complet, choisissez un autre créneau"
- Après inscription, le bouton devient "Se désinscrire" sans recharger la page

**Critères d'acceptation VOL-04** :
- Le bouton "Se désinscrire" est masqué (pas seulement désactivé) après la date de la kermesse
- Une confirmation est demandée avant désinscription ("Confirmer la désinscription ?")

---

### Tableau de bord admin

| ID | En tant que | Je veux | Pour |
|----|-------------|---------|------|
| DSH-01 | Admin | Voir le nombre total de bénévoles inscrits | Avoir une vue globale de la mobilisation |
| DSH-02 | Admin | Voir les créneaux non pourvus (0 inscrit) | Relancer les parents sur les manques critiques |
| DSH-03 | Admin | Voir les stands avec au moins un créneau incomplet | Cibler mes actions de communication |
| DSH-04 | Admin | Exporter la liste complète des inscrits en CSV | La transmettre aux responsables de stand le jour J |

**Critères d'acceptation DSH-04** :
- Le CSV contient : email, prénom (si renseigné), nom (si renseigné), stand, créneau (heure début → heure fin), date d'inscription
- Le fichier se télécharge immédiatement sans rechargement de page
- Le nom du fichier suit le format : `kermesse_inscrits_YYYY-MM-DD.csv`
- Les données sont encodées en UTF-8 avec BOM (compatibilité Excel FR)

---

## 5. Règles métier

| Règle | Portée | Niveau d'application |
|-------|--------|---------------------|
| Un bénévole ne peut s'inscrire qu'une fois par créneau | kermesse_signups | Contrainte UNIQUE en DB |
| Un créneau ne peut pas dépasser max_volunteers inscrits | kermesse_signups | Trigger PostgreSQL BEFORE INSERT |
| Un seul événement peut être actif à la fois | kermesse_events | Index partiel UNIQUE WHERE is_active = TRUE |
| La désinscription est impossible après la date de la kermesse | Frontend | Check date côté UI (le backend accepte toujours la requête DELETE) |
| Seul l'admin peut créer/modifier/supprimer stands et créneaux | Toutes les tables admin | RLS Supabase |
| Un bénévole ne voit que ses propres inscriptions | kermesse_signups | RLS Supabase |

---

## 6. Exigences non fonctionnelles

| Critère | Cible |
|---------|-------|
| Performance | Affichage initial < 2s sur 4G |
| Mobile | Utilisable sur iPhone SE (375px) sans scroll horizontal |
| Accessibilité | WCAG 2.1 AA minimum — navigation clavier, contrastes |
| Disponibilité | GitHub Pages + Supabase free tier (~99% uptime acceptable) |
| Données | Pas de données sensibles (emails uniquement, pas de données bancaires) |
| Sécurité | RLS actif sur toutes les tables — aucune donnée accessible sans auth |
