# CAHIER DES CHARGES - SPIKE TRACK

**Application d'annotation collaborative de vidéos de volleyball**

---

## 1. PRÉSENTATION GÉNÉRALE

### 1.1 Objectif de l'application

**Spike Track** est une plateforme web collaborative permettant d'annoter des frames de vidéos de matchs de volleyball pour l'entraînement de modèles de machine learning (TrackNetV4).

Les utilisateurs annotent frame par frame la position du ballon de volleyball ou marquent les frames où le ballon n'est pas visible.

### 1.2 Cas d'usage principal

1. Un utilisateur se connecte via Google OAuth
2. Il accède à son tableau de bord listant les vidéos disponibles
3. Il sélectionne une vidéo à annoter
4. Il annote chaque frame en cliquant sur la position du ballon ou en marquant "pas de balle"
5. Sa progression est sauvegardée automatiquement
6. Il peut reprendre son travail à tout moment
7. Une fois terminé, la vidéo passe en statut "complétée"

---

## 2. STACK TECHNIQUE

### 2.1 Technologies Backend

| Technologie | Version | Rôle |
|------------|---------|------|
| Next.js | 15.2.3 | Framework full-stack avec App Router |
| tRPC | 11.0.0 | API type-safe (RPC over HTTP) |
| PostgreSQL | - | Base de données relationnelle |
| Drizzle ORM | 0.41.0 | ORM TypeScript avec schema type-safe |
| Better Auth | 1.3 | Authentification OAuth 2.0 |
| Zod | 3.24.2 | Validation de schémas TypeScript |
| Cloudinary | 2.8.0 | Hébergement et CDN pour les images |

### 2.2 Technologies Frontend

| Technologie | Version | Rôle |
|------------|---------|------|
| React | 19.0.0 | Bibliothèque UI |
| TypeScript | 5.8.2 | Langage principal |
| Tailwind CSS | 4.0.15 | Framework CSS utilitaire |
| Radix UI | - | Composants UI headless accessibles |
| TanStack Query | 5.69.0 | Gestion du cache et état serveur |
| Lucide React | 0.562.0 | Bibliothèque d'icônes |
| next-themes | 0.4.6 | Gestion dark/light mode |
| Sonner | 2.0.7 | Notifications toast |

### 2.3 Outils de développement

- **ESLint 9** : Linting du code
- **Prettier 3.5** : Formatage automatique
- **Drizzle Kit** : Migrations de base de données
- **Next.js Turbo** : Build ultra-rapide en développement

---

## 3. ARCHITECTURE DE L'APPLICATION

### 3.1 Structure de fichiers

```
spike-track/
├── src/
│   ├── app/                          # Pages Next.js (App Router)
│   │   ├── page.tsx                  # Page racine (redirection)
│   │   ├── layout.tsx                # Layout racine avec providers
│   │   ├── api/
│   │   │   ├── auth/[...all]/        # Handler Better Auth
│   │   │   └── trpc/[trpc]/          # Handler tRPC HTTP
│   │   ├── (auth)/                   # Groupe de layout auth
│   │   │   ├── login/                # Page de connexion
│   │   │   └── register/             # Page d'inscription
│   │   ├── (app)/                    # Groupe de layout protégé
│   │   │   ├── layout.tsx            # Layout avec sidebar
│   │   │   ├── dashboard/            # Tableau de bord principal
│   │   │   └── annotate/[videoId]/   # Interface d'annotation
│   │   └── _components/              # Composants spécifiques pages
│   │       ├── app-sidebar.tsx       # Sidebar de navigation
│   │       └── annotation/           # Composants d'annotation
│   ├── components/                   # Composants UI réutilisables
│   │   └── ui/                       # Primitives Radix personnalisées
│   ├── hooks/                        # Hooks React personnalisés
│   ├── lib/                          # Utilitaires
│   │   ├── cloudinary.ts             # Client Cloudinary
│   │   ├── cloudinary.server.ts      # Server Cloudinary
│   │   └── utils.ts                  # Utilitaires généraux
│   ├── server/
│   │   ├── api/                      # Logique backend tRPC
│   │   │   ├── trpc.ts               # Configuration tRPC
│   │   │   ├── root.ts               # Router racine
│   │   │   └── routers/              # Routers par domaine
│   │   │       ├── annotation.ts     # Procédures d'annotation
│   │   │       ├── video.ts          # Gestion des vidéos
│   │   │       └── auth.ts           # Session utilisateur
│   │   ├── db/
│   │   │   ├── index.ts              # Connexion PostgreSQL
│   │   │   └── schema.ts             # Schéma Drizzle ORM
│   │   └── better-auth/              # Configuration auth
│   ├── trpc/                         # Configuration client tRPC
│   ├── styles/                       # CSS global
│   ├── env.js                        # Validation variables d'env
│   └── middleware.ts                 # Protection des routes
├── public/                           # Fichiers statiques
├── scripts/                          # Scripts utilitaires
├── package.json                      # Dépendances
├── drizzle.config.ts                 # Config Drizzle
├── tsconfig.json                     # Config TypeScript
└── .env                              # Variables d'environnement
```

### 3.2 Schéma de base de données (PostgreSQL)

#### Table `user` (gérée par Better Auth)
```sql
CREATE TABLE spike-track_user (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  emailVerified BOOLEAN NOT NULL DEFAULT false,
  image TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### Table `session` (gérée par Better Auth)
```sql
CREATE TABLE spike-track_session (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES spike-track_user(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### Table `account` (gérée par Better Auth)
```sql
CREATE TABLE spike-track_account (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES spike-track_user(id) ON DELETE CASCADE,
  providerId TEXT NOT NULL,
  accountId TEXT NOT NULL,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt TIMESTAMP,
  refreshTokenExpiresAt TIMESTAMP,
  scope TEXT,
  password TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### Table `videos`
```sql
CREATE TABLE spike-track_videos (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cloudinaryFolder VARCHAR(512) NOT NULL,  -- Chemin Cloudinary
  totalFrames INTEGER NOT NULL,
  fps INTEGER NOT NULL DEFAULT 30,
  width INTEGER,
  height INTEGER,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_videos_name ON spike-track_videos(name);
CREATE INDEX idx_videos_createdAt ON spike-track_videos(createdAt);
```

**Colonnes importantes** :
- `cloudinaryFolder` : chemin vers les frames dans Cloudinary (ex: `volleyball/reims_amiens_test`)
- `totalFrames` : nombre total de frames dans la vidéo
- `fps` : frames par seconde (30 par défaut)

#### Table `annotations`
```sql
CREATE TABLE spike-track_annotations (
  id SERIAL PRIMARY KEY,
  videoId INTEGER NOT NULL REFERENCES spike-track_videos(id) ON DELETE CASCADE,
  userId TEXT NOT NULL REFERENCES spike-track_user(id) ON DELETE CASCADE,
  frameNumber INTEGER NOT NULL,  -- Index 0-based
  x REAL,                        -- Coordonnée X (NULL si ballVisible=false)
  y REAL,                        -- Coordonnée Y (NULL si ballVisible=false)
  ballVisible BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_annotation_per_user_frame
    UNIQUE(videoId, userId, frameNumber)
);

CREATE INDEX idx_annotations_video_frame ON spike-track_annotations(videoId, frameNumber);
CREATE INDEX idx_annotations_user_video ON spike-track_annotations(userId, videoId);
CREATE INDEX idx_annotations_videoId ON spike-track_annotations(videoId);
CREATE INDEX idx_annotations_userId ON spike-track_annotations(userId);
```

**Contraintes importantes** :
- **UNIQUE(videoId, userId, frameNumber)** : un utilisateur ne peut avoir qu'une seule annotation par frame
- Les coordonnées `x` et `y` sont en pixels relatifs à l'image affichée
- `ballVisible=false` signifie "pas de balle visible" (x et y sont NULL)

#### Table `userVideoProgress`
```sql
CREATE TABLE spike-track_userVideoProgress (
  id SERIAL PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES spike-track_user(id) ON DELETE CASCADE,
  videoId INTEGER NOT NULL REFERENCES spike-track_videos(id) ON DELETE CASCADE,
  lastAnnotatedFrame INTEGER NOT NULL DEFAULT -1,
  totalAnnotated INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress',  -- 'in_progress' | 'completed'
  startedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  lastActivity TIMESTAMP NOT NULL DEFAULT NOW(),
  completedAt TIMESTAMP,

  CONSTRAINT unique_user_video_progress
    UNIQUE(userId, videoId)
);

CREATE INDEX idx_progress_userId ON spike-track_userVideoProgress(userId);
CREATE INDEX idx_progress_videoId ON spike-track_userVideoProgress(videoId);
CREATE INDEX idx_progress_status ON spike-track_userVideoProgress(status);
```

**Rôle** : Suivi de la progression de chaque utilisateur sur chaque vidéo
- `lastAnnotatedFrame` : dernier frame annoté (-1 si aucun)
- `totalAnnotated` : nombre total de frames annotés
- `status` : 'in_progress' ou 'completed'
- `lastActivity` : dernière action (pour calculer le temps de session)

#### Diagramme de relations

```
user ──┬─→ session
       ├─→ account
       ├─→ annotations ──→ videos
       └─→ userVideoProgress ──→ videos
```

---

## 4. API tRPC (BACKEND)

### 4.1 Router `annotation`

Toutes les procédures sont **protégées** (authentification requise).

#### **Query : `getMyProgress`**

Récupère la progression de l'utilisateur actuel sur toutes les vidéos.

**Input** : aucun

**Output** :
```typescript
{
  current?: {
    id: number
    name: string
    totalFrames: number
    fps: number
    percentComplete: number
  }
  available: Array<{
    id: number
    name: string
    totalFrames: number
    fps: number
  }>
  completed: Array<{
    id: number
    name: string
    totalFrames: number
    fps: number
    completedAt: Date
  }>
}
```

**Logique** :
1. Récupère toutes les vidéos
2. Pour chaque vidéo, vérifie la progression de l'utilisateur
3. Classe en 3 catégories :
   - `current` : vidéo en cours (status='in_progress')
   - `available` : vidéos non commencées
   - `completed` : vidéos terminées (status='completed')

#### **Query : `getNextFrame`**

Récupère le prochain frame à annoter pour une vidéo donnée.

**Input** :
```typescript
{
  videoId: number
}
```

**Output** :
```typescript
{
  completed: boolean
  frameNumber?: number
  imageUrl?: string
  previousAnnotations: Array<{
    frameNumber: number
    x: number
    y: number
  }>
  progress: {
    current: number
    total: number
    annotated: number
    percentComplete: number
  }
}
```

**Logique** :
1. Crée l'enregistrement de progression si premier accès
2. Génère une série de tous les frames possibles (0 à totalFrames-1)
3. Fait un LEFT JOIN avec les annotations existantes
4. Retourne le premier frame sans annotation
5. Si tous annotés : `completed: true` et marque le statut 'completed'
6. Charge les 5 dernières annotations avec balle visible comme référence visuelle
7. Génère l'URL Cloudinary du frame via `getFrameUrl()`

**Requête SQL clé** :
```sql
WITH all_frames AS (
  SELECT generate_series(0, totalFrames - 1) AS frameNumber
)
SELECT af.frameNumber
FROM all_frames af
LEFT JOIN annotations a ON a.frameNumber = af.frameNumber AND a.userId = $userId AND a.videoId = $videoId
WHERE a.id IS NULL
ORDER BY af.frameNumber ASC
LIMIT 1
```

#### **Mutation : `saveAnnotation`**

Sauvegarde une annotation pour un frame donné.

**Input** :
```typescript
{
  videoId: number
  frameNumber: number
  x?: number        // Requis si ballVisible=true
  y?: number        // Requis si ballVisible=true
  ballVisible: boolean
}
```

**Output** :
```typescript
{
  success: boolean
  annotation: Annotation
}
```

**Logique** :
1. Validation Zod : si `ballVisible=true`, x et y sont requis
2. **UPSERT** dans la table `annotations` :
   ```sql
   INSERT INTO annotations (videoId, userId, frameNumber, x, y, ballVisible)
   VALUES ($1, $2, $3, $4, $5, $6)
   ON CONFLICT (videoId, userId, frameNumber)
   DO UPDATE SET x = $4, y = $5, ballVisible = $6, updatedAt = NOW()
   ```
3. Met à jour `userVideoProgress` :
   - Incrémente `totalAnnotated` si nouvelle annotation
   - Met à jour `lastAnnotatedFrame`
   - Met à jour `lastActivity` à NOW()

#### **Query : `getStats`**

Récupère les statistiques en temps réel pour une session d'annotation.

**Input** :
```typescript
{
  videoId: number
}
```

**Output** :
```typescript
{
  currentFrame: number
  totalFrames: number
  annotatedCount: number
  percentComplete: number
  sessionDuration: number  // en secondes
}
```

**Logique** :
1. Récupère la progression de l'utilisateur
2. Calcule la durée de session : `NOW() - startedAt`
3. Calcule le pourcentage : `(totalAnnotated / totalFrames) * 100`

### 4.2 Router `video`

#### **Query : `getAll`**

Récupère toutes les vidéos.

**Input** : aucun

**Output** :
```typescript
Array<{
  id: number
  name: string
  cloudinaryFolder: string
  totalFrames: number
  fps: number
  width: number | null
  height: number | null
  createdAt: Date
  updatedAt: Date
}>
```

**Tri** : Par date de création décroissante

#### **Query : `getById`**

Récupère une vidéo par ID.

**Input** :
```typescript
{
  id: number
}
```

**Output** : objet `Video` unique ou `null`

### 4.3 Router `auth`

#### **Query : `getSession`**

Récupère la session de l'utilisateur actuel.

**Input** : aucun

**Output** :
```typescript
{
  session: {
    user: {
      id: string
      name: string
      email: string
      image: string
    }
    token: string
    expiresAt: Date
  }
}
```

---

## 5. AUTHENTIFICATION

### 5.1 Provider : Better Auth + Google OAuth

**Configuration** :
- Provider OAuth : Google
- Adapter : Drizzle (stockage en PostgreSQL)
- Gestion automatique des sessions, tokens, refresh

**Variables d'environnement** :
```
BETTER_AUTH_SECRET=<secret-key>
BETTER_AUTH_GOOGLE_CLIENT_ID=<google-oauth-client-id>
BETTER_AUTH_GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
```

### 5.2 Flow d'authentification

1. Utilisateur arrive sur `/`
2. Middleware vérifie la session
3. Si non authentifié → redirection `/login`
4. Clic "Sign in with Google"
5. Redirection OAuth vers Google
6. Callback → création utilisateur en DB
7. Session établie avec token
8. Redirection `/dashboard`

### 5.3 Protection des routes

**Middleware** (`src/middleware.ts`) :
- S'exécute sur toutes les routes sauf `/api/*`, `/_next/*`, `/favicon.ico`
- Vérifie la session via `auth.api.getSession()`
- Routes protégées : `/dashboard`, `/annotate/*`
- Routes réservées non-auth : `/login`, `/register`

**tRPC** :
- `protectedProcedure` : vérifie `ctx.session.user`
- Si non authentifié : erreur `UNAUTHORIZED`

---

## 6. INTÉGRATION CLOUDINARY

### 6.1 Structure de stockage

Les frames sont stockés dans Cloudinary sous forme d'images JPG individuelles.

**Structure des dossiers** :
```
{sport}/{event}/{match}/
  ├── frame_000000.jpg
  ├── frame_000001.jpg
  ├── frame_000002.jpg
  └── ...
```

**Exemple** :
```
volleyball/reims_amiens_test/
```

**Note importante** : Bug dans le script d'upload → les chemins sont dupliqués :
```
volleyball/reims_amiens_test/volleyball/reims_amiens_test/frame_000000.jpg
```

### 6.2 Génération d'URL

#### Client-side (`lib/cloudinary.ts`)
```typescript
function getFrameUrlClient(cloudinaryFolder: string, frameNumber: number): string {
  const paddedFrame = frameNumber.toString().padStart(6, '0')
  return `https://res.cloudinary.com/${cloudName}/image/upload/q_auto,f_auto/${cloudinaryFolder}/${cloudinaryFolder}/frame_${paddedFrame}.jpg`
}
```

**Usage** : Préchargement des 10 prochains frames

#### Server-side (`lib/cloudinary.server.ts`)
```typescript
function getFrameUrl(cloudinaryFolder: string, frameNumber: number): string {
  const paddedFrame = frameNumber.toString().padStart(6, '0')
  return cloudinary.url(`${cloudinaryFolder}/${cloudinaryFolder}/frame_${paddedFrame}`, {
    quality: 'auto',
    fetch_format: 'auto',
    secure: true,
    transformation: [{ width: 1920, height: 1080, crop: 'limit' }]
  })
}
```

**Usage** : Génération d'URL signées pour le frame initial

**Optimisations Cloudinary** :
- `q_auto` : qualité automatique
- `f_auto` : format automatique (WebP si supporté)
- `crop: 'limit'` : max 1920x1080 sans déformation

### 6.3 Configuration

**Variables d'environnement** :
```
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloud-name>
```

---

## 7. PAGES & INTERFACES UTILISATEUR

### 7.1 Page racine `/`

**Fichier** : `src/app/page.tsx`

**Logique** :
```typescript
- Si session existe → redirect('/dashboard')
- Sinon → redirect('/login')
```

### 7.2 Page `/login`

**Fichier** : `src/app/(auth)/login/page.tsx`

**Composants** :
- Card avec titre "Sign in to Spike Track"
- Bouton "Sign in with Google" (icône Google)
- Lien vers `/register`

**Fonctionnement** :
- Clic bouton → `authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })`
- Redirection OAuth Google
- Retour sur `/dashboard` après succès

### 7.3 Page `/dashboard`

**Fichier** : `src/app/(app)/dashboard/page.tsx`

**Requêtes** :
- `api.annotation.getMyProgress.useQuery()`

**Sections affichées** :

#### 1. **Current Video** (Vidéo en cours)
- Si une vidéo est `status='in_progress'`
- Affiche : nom, icône PlayCircle, pourcentage de complétion
- Badge avec progression
- Bouton "Continue Annotating"

#### 2. **Available Videos** (Vidéos disponibles)
- Vidéos jamais commencées par l'utilisateur
- Affiche : nom, icône Video, nombre de frames, FPS
- Bouton "Start Annotating"

#### 3. **Completed Videos** (Vidéos terminées)
- Vidéos avec `status='completed'`
- Affiche : nom, icône CheckCircle2, date de complétion
- Badge "Completed" vert

**Actions** :
- Clic "Start" ou "Continue" → navigation vers `/annotate/[videoId]`

### 7.4 Page `/annotate/[videoId]`

**Fichier** : `src/app/(app)/annotate/[videoId]/page.tsx`

**Layout** :
```
┌─────────────────────────────────────────┐
│  AnnotationStats (header)               │
│  [Frame 123/1000] [75%] [⏱️ 00:12:34]   │
├─────────────────────────────────────────┤
│                                         │
│                                         │
│        AnnotationCanvas                 │
│        (Image + SVG overlay)            │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  AnnotationControls (footer)            │
│  [Supprimer] [Pas de balle] [....]      │
└─────────────────────────────────────────┘
```

**Requêtes** :
- `api.annotation.getNextFrame.useQuery({ videoId })`
- `api.annotation.getStats.useQuery({ videoId })` (refetch toutes les 5s)

**État local** :
- `currentPoint: { x: number, y: number } | null` : position actuelle du clic
- `noBall: boolean` : si "pas de balle" est activé

**Workflow** :
1. Chargement du frame suivant non annoté
2. Affichage de l'image avec overlay SVG
3. Utilisateur clique sur l'image → `setCurrentPoint({ x, y })`
4. OU utilisateur presse `Z` → `setNoBall(true)`
5. Utilisateur presse `A` ou clique "Valider & Suivant"
6. Appel mutation `saveAnnotation`
7. Mise à jour optimiste de l'UI
8. Chargement du frame suivant

**Écran de fin** :
- Si `data.completed === true` :
  - Message "🎉 Congratulations!"
  - "You've completed all frames for this video"
  - Bouton "Back to Dashboard"

---

## 8. COMPOSANTS CLÉS

### 8.1 AnnotationCanvas

**Fichier** : `src/app/_components/annotation/AnnotationCanvas.tsx`

**Props** :
```typescript
{
  imageUrl: string
  frameNumber: number
  cloudinaryFolder: string
  totalFrames: number
  previousAnnotations: Array<{ frameNumber: number, x: number, y: number }>
  currentPoint: { x: number, y: number } | null
  onPointChange: (point: { x: number, y: number } | null) => void
}
```

**Fonctionnalités** :
1. **Affichage de l'image** :
   - Tag `<img>` avec `onLoad`, `onError`
   - Skeleton loader pendant le chargement
   - Alert si erreur

2. **SVG Overlay** :
   - Positionné en `absolute` au-dessus de l'image
   - Même dimensions que l'image
   - Dessine :
     - **Points verts** (r=5) : 5 dernières annotations visibles (référence)
     - **Point rouge** (r=8) : annotation actuelle
     - **Crosshair blanc** : curseur de sélection

3. **Gestion des clics** :
   - `onClick` sur l'image
   - Calcul des coordonnées relatives : `(e.clientX - rect.left, e.clientY - rect.top)`
   - Appel `onPointChange({ x, y })`

4. **Préchargement** :
   - Charge les 10 frames suivants en arrière-plan
   - Utilise `getFrameUrlClient()` pour générer les URLs
   - Stockés dans le cache du navigateur

### 8.2 AnnotationControls

**Fichier** : `src/app/_components/annotation/AnnotationControls.tsx`

**Props** :
```typescript
{
  currentPoint: { x: number, y: number } | null
  noBall: boolean
  onDelete: () => void
  onNoBall: () => void
  onSave: () => void
  onSaveAndNext: () => void
  disabled: boolean
}
```

**Boutons** (de gauche à droite) :

| Bouton | Label | Icône | Raccourci | Action |
|--------|-------|-------|-----------|--------|
| 1 | Supprimer | Trash2 | `Delete` | Efface le point actuel |
| 2 | Pas de balle | XCircle | `Z` | Marque le frame comme sans balle |
| 3 | Sauvegarder | Save | `E` | Sauvegarde sans passer au suivant |
| 4 | Valider & Suivant | Check | `A` | Sauvegarde et charge le frame suivant |

**Gestion clavier** :
- `useEffect` avec `addEventListener('keydown')`
- Prévient les actions par défaut
- Désactive les raccourcis si bouton `disabled`

### 8.3 AnnotationStats

**Fichier** : `src/app/_components/annotation/AnnotationStats.tsx`

**Props** :
```typescript
{
  currentFrame: number
  totalFrames: number
  annotatedCount: number
  percentComplete: number
  sessionDuration: number  // en secondes
}
```

**Affichage** :
```
Frame 123/1000 | Annotated: 75 | Duration: 00:12:34 | 75%
[████████████░░░░] Progress bar
```

**Formatage de la durée** :
```typescript
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
```

### 8.4 AppSidebar

**Fichier** : `src/app/_components/app-sidebar.tsx`

**Sections** :

1. **Header** :
   - Logo "Spike Track"
   - Icône Volleyball

2. **Navigation** :
   - Lien "Dashboard" (LayoutDashboard icon)

3. **Videos List** :
   - Current video (si existe)
   - Available videos
   - Clic → navigation vers `/annotate/[videoId]`

4. **Footer** :
   - Avatar utilisateur (image Google)
   - Nom + email
   - Dropdown menu :
     - Theme toggle (Light/Dark)
     - Sign out

**Requêtes** :
- `api.annotation.getMyProgress.useQuery()`
- `api.auth.getSession.useQuery()`

---

## 9. GESTION DE L'ÉTAT

### 9.1 État serveur (React Query)

**Configuration** (`src/trpc/query-client.ts`) :
```typescript
{
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,  // 30 secondes
      refetchOnWindowFocus: false
    }
  }
}
```

**Invalidation des queries** :
- Après `saveAnnotation` :
  - `utils.annotation.getNextFrame.invalidate({ videoId })`
  - `utils.annotation.getStats.invalidate({ videoId })`
  - `utils.annotation.getMyProgress.invalidate()`

### 9.2 État local (useState)

**Page d'annotation** :
- `currentPoint: Point | null` : position du clic
- `noBall: boolean` : flag "pas de balle"
- `optimisticFrame: number | null` : frame affiché en mode optimiste

**Mises à jour optimistes** :
- Après clic "Valider & Suivant" :
  1. Affiche immédiatement le frame suivant (optimiste)
  2. Lance la mutation en parallèle
  3. Si erreur → revient au frame précédent + toast d'erreur

### 9.3 Cache & performance

**Stratégies** :
1. **Cache React Query** : 30s de fraîcheur
2. **Préchargement d'images** : 10 frames à l'avance
3. **Invalidation sélective** : uniquement les queries concernées
4. **Batching tRPC** : plusieurs queries en une seule requête HTTP

---

## 10. SÉCURITÉ

### 10.1 Authentification

- **OAuth 2.0** : Pas de stockage de mots de passe
- **Sessions** : Tokens signés avec expiration
- **Refresh automatique** : Géré par Better Auth

### 10.2 Protection des routes

**3 niveaux** :
1. **Middleware Next.js** : Redirection avant chargement de la page
2. **tRPC protectedProcedure** : Erreur UNAUTHORIZED si pas de session
3. **Base de données** : Filtrage par `userId` dans toutes les queries

### 10.3 Validation des données

**Zod schemas** :
```typescript
// Exemple : saveAnnotation input
z.object({
  videoId: z.number(),
  frameNumber: z.number().int().min(0),
  x: z.number().optional(),
  y: z.number().optional(),
  ballVisible: z.boolean()
}).refine(
  (data) => !data.ballVisible || (data.x !== undefined && data.y !== undefined),
  { message: "x and y required when ballVisible=true" }
)
```

### 10.4 Isolation des utilisateurs

**Toutes les queries** :
- Filtrent par `userId = ctx.session.user.id`
- Pas de requête cross-user possible
- Foreign keys avec CASCADE delete

### 10.5 Protection Cloudinary

- **Credentials** : Stockés dans fichiers `server-only`
- **API key/secret** : Jamais exposés côté client
- **URLs publiques** : Seulement le `cloudName` côté client

---

## 11. PERFORMANCE

### 11.1 Optimisations images

| Technique | Implémentation |
|-----------|----------------|
| Auto quality | `q_auto` (Cloudinary) |
| Auto format | `f_auto` (WebP si supporté) |
| Dimensions limitées | Max 1920x1080 |
| Préchargement | 10 frames suivants |
| CDN | Cloudinary distribue mondialement |

### 11.2 Optimisations base de données

**Index créés** :
```sql
-- Lookup rapide des annotations
CREATE INDEX idx_annotations_video_frame ON annotations(videoId, frameNumber);
CREATE INDEX idx_annotations_user_video ON annotations(userId, videoId);

-- Progression utilisateur
CREATE INDEX idx_progress_userId ON userVideoProgress(userId);
CREATE INDEX idx_progress_status ON userVideoProgress(status);

-- Vidéos
CREATE INDEX idx_videos_createdAt ON videos(createdAt);
```

**Contraintes UNIQUE** :
- Empêchent les doublons
- Permettent UPSERT efficace

**Query optimisée** (getNextFrame) :
- `generate_series` en CTE (Common Table Expression)
- LEFT JOIN pour trouver les gaps
- LIMIT 1 avec ORDER BY

### 11.3 Optimisations frontend

| Technique | Implémentation |
|-----------|----------------|
| Code splitting | Next.js automatique |
| Tree shaking | Bundler automatique |
| React 19 | Compiler automatique |
| Skeleton loaders | UX pendant chargement |
| Optimistic updates | UI réactive instantanée |
| SVG overlay | Léger vs canvas |

### 11.4 Optimisations tRPC

- **HTTP Batch Link** : Regroupe plusieurs queries en une requête
- **SuperJSON** : Sérialisation optimisée (Date, Map, Set, etc.)
- **Type-safe** : Pas de validation runtime inutile

---

## 12. VARIABLES D'ENVIRONNEMENT

**Fichier** : `.env`

```bash
# Better Auth
BETTER_AUTH_SECRET=<random-secret-key>
BETTER_AUTH_GOOGLE_CLIENT_ID=<google-oauth-client-id>
BETTER_AUTH_GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Cloudinary
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloud-name>

# Environment
NODE_ENV=development  # ou production
```

**Validation** (`src/env.js`) :
- Zod schema pour toutes les variables
- Erreur au build si variables manquantes
- Type-safe : `env.DATABASE_URL` auto-complété

---

## 13. COMMANDES DE DÉVELOPPEMENT

```bash
# Installation
npm install

# Base de données
npm run db:push              # Créer/mettre à jour le schéma
npm run db:generate          # Générer les migrations
npm run db:migrate           # Exécuter les migrations
npm run db:studio            # Interface web Drizzle

# Développement
npm run dev                  # Serveur dev avec Turbo
npm run build               # Build production
npm run start               # Serveur production

# Qualité de code
npm run lint                 # ESLint
npm run lint:fix            # Auto-fix ESLint
npm run format:check        # Vérifier formatage
npm run format:write        # Formater le code
npm run typecheck           # Vérification TypeScript
npm run check               # lint + typecheck

# Autres
npm run preview             # Build + start
```

---

## 14. WORKFLOW UTILISATEUR COMPLET

### 14.1 Première visite

1. Utilisateur accède à `https://app.com/`
2. Middleware détecte absence de session
3. Redirection → `/login`
4. Affichage de la page de connexion
5. Clic "Sign in with Google"
6. Redirection OAuth vers Google
7. Utilisateur autorise l'application
8. Callback Better Auth
9. Création user + session en DB
10. Redirection → `/dashboard`

### 14.2 Sélection d'une vidéo

1. Dashboard affiche les vidéos via `getMyProgress()`
2. 3 sections :
   - **Current** : vidéo en cours (si existe)
   - **Available** : vidéos non commencées
   - **Completed** : vidéos terminées
3. Utilisateur clique "Start Annotating" sur une vidéo
4. Navigation → `/annotate/[videoId]`

### 14.3 Session d'annotation

1. **Chargement initial** :
   - Query `getNextFrame({ videoId })`
   - Retour :
     - `frameNumber: 0` (premier frame non annoté)
     - `imageUrl: <cloudinary-url>`
     - `previousAnnotations: []` (vide car premier)
   - Affichage de l'image

2. **Annotation frame 0** :
   - Utilisateur voit l'image du frame 0
   - Clique sur la position du ballon → `currentPoint = { x: 523, y: 342 }`
   - Point rouge apparaît sur l'overlay SVG
   - Presse `A` (ou clique "Valider & Suivant")

3. **Sauvegarde** :
   - Mutation `saveAnnotation({ videoId, frameNumber: 0, x: 523, y: 342, ballVisible: true })`
   - UPSERT en DB
   - Update `userVideoProgress` :
     - `lastAnnotatedFrame = 0`
     - `totalAnnotated = 1`
     - `lastActivity = NOW()`

4. **Frame suivant (optimiste)** :
   - UI affiche immédiatement le frame 1 (sans attendre la réponse)
   - Query `getNextFrame()` en parallèle
   - Retour :
     - `frameNumber: 1`
     - `imageUrl: <cloudinary-url-frame-1>`
     - `previousAnnotations: [{ frameNumber: 0, x: 523, y: 342 }]`
   - Point vert affiché au même endroit que frame 0 (référence visuelle)

5. **Annotation frame 1 (balle invisible)** :
   - Utilisateur voit que la balle n'est pas visible
   - Presse `Z` (ou clique "Pas de balle")
   - `noBall = true`
   - Presse `A`
   - Mutation `saveAnnotation({ videoId, frameNumber: 1, ballVisible: false })`
   - Pas de `x` ni `y` envoyés

6. **Répétition** :
   - L'utilisateur continue frame par frame
   - Statistiques mises à jour toutes les 5 secondes
   - Progression sauvegardée en continu

7. **Interruption** :
   - Utilisateur ferme le navigateur
   - Progression stockée en DB
   - Peut reprendre plus tard exactement où il s'est arrêté

8. **Reprise** :
   - Retour sur `/dashboard`
   - Vidéo apparaît dans "Current Video"
   - Badge montre "75% complete"
   - Clic "Continue"
   - `getNextFrame()` retourne le frame 750 (premier non annoté)

9. **Complétion** :
   - Frame 999 annoté (dernier)
   - `getNextFrame()` retourne `{ completed: true }`
   - Affichage écran de félicitations
   - Update DB : `status = 'completed'`, `completedAt = NOW()`
   - Retour au dashboard → vidéo dans "Completed Videos"

### 14.4 Statistiques temps réel

Toutes les 5 secondes pendant l'annotation :
- Query `getStats({ videoId })`
- Retour :
  ```json
  {
    "currentFrame": 523,
    "totalFrames": 1000,
    "annotatedCount": 524,
    "percentComplete": 52.4,
    "sessionDuration": 3847  // 1h 4min 7s
  }
  ```
- Mise à jour de `AnnotationStats` component
- Barre de progression animée

---

## 15. ARCHITECTURE TECHNIQUE DÉTAILLÉE

### 15.1 Flow de requête tRPC

**Exemple : `annotation.getNextFrame({ videoId: 1 })`**

1. **Client** (`AnnotationPage.tsx`) :
   ```typescript
   const { data } = api.annotation.getNextFrame.useQuery({ videoId: 1 })
   ```

2. **React Query** :
   - Vérifie le cache
   - Si stale (>30s) ou premier appel → requête HTTP

3. **HTTP Request** :
   ```
   POST /api/trpc/annotation.getNextFrame
   Content-Type: application/json
   Cookie: better-auth.session_token=<token>

   {"videoId":1}
   ```

4. **Next.js API Route** (`src/app/api/trpc/[trpc]/route.ts`) :
   - Reçoit la requête
   - Passe au handler tRPC

5. **tRPC Handler** (`src/server/api/trpc.ts`) :
   - Exécute le middleware d'authentification
   - Extrait la session via Better Auth
   - Injecte `ctx.session` dans le contexte

6. **Procedure** (`src/server/api/routers/annotation.ts`) :
   ```typescript
   getNextFrame: protectedProcedure
     .input(z.object({ videoId: z.number() }))
     .query(async ({ input, ctx }) => {
       // Logique métier
       // Accès DB via Drizzle
       return { frameNumber, imageUrl, ... }
     })
   ```

7. **Drizzle ORM** :
   - Construction de la requête SQL
   - Exécution sur PostgreSQL
   - Mapping des résultats en objets TypeScript

8. **Response** :
   ```
   HTTP 200 OK
   Content-Type: application/json

   {
     "result": {
       "data": {
         "frameNumber": 0,
         "imageUrl": "https://...",
         "previousAnnotations": [],
         "progress": { ... }
       }
     }
   }
   ```

9. **Client** :
   - React Query met en cache
   - Component re-render avec les données
   - UI mise à jour

### 15.2 Gestion des sessions

**Création de session** :
1. OAuth callback reçu sur `/api/auth/callback/google`
2. Better Auth valide le code OAuth
3. Récupère le profil Google (email, name, image)
4. Recherche ou crée l'utilisateur en DB
5. Crée un enregistrement `session` :
   ```typescript
   {
     id: <uuid>,
     userId: <user-id>,
     token: <signed-jwt>,
     expiresAt: <now + 7 days>,
     ipAddress: <client-ip>,
     userAgent: <client-ua>
   }
   ```
6. Set cookie `better-auth.session_token`
7. Redirection vers `/dashboard`

**Vérification de session** :
1. Middleware Next.js sur chaque requête
2. Lecture du cookie `better-auth.session_token`
3. Query DB : `SELECT * FROM session WHERE token = ? AND expiresAt > NOW()`
4. Si valide : `ctx.session = { user, token, ... }`
5. Si invalide : redirection `/login`

**Refresh de session** :
- Better Auth refresh automatiquement avant expiration
- Mise à jour du `expiresAt`
- Nouveau token signé

**Logout** :
1. Clic "Sign out" dans la sidebar
2. Appel `authClient.signOut()`
3. DELETE session en DB
4. Clear cookie
5. Redirection `/login`

### 15.3 Drizzle ORM - Exemples de requêtes

**Insert avec UPSERT** :
```typescript
await db.insert(annotations)
  .values({
    videoId,
    userId,
    frameNumber,
    x,
    y,
    ballVisible
  })
  .onConflictDoUpdate({
    target: [annotations.videoId, annotations.userId, annotations.frameNumber],
    set: {
      x,
      y,
      ballVisible,
      updatedAt: new Date()
    }
  })
```

**Query complexe avec JOIN** :
```typescript
const result = await db
  .select({
    frameNumber: sql<number>`af.frameNumber`,
  })
  .from(sql`(SELECT generate_series(0, ${totalFrames} - 1) AS frameNumber) af`)
  .leftJoin(
    annotations,
    and(
      eq(annotations.frameNumber, sql`af.frameNumber`),
      eq(annotations.userId, userId),
      eq(annotations.videoId, videoId)
    )
  )
  .where(isNull(annotations.id))
  .orderBy(sql`af.frameNumber ASC`)
  .limit(1)
```

**Transaction** :
```typescript
await db.transaction(async (tx) => {
  // Insert annotation
  await tx.insert(annotations).values({ ... })

  // Update progress
  await tx.update(userVideoProgress)
    .set({ totalAnnotated: sql`totalAnnotated + 1` })
    .where(eq(userVideoProgress.userId, userId))
})
```

---

## 16. DÉPLOIEMENT

### 16.1 Plateforme recommandée : Vercel

**Raisons** :
- Intégration native Next.js
- Build automatique depuis Git
- Edge middleware support
- Variables d'environnement sécurisées
- CDN mondial gratuit

**Configuration** :
1. Connexion repository GitHub
2. Import projet Vercel
3. Configuration des variables d'env (cf. section 12)
4. Build command : `npm run build`
5. Output directory : `.next`

### 16.2 Base de données : Neon / Supabase / PlanetScale

**Neon (recommandé)** :
- PostgreSQL serverless
- Free tier généreux
- Auto-scaling
- Connection pooling

**Configuration** :
1. Créer projet Neon
2. Copier `DATABASE_URL`
3. Ajouter à Vercel env vars
4. Run `npm run db:push` localement (ou via Vercel build)

### 16.3 Cloudinary

**Configuration** :
1. Créer compte Cloudinary
2. Créer dossiers pour les vidéos
3. Upload des frames (voir section 17)
4. Copier credentials dans env vars

### 16.4 Google OAuth

**Configuration** :
1. Google Cloud Console
2. Créer projet
3. Activer Google+ API
4. Créer OAuth 2.0 Client ID
5. Authorized redirect URIs :
   - `https://yourdomain.com/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (dev)
6. Copier Client ID & Secret

### 16.5 Build & CI/CD

**Vercel (automatique)** :
- Push sur `main` → déploiement production
- Push sur autre branch → preview deployment
- Rollback one-click

**GitHub Actions (alternatif)** :
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - uses: vercel/actions/deploy@v1
```

---

## 17. GESTION DES VIDÉOS (ADMIN)

### 17.1 Upload des frames dans Cloudinary

**Script d'upload** (Node.js) :
```javascript
const cloudinary = require('cloudinary').v2
const fs = require('fs')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

async function uploadFrames(videoFolder, framesDir) {
  const files = fs.readdirSync(framesDir).sort()

  for (const [index, file] of files.entries()) {
    const framePath = `${framesDir}/${file}`
    const frameNumber = String(index).padStart(6, '0')

    await cloudinary.uploader.upload(framePath, {
      folder: videoFolder,
      public_id: `${videoFolder}/frame_${frameNumber}`,
      resource_type: 'image',
      format: 'jpg'
    })

    console.log(`Uploaded frame ${frameNumber}`)
  }
}

// Usage
uploadFrames('volleyball/reims_amiens_test', './frames')
```

**Note** : Bug détecté - le `public_id` contient déjà le folder, ce qui crée une duplication :
- `folder: "volleyball/reims_amiens_test"`
- `public_id: "volleyball/reims_amiens_test/frame_000000"`
- Résultat : `volleyball/reims_amiens_test/volleyball/reims_amiens_test/frame_000000.jpg`

**Fix** :
```javascript
public_id: `frame_${frameNumber}`  // Sans le folder
```

### 17.2 Création d'une vidéo en DB

**SQL direct** :
```sql
INSERT INTO "spike-track_videos" (name, "cloudinaryFolder", "totalFrames", fps, width, height)
VALUES (
  'Reims vs Amiens - Test',
  'volleyball/reims_amiens_test',
  1234,
  30,
  1920,
  1080
);
```

**Drizzle (script TypeScript)** :
```typescript
import { db } from './src/server/db'
import { videos } from './src/server/db/schema'

await db.insert(videos).values({
  name: 'Reims vs Amiens - Test',
  cloudinaryFolder: 'volleyball/reims_amiens_test',
  totalFrames: 1234,
  fps: 30,
  width: 1920,
  height: 1080
})
```

### 17.3 Extraction de frames depuis une vidéo

**FFmpeg** :
```bash
ffmpeg -i match.mp4 -vf fps=30 frames/frame_%06d.jpg
```

**Paramètres** :
- `-vf fps=30` : 30 frames par seconde
- `frame_%06d.jpg` : Nommage avec padding 6 chiffres (frame_000001.jpg)

**Comptage du nombre de frames** :
```bash
ls frames/ | wc -l
```

---

## 18. AMÉLIORATIONS POSSIBLES

### 18.1 Fonctionnalités

- [ ] **Multi-langue** : i18n (français/anglais complet)
- [ ] **Undo/Redo** : Annuler la dernière annotation
- [ ] **Annotation rectangle** : Bounding box au lieu d'un point
- [ ] **Keyboard navigation** : Flèches pour naviguer entre frames
- [ ] **Zoom** : Zoom sur l'image pour précision
- [ ] **Export** : Télécharger les annotations (JSON/CSV)
- [ ] **Admin panel** : Interface pour créer/modifier les vidéos
- [ ] **Analytics** : Dashboard statistiques (temps moyen, frames/heure)
- [ ] **Collaborative annotation** : Voir les annotations d'autres users
- [ ] **Validation workflow** : Système de review des annotations

### 18.2 Performance

- [ ] **Service Worker** : Cache offline des frames
- [ ] **WebP/AVIF** : Formats d'image plus légers
- [ ] **Lazy hydration** : Hydration progressive React
- [ ] **Virtual scrolling** : Liste de vidéos optimisée
- [ ] **Database read replicas** : Scalabilité lecture
- [ ] **Redis cache** : Cache des queries fréquentes

### 18.3 UX

- [ ] **Tutorial** : Onboarding pour nouveaux utilisateurs
- [ ] **Tooltips** : Aide contextuelle
- [ ] **Animations** : Transitions fluides
- [ ] **Feedback visuel** : Haptics (mobile)
- [ ] **Accessibilité** : ARIA labels, keyboard-only navigation
- [ ] **Mobile app** : React Native / PWA

### 18.4 DevOps

- [ ] **Monitoring** : Sentry error tracking
- [ ] **Logging** : Winston/Pino structured logs
- [ ] **E2E tests** : Playwright
- [ ] **Load testing** : k6
- [ ] **Backup automatique** : DB snapshots quotidiens
- [ ] **Feature flags** : LaunchDarkly

---

## 19. ARCHITECTURE DE DONNÉES AVANCÉE

### 19.1 Stratégie de partitionnement (futur)

Si l'application scale à des millions d'annotations :

**Partitionnement par `videoId`** :
```sql
CREATE TABLE annotations_partition_1 PARTITION OF annotations
  FOR VALUES FROM (1) TO (1000);

CREATE TABLE annotations_partition_2 PARTITION OF annotations
  FOR VALUES FROM (1000) TO (2000);
```

**Avantages** :
- Queries plus rapides (scan limité)
- Archivage facile des anciennes vidéos
- Maintenance par partition

### 19.2 Matérialized Views (optimisation)

**View pour stats globales** :
```sql
CREATE MATERIALIZED VIEW user_global_stats AS
SELECT
  userId,
  COUNT(DISTINCT videoId) as videosAnnotated,
  SUM(totalAnnotated) as totalFrames,
  AVG(percentComplete) as avgCompletion
FROM userVideoProgress
GROUP BY userId;

CREATE INDEX ON user_global_stats(userId);

-- Refresh toutes les heures
REFRESH MATERIALIZED VIEW CONCURRENTLY user_global_stats;
```

### 19.3 Archivage des sessions complétées

**Table archive** :
```sql
CREATE TABLE annotations_archive (LIKE annotations INCLUDING ALL);

-- Migration mensuelle
INSERT INTO annotations_archive
SELECT a.* FROM annotations a
JOIN userVideoProgress uvp ON uvp.videoId = a.videoId AND uvp.userId = a.userId
WHERE uvp.status = 'completed' AND uvp.completedAt < NOW() - INTERVAL '6 months';

DELETE FROM annotations WHERE id IN (SELECT id FROM annotations_archive);
```

---

## 20. GLOSSAIRE TECHNIQUE

| Terme | Définition |
|-------|------------|
| **Frame** | Image individuelle extraite d'une vidéo (1/30s à 30 FPS) |
| **Annotation** | Marque placée sur un frame indiquant la position du ballon |
| **UPSERT** | INSERT ... ON CONFLICT UPDATE (insertion ou mise à jour) |
| **Optimistic Update** | Mise à jour UI avant confirmation serveur |
| **tRPC** | Type-safe RPC framework (Remote Procedure Call) |
| **Drizzle ORM** | ORM TypeScript avec inférence de types |
| **Better Auth** | Bibliothèque d'authentification OAuth |
| **Radix UI** | Composants headless accessibles (sans style) |
| **Cloudinary** | Service de gestion d'images en cloud (CDN) |
| **SuperJSON** | Sérialisation JSON étendue (Date, Map, Set, etc.) |
| **Middleware** | Code s'exécutant avant chaque requête |
| **Protected Procedure** | Endpoint tRPC nécessitant authentification |
| **Session** | État d'authentification utilisateur (token + expiration) |
| **Query** | Requête lecture seule (GET) |
| **Mutation** | Requête modification (POST/PUT/DELETE) |
| **Stale Time** | Durée avant qu'une query soit considérée obsolète |
| **Invalidation** | Action de marquer une query comme obsolète |

---

## 21. CONTACTS & RESSOURCES

### Documentation officielle
- **Next.js** : https://nextjs.org/docs
- **tRPC** : https://trpc.io
- **Drizzle** : https://orm.drizzle.team
- **Better Auth** : https://www.better-auth.com
- **Radix UI** : https://www.radix-ui.com
- **Tailwind CSS** : https://tailwindcss.com
- **Cloudinary** : https://cloudinary.com/documentation

### Stack T3
- **T3 Stack** : https://create.t3.gg
- **Discord** : https://t3.gg/discord

---

## ANNEXES

### A. Exemple de fichier `.env.example`

```bash
# Better Auth
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_GOOGLE_CLIENT_ID=your-google-client-id
BETTER_AUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/spike_track

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name

# Environment
NODE_ENV=development
```

### B. Schéma de flux utilisateur (ASCII)

```
┌─────────┐
│ Landing │
│    /    │
└────┬────┘
     │
     ├─ Non authentifié ─→ /login ─→ Google OAuth ─→ Callback
     │                                                    │
     └─ Authentifié ──────────────────────────────────────┤
                                                          ↓
                                                   ┌──────────┐
                                                   │Dashboard │
                                                   │          │
                                                   └─────┬────┘
                                                         │
                         ┌───────────────────────────────┼───────────────┐
                         │                               │               │
                         ↓                               ↓               ↓
                    ┌─────────┐                   ┌──────────┐   ┌──────────┐
                    │ Current │                   │Available │   │Completed │
                    │  Video  │                   │  Videos  │   │  Videos  │
                    └────┬────┘                   └─────┬────┘   └──────────┘
                         │                              │
                         │        Continue/Start        │
                         └──────────────┬───────────────┘
                                        ↓
                                 ┌────────────┐
                                 │  Annotate  │
                                 │ /[videoId] │
                                 └──────┬─────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ↓                   ↓                   ↓
              ┌──────────┐        ┌──────────┐       ┌──────────┐
              │Click ball│        │Press "Z" │       │Press "A" │
              │ position │        │ (no ball)│       │(save+next)│
              └─────┬────┘        └─────┬────┘       └─────┬────┘
                    │                   │                   │
                    └───────────────────┴───────────────────┘
                                        │
                                        ↓
                                 ┌────────────┐
                                 │Save to DB  │
                                 │Update prog │
                                 └──────┬─────┘
                                        │
                                ┌───────┴───────┐
                                │               │
                            More frames     All done
                                │               │
                                ↓               ↓
                          Next frame      Congratulations
                                              screen
```

### C. Exemple d'annotation JSON (export hypothétique)

```json
{
  "video": {
    "id": 1,
    "name": "Reims vs Amiens - Test",
    "totalFrames": 1234,
    "fps": 30
  },
  "user": {
    "id": "user_abc123",
    "email": "annotator@example.com"
  },
  "annotations": [
    {
      "frameNumber": 0,
      "timestamp": "00:00:00.000",
      "ballVisible": true,
      "position": { "x": 523, "y": 342 }
    },
    {
      "frameNumber": 1,
      "timestamp": "00:00:00.033",
      "ballVisible": false,
      "position": null
    },
    {
      "frameNumber": 2,
      "timestamp": "00:00:00.066",
      "ballVisible": true,
      "position": { "x": 531, "y": 356 }
    }
  ],
  "metadata": {
    "totalAnnotated": 1234,
    "sessionDuration": 3847,
    "completedAt": "2024-12-22T18:30:00Z"
  }
}
```

---

**FIN DU CAHIER DES CHARGES**

Version 1.0 - Décembre 2024
