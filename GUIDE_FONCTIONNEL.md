# SPIKE TRACK - GUIDE FONCTIONNEL

**Plateforme d'annotation collaborative de vidéos de volleyball**

---

## 📖 SOMMAIRE

1. [Qu'est-ce que Spike Track ?](#1-quest-ce-que-spike-track-)
2. [Pour qui ?](#2-pour-qui-)
3. [User Stories](#3-user-stories)
4. [Parcours utilisateur](#4-parcours-utilisateur)
5. [Fonctionnalités détaillées](#5-fonctionnalités-détaillées)
6. [Guide d'utilisation](#6-guide-dutilisation)
7. [Cas d'usage](#7-cas-dusage)
8. [FAQ](#8-faq)

---

## 1. QU'EST-CE QUE SPIKE TRACK ?

### Vue d'ensemble

**Spike Track** est une application web qui permet à plusieurs personnes de travailler ensemble pour annoter des vidéos de matchs de volleyball.

L'objectif est simple : **indiquer où se trouve le ballon sur chaque image de la vidéo**.

### À quoi ça sert ?

Ces annotations servent à entraîner un système d'intelligence artificielle (TrackNetV4) qui pourra ensuite suivre automatiquement le ballon pendant les matchs.

### Le principe

- Une vidéo est découpée en milliers d'images (appelées "frames")
- Chaque utilisateur annote les images une par une
- Pour chaque image, il clique sur la position du ballon ⚪️
- Ou il indique "pas de balle visible" si le ballon n'apparaît pas
- Le système sauvegarde automatiquement sa progression
- Il peut arrêter et reprendre quand il veut

---

## 2. POUR QUI ?

### Utilisateurs cibles

**Annotateurs de vidéos** :
- Étudiants en sport
- Analystes sportifs
- Bénévoles contributeurs
- Équipes de recherche en IA
- Clubs de volleyball

### Profil requis

- ✅ Aucune compétence technique nécessaire
- ✅ Juste besoin d'un compte Google
- ✅ Patience et précision
- ✅ Connexion internet stable

---

## 3. USER STORIES

### 🎯 Épique 1 : Connexion et découverte

**US-01** : En tant qu'utilisateur, je veux me connecter avec mon compte Google pour accéder à l'application sans créer de nouveau compte.

**US-02** : En tant qu'utilisateur, je veux voir une page d'accueil claire qui m'explique ce que je dois faire.

**US-03** : En tant qu'utilisateur, je veux voir la liste des vidéos disponibles pour savoir sur quoi je peux travailler.

### 🎯 Épique 2 : Annotation des vidéos

**US-04** : En tant qu'annotateur, je veux commencer à annoter une nouvelle vidéo en un clic.

**US-05** : En tant qu'annotateur, je veux voir l'image de la vidéo en grand pour bien distinguer le ballon.

**US-06** : En tant qu'annotateur, je veux cliquer sur la position du ballon pour l'annoter rapidement.

**US-07** : En tant qu'annotateur, je veux pouvoir indiquer "pas de balle visible" quand le ballon n'apparaît pas à l'écran.

**US-08** : En tant qu'annotateur, je veux utiliser des raccourcis clavier pour aller plus vite (sans devoir cliquer sur les boutons).

**US-09** : En tant qu'annotateur, je veux voir où était le ballon sur les images précédentes pour m'aider à le trouver sur l'image actuelle.

**US-10** : En tant qu'annotateur, je veux que mes annotations soient sauvegardées automatiquement pour ne pas perdre mon travail.

### 🎯 Épique 3 : Suivi de progression

**US-11** : En tant qu'annotateur, je veux voir ma progression en pourcentage pour savoir combien il me reste à faire.

**US-12** : En tant qu'annotateur, je veux voir combien de temps j'ai passé sur une vidéo.

**US-13** : En tant qu'annotateur, je veux pouvoir arrêter mon travail et le reprendre plus tard exactement où je me suis arrêté.

**US-14** : En tant qu'annotateur, je veux voir quelles vidéos j'ai terminées pour avoir un sentiment d'accomplissement.

### 🎯 Épique 4 : Confort d'utilisation

**US-15** : En tant qu'utilisateur, je veux choisir entre un thème clair et un thème sombre pour protéger mes yeux.

**US-16** : En tant qu'utilisateur, je veux recevoir une notification quand j'ai terminé une vidéo complète.

**US-17** : En tant qu'utilisateur, je veux que l'application soit rapide et fluide même avec des milliers d'images.

**US-18** : En tant qu'utilisateur, je veux pouvoir me déconnecter facilement.

### 🎯 Épique 5 : Navigation

**US-19** : En tant qu'utilisateur, je veux accéder rapidement au tableau de bord depuis n'importe quelle page.

**US-20** : En tant qu'utilisateur, je veux voir mon profil (photo, nom, email) pour confirmer que je suis bien connecté.

---

## 4. PARCOURS UTILISATEUR

### 🚀 Parcours 1 : Première visite

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Arrivée sur Spike Track                                      │
│    → L'utilisateur arrive sur spike-track.com                   │
│    → Il voit une page de bienvenue                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Connexion Google                                             │
│    → Clic sur "Se connecter avec Google"                        │
│    → Pop-up Google OAuth                                        │
│    → Sélection du compte Google                                 │
│    → Autorisation de l'application                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Arrivée sur le tableau de bord                               │
│    → L'utilisateur voit :                                       │
│      • Une barre latérale avec son profil                       │
│      • La liste des vidéos disponibles                          │
│      • Le titre "Bienvenue sur Spike Track"                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Sélection d'une vidéo                                        │
│    → Clic sur "Commencer l'annotation" sur une vidéo            │
│    → Redirection vers l'interface d'annotation                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Découverte de l'interface                                    │
│    → En haut : barre de progression et statistiques             │
│    → Au centre : image du premier frame (image 1/1000)          │
│    → En bas : 4 boutons d'action                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Première annotation                                          │
│    → L'utilisateur clique sur le ballon dans l'image            │
│    → Un point rouge apparaît à l'endroit cliqué                 │
│    → Clic sur "Valider & Suivant" (ou touche A)                 │
│    → L'image suivante s'affiche automatiquement                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Annotation continue                                          │
│    → L'utilisateur continue image par image                     │
│    → Il voit sa progression augmenter : 1% → 2% → 3%...         │
│    → Il peut fermer le navigateur et reprendre plus tard        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. Complétion                                                   │
│    → Après la dernière image (1000/1000)                        │
│    → Message de félicitations 🎉                                │
│    → "Vous avez terminé toutes les images !"                    │
│    → Bouton "Retour au tableau de bord"                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. Retour au tableau de bord                                    │
│    → La vidéo apparaît maintenant dans "Vidéos terminées"       │
│    → Badge vert "Terminé" avec la date                          │
│    → L'utilisateur peut commencer une nouvelle vidéo            │
└─────────────────────────────────────────────────────────────────┘
```

### 🔄 Parcours 2 : Reprise d'une vidéo en cours

```
Utilisateur revient sur l'application
              ↓
Se connecte automatiquement (session active)
              ↓
Arrive sur le tableau de bord
              ↓
Voit la section "Vidéo en cours"
  • Nom de la vidéo : "Match Reims vs Amiens"
  • Progression : 45% (450/1000 images)
  • Bouton "Continuer l'annotation"
              ↓
Clic sur "Continuer"
              ↓
Arrive directement sur l'image 451
  (là où il s'était arrêté)
              ↓
Continue son travail
```

### ⏭️ Parcours 3 : Utilisation avancée avec raccourcis clavier

```
Annotateur expérimenté arrive sur une image
              ↓
Regarde rapidement l'image
              ↓
OPTION 1 : Ballon visible
  → Clic sur la position du ballon
  → Appuie sur "A" (Valider & Suivant)
  → Image suivante s'affiche instantanément
  → Gain de temps : pas besoin de cliquer sur le bouton

OPTION 2 : Ballon invisible
  → Appuie directement sur "Z" (Pas de balle)
  → Puis "A" (Valider & Suivant)
  → Image suivante
  → Gain de temps : pas de clic du tout

OPTION 3 : Erreur
  → Appuie sur "Delete" (Supprimer)
  → Le point rouge disparaît
  → Reclic au bon endroit
  → Appuie sur "A"
```

---

## 5. FONCTIONNALITÉS DÉTAILLÉES

### 🔐 Authentification

#### Connexion Google OAuth

**Ce que voit l'utilisateur** :
- Page de connexion simple et épurée
- Un seul bouton : "Se connecter avec Google"
- Logo de Google reconnaissable

**Comment ça marche** :
1. Clic sur le bouton
2. Pop-up Google s'ouvre
3. Sélection du compte Google
4. Autorisation de l'application (première fois uniquement)
5. Redirection automatique vers le tableau de bord

**Avantages** :
- ✅ Pas de mot de passe à retenir
- ✅ Connexion ultra-rapide
- ✅ Sécurité gérée par Google
- ✅ Photo de profil automatique

#### Session persistante

- L'utilisateur reste connecté pendant 7 jours
- Pas besoin de se reconnecter à chaque visite
- Déconnexion automatique après 7 jours (pour la sécurité)

---

### 📊 Tableau de bord

#### Vue d'ensemble

Le tableau de bord est divisé en **3 sections** :

##### 1️⃣ Vidéo en cours

**Affiché si** : L'utilisateur a commencé une vidéo mais ne l'a pas terminée

**Contenu** :
```
┌─────────────────────────────────────────────────────┐
│ 🎬 Match Reims vs Amiens                            │
│                                                     │
│ 📊 Progression : 45%                                │
│ [████████████░░░░░░░░░░░░]                          │
│                                                     │
│ 🎯 450 / 1000 images annotées                       │
│                                                     │
│              [Continuer l'annotation]               │
└─────────────────────────────────────────────────────┘
```

**Actions** :
- Clic sur "Continuer l'annotation" → reprend exactement où l'utilisateur s'est arrêté

##### 2️⃣ Vidéos disponibles

**Affiché** : Toutes les vidéos que l'utilisateur n'a jamais commencées

**Contenu** :
```
┌────────────────────────────────────┐  ┌────────────────────────────────────┐
│ 📹 Match Paris vs Lyon             │  │ 📹 Tournoi National - Finale       │
│                                    │  │                                    │
│ 📸 1234 images                     │  │ 📸 2456 images                     │
│ 🎥 30 FPS                          │  │ 🎥 30 FPS                          │
│                                    │  │                                    │
│     [Commencer l'annotation]       │  │     [Commencer l'annotation]       │
└────────────────────────────────────┘  └────────────────────────────────────┘
```

**Actions** :
- Clic sur "Commencer l'annotation" → démarre l'annotation à l'image 1

##### 3️⃣ Vidéos terminées

**Affiché** : Toutes les vidéos que l'utilisateur a complétées à 100%

**Contenu** :
```
┌─────────────────────────────────────────────────────┐
│ ✅ Match Toulouse vs Marseille                      │
│                                                     │
│ ✓ Terminé le 22 décembre 2024                       │
│ 🎯 1000 / 1000 images                               │
│                                                     │
│ Badge : [🏆 Terminé]                                │
└─────────────────────────────────────────────────────┘
```

**Sentiment** :
- Sentiment d'accomplissement
- Historique de contribution

---

### 🎨 Interface d'annotation

#### Disposition de l'écran

```
┌────────────────────────────────────────────────────────────────────┐
│ HEADER - Barre de statistiques                                     │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Image 523/1000 | Annotées: 524 | ⏱️ 01:23:45 | 52%            │ │
│ │ [████████████████░░░░░░░░░░░░░░]                              │ │
│ └────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│                         ZONE D'ANNOTATION                          │
│                                                                    │
│              ┌──────────────────────────────┐                      │
│              │                              │                      │
│              │                              │                      │
│              │       🏐  ← point rouge      │                      │
│              │         (clic utilisateur)   │                      │
│              │                              │                      │
│              │   • • •  ← points verts      │                      │
│              │    (annotations précédentes) │                      │
│              │                              │                      │
│              │      IMAGE DU MATCH          │                      │
│              │                              │                      │
│              └──────────────────────────────┘                      │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ FOOTER - Barre de contrôles                                        │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ [🗑️ Supprimer] [❌ Pas de balle] [💾 Sauvegarder] [✅ Valider] │ │
│ │     Delete           Z                E              A         │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

#### Barre de statistiques (Header)

**Informations affichées** :

| Élément | Description | Exemple |
|---------|-------------|---------|
| **Image actuelle** | Numéro de l'image en cours | "Image 523/1000" |
| **Images annotées** | Nombre total annoté | "Annotées: 524" |
| **Chronomètre** | Temps passé sur cette vidéo | "⏱️ 01:23:45" |
| **Pourcentage** | Progression globale | "52%" |
| **Barre de progression** | Visuel de l'avancement | `[████████░░░░]` |

**Rafraîchissement** :
- Mise à jour toutes les 5 secondes
- En temps réel pour une expérience fluide

#### Zone d'annotation (Centre)

**Image principale** :
- Taille optimisée pour l'écran
- Qualité automatique (rapide même avec connexion lente)
- Chargement avec animation (skeleton)

**Overlay visuel** :

| Élément | Couleur | Signification |
|---------|---------|---------------|
| **Point rouge (gros)** | 🔴 | Position où l'utilisateur vient de cliquer |
| **Points verts (petits)** | 🟢 | Positions du ballon sur les 5 images précédentes |
| **Croix blanche** | ⚪ | Curseur de sélection (aide à cliquer précisément) |

**Pourquoi les points verts ?**
- Le ballon se déplace peu entre deux images (1/30 de seconde)
- Les points verts aident à savoir où chercher le ballon
- Référence visuelle pour valider que le clic est cohérent

**Interaction** :
- Simple clic sur l'image → annotation placée
- Pas besoin de sélectionner un outil
- Intuitif et rapide

#### Barre de contrôles (Footer)

**4 boutons disponibles** :

##### Bouton 1 : 🗑️ Supprimer (Delete)

**Quand l'utiliser** :
- Erreur de clic (cliqué au mauvais endroit)
- Changement d'avis

**Action** :
- Efface le point rouge actuel
- L'utilisateur peut recliquer à un autre endroit
- Ne passe pas à l'image suivante

**Raccourci** : Touche `Delete` ou `Suppr`

##### Bouton 2 : ❌ Pas de balle (Z)

**Quand l'utiliser** :
- Le ballon n'est pas visible dans l'image
  - Hors du cadre de la caméra
  - Caché derrière un joueur
  - Moment de service (ballon tenu)
  - Mouvement flou

**Action** :
- Marque l'image comme "ballon invisible"
- Pas besoin de cliquer sur l'image
- Le point rouge disparaît (pas de position)

**Raccourci** : Touche `Z`

##### Bouton 3 : 💾 Sauvegarder (E)

**Quand l'utiliser** :
- Vérifier que l'annotation est bien enregistrée
- Faire une pause après cette image
- S'assurer de ne rien perdre

**Action** :
- Enregistre l'annotation actuelle
- Ne passe PAS à l'image suivante
- Notification : "Annotation sauvegardée"

**Raccourci** : Touche `E`

##### Bouton 4 : ✅ Valider & Suivant (A)

**Quand l'utiliser** :
- 95% du temps (bouton principal)
- Pour un workflow rapide

**Action** :
- Enregistre l'annotation actuelle
- Charge automatiquement l'image suivante
- Mise à jour des statistiques
- Gain de temps énorme

**Raccourci** : Touche `A` (le plus utilisé)

**Workflow rapide** :
```
Clic sur ballon → A → Clic sur ballon → A → Clic sur ballon → A
```

---

### ⌨️ Raccourcis clavier

| Touche | Action | Usage |
|--------|--------|-------|
| **A** | Valider & Suivant | 🔥 Le plus important - utilisé 95% du temps |
| **Z** | Pas de balle | Ballon invisible |
| **E** | Sauvegarder | Enregistrer sans avancer |
| **Delete** | Supprimer | Corriger une erreur |

**Pourquoi les raccourcis ?**
- Annotation 3x plus rapide
- Moins de fatigue (pas de va-et-vient souris/boutons)
- Workflow fluide : main gauche sur le clavier, main droite sur la souris

**Apprentissage** :
- Les touches sont affichées sous chaque bouton
- Après 10 images, l'utilisateur les connaît par cœur
- Devient un réflexe naturel

---

### 📈 Suivi de progression

#### Au niveau vidéo

**Informations suivies** :
- Dernière image annotée (ex: image 523)
- Nombre total d'images annotées (ex: 524)
- Pourcentage de complétion (ex: 52,4%)
- Temps total passé (ex: 1h 23min 45s)
- Date de début
- Date de dernière activité
- Date de complétion (si terminé)

**Persistance** :
- Tout est sauvegardé en temps réel
- Si le navigateur plante : rien n'est perdu
- Si l'utilisateur ferme l'onglet : peut reprendre plus tard
- Si l'ordinateur redémarre : progression conservée

#### Au niveau utilisateur

**Tableau de bord montre** :
- Nombre de vidéos en cours
- Nombre de vidéos terminées
- Vidéo actuelle avec progression

**Futur (améliorations possibles)** :
- Statistiques globales (total d'images annotées)
- Classement des contributeurs
- Badges de récompense

---

### 🎨 Personnalisation

#### Thème clair / sombre

**Accès** :
- Menu utilisateur (en bas de la barre latérale)
- Icône soleil/lune
- Clic pour basculer

**Thème sombre (par défaut)** :
- Fond noir
- Texte blanc
- Moins de fatigue oculaire
- Idéal pour sessions longues

**Thème clair** :
- Fond blanc
- Texte noir
- Meilleur contraste en plein jour

**Préférence sauvegardée** :
- Le choix est mémorisé
- Conservé entre les sessions

---

### 🔔 Notifications

**Moments clés** :

| Événement | Notification | Type |
|-----------|--------------|------|
| Annotation sauvegardée | "✅ Annotation enregistrée" | Toast (coin de l'écran) |
| Erreur de sauvegarde | "❌ Erreur - Réessayez" | Toast rouge |
| Vidéo terminée | "🎉 Félicitations !" | Écran plein |
| Image suivante chargée | Aucune (fluide) | - |
| Session expirée | "🔒 Reconnectez-vous" | Modal |

**Toast notifications** :
- Apparaissent en haut à droite
- Disparaissent après 3 secondes
- Non intrusives
- Confirment l'action

---

### 🚀 Performance

#### Chargement rapide

**Ce que l'utilisateur expérimente** :
- Clic "Valider & Suivant" → image suivante affichée instantanément
- Pas d'attente
- Fluidité totale

**Comment ?** (simplifié) :
- Les 10 prochaines images sont pré-chargées en arrière-plan
- Stockées dans la mémoire du navigateur
- Prêtes à être affichées immédiatement

#### Optimisation réseau

**Images légères** :
- Format automatique (WebP si le navigateur supporte)
- Qualité automatique (balance qualité/poids)
- Taille adaptée à l'écran
- CDN mondial (serveur proche de l'utilisateur)

**Résultat** :
- Fonctionne même avec connexion moyenne
- Consommation de données raisonnable

---

### 👥 Barre latérale (Navigation)

#### Sections

**Header** :
- Logo "Spike Track"
- Icône volleyball 🏐

**Navigation** :
- Lien "Tableau de bord" (toujours accessible)
- Retour rapide depuis n'importe où

**Vidéos** :
- Vidéo en cours (si existe)
  - Nom + pourcentage
  - Clic → continue l'annotation
- Vidéos disponibles (liste)
  - Clic → démarre l'annotation

**Profil utilisateur (footer)** :
- Photo de profil Google
- Nom complet
- Email
- Menu déroulant :
  - Basculer le thème (clair/sombre)
  - Se déconnecter

#### Comportement

**Sur mobile** :
- Barre latérale masquée par défaut
- Icône hamburger pour l'ouvrir
- Fermeture automatique après sélection

**Sur desktop** :
- Toujours visible
- Largeur fixe (250px)
- Contenu principal à droite

---

## 6. GUIDE D'UTILISATION

### 🎬 Démarrage rapide (5 étapes)

#### Étape 1 : Se connecter

1. Aller sur l'application Spike Track
2. Cliquer sur **"Se connecter avec Google"**
3. Choisir votre compte Google
4. Autoriser l'application (première fois uniquement)

✅ **Vous êtes connecté !** Redirection automatique vers le tableau de bord.

---

#### Étape 2 : Choisir une vidéo

1. Sur le tableau de bord, regarder la section **"Vidéos disponibles"**
2. Choisir une vidéo (ex: "Match Reims vs Amiens")
3. Cliquer sur **"Commencer l'annotation"**

✅ **L'interface d'annotation s'ouvre** avec la première image.

---

#### Étape 3 : Annoter la première image

1. Regarder l'image affichée
2. Chercher le ballon de volleyball 🏐
3. **Cliquer** précisément sur le ballon
4. Un **point rouge** apparaît où vous avez cliqué

✅ **Annotation placée !**

---

#### Étape 4 : Passer à l'image suivante

**Méthode 1 (recommandée)** :
- Appuyer sur la touche **A** du clavier

**Méthode 2** :
- Cliquer sur le bouton **"Valider & Suivant"**

✅ **L'image suivante s'affiche automatiquement**.

---

#### Étape 5 : Répéter le processus

Répéter les étapes 3 et 4 pour chaque image :

```
Regarder → Cliquer sur le ballon → Appuyer sur A → Image suivante
```

**Conseil** : Après 10-15 images, vous aurez pris le rythme !

---

### 📝 Cas particuliers

#### Cas 1 : Le ballon n'est pas visible

**Situations** :
- Le ballon est hors du cadre de la caméra
- Le ballon est caché derrière un joueur
- Le ballon est dans les mains d'un joueur (service)
- L'image est floue et le ballon est indistinct

**Solution** :
1. Appuyer sur la touche **Z** (ou cliquer sur "Pas de balle")
2. Appuyer sur **A** pour valider et passer au suivant

✅ **L'image est marquée comme "pas de balle"**.

---

#### Cas 2 : Erreur de clic (mauvais endroit)

**Situation** :
- Vous avez cliqué trop vite au mauvais endroit
- Le point rouge n'est pas sur le ballon

**Solution** :
1. Appuyer sur la touche **Delete**
2. Le point rouge disparaît
3. Recliquer au bon endroit
4. Appuyer sur **A**

✅ **Annotation corrigée**.

---

#### Cas 3 : Doute sur la position

**Situation** :
- Vous hésitez : est-ce bien le ballon ?
- Le ballon est partiellement caché

**Conseil** :
1. Regarder les **points verts** (annotations précédentes)
2. Le ballon se déplace généralement dans la même zone
3. Faire de votre mieux pour cliquer au centre du ballon
4. En cas de gros doute : marquer "pas de balle" (Z)

💡 **Principe** : Il vaut mieux marquer "pas de balle" que de cliquer n'importe où.

---

#### Cas 4 : Pause et reprise

**Situation** :
- Vous devez faire une pause
- Vous voulez continuer demain

**Procédure** :
1. Finir l'image en cours (appuyer sur A)
2. Fermer simplement le navigateur

**Pour reprendre** :
1. Se reconnecter à l'application
2. Aller sur le tableau de bord
3. Cliquer sur **"Continuer l'annotation"** dans la section "Vidéo en cours"
4. Vous reprenez exactement où vous vous êtes arrêté

✅ **Aucune perte de progression**.

---

### 🎯 Conseils pour aller plus vite

#### 1. Maîtriser les raccourcis clavier

**Workflow optimal** :
```
Main gauche sur "A" et "Z"
Main droite sur la souris
```

**Annotation ultra-rapide** :
- Ballon visible : Clic + A (1 seconde)
- Ballon invisible : Z + A (0,5 seconde)

**Objectif** : 500-1000 images par heure

---

#### 2. Utiliser les points verts comme guide

Les **5 points verts** montrent où était le ballon juste avant :
- Le ballon se déplace généralement dans la même direction
- Chercher le ballon dans la zone proche des points verts
- Gain de temps : pas besoin de scanner toute l'image

---

#### 3. Trouver son rythme

**Phases d'une session** :
- 0-50 images : Prise en main, apprentissage
- 50-200 images : Montée en vitesse
- 200-500 images : Rythme de croisière ⚡
- 500+ images : Automatisme total

**Pause recommandée** : Toutes les 200-300 images (10-15 min)

---

#### 4. Organiser son espace de travail

**Setup optimal** :
- Écran assez grand (minimum 15 pouces)
- Souris précise (pavé tactile moins efficace)
- Position confortable (dos droit, écran à hauteur des yeux)
- Lumière ambiante (éviter reflets sur l'écran)

**Thème** :
- Thème sombre si session longue (moins de fatigue)
- Thème clair si lumière ambiante forte

---

### 📊 Suivre sa progression

#### Pendant l'annotation

**En un coup d'œil (barre du haut)** :
```
Image 345/1000 | Annotées: 346 | ⏱️ 00:42:13 | 34%
[████████░░░░░░░░░░░░░]
```

**Informations** :
- Combien d'images restent (1000 - 345 = 655)
- Temps passé (42 minutes)
- Vitesse estimée (346 images / 42 min ≈ 8 images/min)
- Temps restant estimé (655 / 8 ≈ 82 min)

**Motivation** :
- Voir la barre de progression se remplir
- Atteindre les paliers : 25%, 50%, 75%, 100%

---

#### Sur le tableau de bord

**Après chaque session** :
- Retour au tableau de bord
- La vidéo en cours affiche le nouveau pourcentage
- Ex: Passé de 30% à 45% en une session

**Sentiment de progression** :
- Voir l'évolution jour après jour
- Anticiper la fin (proche de 100%)

---

#### Écran de complétion

**Quand vous terminez la dernière image (1000/1000)** :

```
╔═══════════════════════════════════════════╗
║                                           ║
║              🎉 Félicitations !           ║
║                                           ║
║   Vous avez terminé toutes les images    ║
║         de cette vidéo !                  ║
║                                           ║
║         Match Reims vs Amiens             ║
║           1000 / 1000 images              ║
║                                           ║
║        Temps total : 2h 15min             ║
║                                           ║
║      [Retour au tableau de bord]          ║
║                                           ║
╗═══════════════════════════════════════════╝
```

**Sentiment** :
- Accomplissement
- Contribution utile
- Prêt pour la vidéo suivante

---

## 7. CAS D'USAGE

### 📚 Cas d'usage 1 : Étudiant en sport

**Profil** : Lucas, 22 ans, étudiant en STAPS

**Besoin** :
- Contribuer à un projet de recherche en analyse sportive
- Gagner de l'expérience en annotation de données
- Travailler à son rythme

**Utilisation** :
- Connexion 2-3 fois par semaine
- Sessions de 30-45 minutes
- Annote 1-2 vidéos par mois
- Utilise le thème sombre (sessions le soir)

**Bénéfices** :
- Développe son œil d'analyste
- Comprend mieux la trajectoire du ballon
- Ligne sur le CV (contribution à projet IA)

---

### 🏐 Cas d'usage 2 : Club de volleyball

**Profil** : Club amateur cherchant à analyser ses matchs

**Besoin** :
- Créer une base de données de leurs matchs
- Entraîner un système de tracking automatique
- Impliquer les joueurs dans l'analyse

**Utilisation** :
- 5-6 joueurs se partagent les vidéos
- Chaque joueur annote 1-2 matchs
- Sessions post-entraînement
- Workflow rapide avec raccourcis clavier

**Bénéfices** :
- Base de données de trajectoires
- Analyse tactique future
- Engagement de l'équipe

---

### 🔬 Cas d'usage 3 : Chercheur en IA

**Profil** : Sarah, doctorante en computer vision

**Besoin** :
- Dataset annoté pour entraîner TrackNetV4
- Qualité d'annotation élevée
- Annotations multiples par frame (consensus)

**Utilisation** :
- Upload de 20 vidéos de compétitions
- Recrutement de 10 annotateurs
- Chaque vidéo annotée par 3 personnes différentes
- Export des annotations en JSON

**Bénéfices** :
- Dataset de 20 000+ frames annotées
- Précision du modèle améliorée
- Publication scientifique

---

### 🎓 Cas d'usage 4 : Enseignant

**Profil** : Professeur d'EPS utilisant Spike Track en cours

**Besoin** :
- Activité pédagogique sur l'analyse vidéo
- Initier les élèves à l'IA
- Projet collaboratif de classe

**Utilisation** :
- Chaque élève annote 50-100 images
- Session de 1h en salle informatique
- Compétition amicale (qui va le plus vite)
- Débrief sur l'utilisation des annotations

**Bénéfices** :
- Compréhension du machine learning
- Travail de précision et concentration
- Activité ludique et collaborative

---

### 💼 Cas d'usage 5 : Télétravailleur

**Profil** : Marie, cherche une activité complémentaire

**Besoin** :
- Micro-tâche rémunérée (si monétisé)
- Flexible (entre deux rendez-vous)
- Pas de compétence technique requise

**Utilisation** :
- Sessions de 10-15 minutes dans la journée
- Annote pendant les pauses café
- Objectif : 1 vidéo par semaine
- Utilise smartphone + tablette

**Bénéfices** :
- Activité simple et relaxante
- Contribution utile
- Revenu complémentaire potentiel

---

## 8. FAQ (FOIRE AUX QUESTIONS)

### 🔐 Connexion et compte

**Q : Dois-je créer un compte ?**
R : Non ! Vous utilisez simplement votre compte Google existant. Pas de nouveau mot de passe à retenir.

**Q : Mes données Google sont-elles en sécurité ?**
R : Oui, l'application utilise OAuth 2.0, le standard de sécurité de Google. Nous accédons uniquement à votre nom, email et photo de profil.

**Q : Puis-je me connecter avec Facebook/Apple ?**
R : Actuellement, seul Google OAuth est disponible. D'autres options pourront être ajoutées selon les besoins.

**Q : Combien de temps dure ma session ?**
R : 7 jours. Après, vous devrez vous reconnecter (sécurité).

**Q : Comment me déconnecter ?**
R : Cliquez sur votre profil en bas de la barre latérale → "Se déconnecter".

---

### 🎬 Utilisation de l'application

**Q : Dois-je annoter toutes les images d'une vidéo d'un coup ?**
R : Non ! Vous pouvez arrêter à tout moment et reprendre plus tard. Votre progression est sauvegardée automatiquement.

**Q : Que faire si je ne vois pas le ballon ?**
R : Appuyez sur "Z" (ou cliquez "Pas de balle"). C'est normal, le ballon n'est pas toujours visible.

**Q : Dois-je être très précis sur la position du ballon ?**
R : Faites de votre mieux. Cliquez au centre du ballon. Une précision à quelques pixels près est suffisante.

**Q : Puis-je revenir en arrière pour corriger une image précédente ?**
R : Actuellement non (fonctionnalité future). Si vous faites une erreur, appuyez sur "Delete" avant de passer à l'image suivante.

**Q : Combien de temps faut-il pour annoter une vidéo complète ?**
R : Environ 1h30 à 3h selon votre vitesse et la complexité du match. Avec de l'entraînement, vous irez plus vite.

**Q : L'application fonctionne-t-elle sur mobile ?**
R : Oui, mais l'expérience est optimisée pour ordinateur. L'écran plus grand facilite la précision.

---

### 📊 Progression et statistiques

**Q : Ma progression est-elle sauvegardée si je ferme le navigateur ?**
R : Oui ! Tout est sauvegardé en temps réel. Vous ne perdrez rien.

**Q : Puis-je voir combien d'images j'ai annotées au total ?**
R : Actuellement, vous voyez la progression par vidéo. Des statistiques globales pourront être ajoutées.

**Q : Que se passe-t-il quand je termine une vidéo ?**
R : Vous voyez un écran de félicitations, puis la vidéo passe dans "Vidéos terminées" sur votre tableau de bord.

**Q : Puis-je recommencer une vidéo déjà terminée ?**
R : Actuellement non. Une fois terminée, la vidéo est complète.

---

### 🛠️ Problèmes techniques

**Q : L'image ne se charge pas.**
R : Vérifiez votre connexion internet. Si le problème persiste, rafraîchissez la page (F5).

**Q : Le bouton "Valider & Suivant" ne fonctionne pas.**
R : Assurez-vous d'avoir cliqué sur le ballon (point rouge visible) ou marqué "pas de balle". Le bouton est désactivé si aucune action n'a été faite.

**Q : Les raccourcis clavier ne fonctionnent pas.**
R : Cliquez sur l'image d'abord pour activer la fenêtre. Assurez-vous que le focus est sur la page (pas dans la barre d'adresse).

**Q : L'application est lente.**
R : Cela peut être dû à une connexion internet faible. Les images sont optimisées, mais une connexion stable est recommandée.

**Q : J'ai été déconnecté en plein milieu.**
R : Votre session a expiré (après 7 jours). Reconnectez-vous, votre progression est sauvegardée.

---

### 💡 Conseils et astuces

**Q : Comment aller plus vite ?**
R :
1. Maîtrisez les raccourcis clavier (A, Z, Delete)
2. Utilisez les points verts comme guide
3. Ne cherchez pas la perfection absolue
4. Trouvez votre rythme de croisière

**Q : Thème clair ou sombre ?**
R : Sombre pour sessions longues (moins de fatigue oculaire). Clair si vous êtes en pleine lumière.

**Q : Combien d'images puis-je annoter en une session ?**
R : Commencez par 50-100 images. Avec l'habitude, vous pourrez faire 300-500 par session.

**Q : Y a-t-il un classement des meilleurs annotateurs ?**
R : Pas encore, mais cette fonctionnalité pourrait être ajoutée pour gamifier l'expérience.

---

### 🎯 Qualité des annotations

**Q : Que se passe-t-il si je fais beaucoup d'erreurs ?**
R : L'objectif est de faire de votre mieux. Quelques erreurs sont normales et attendues. La qualité vient avec la pratique.

**Q : Quelqu'un vérifie-t-il mes annotations ?**
R : Selon le projet, plusieurs personnes peuvent annoter la même vidéo pour vérifier la cohérence (consensus).

**Q : Puis-je voir les annotations d'autres utilisateurs ?**
R : Actuellement non. Chaque utilisateur travaille indépendamment.

**Q : Que faire si le ballon est très flou ?**
R : Faites de votre mieux pour cliquer au centre approximatif. Si c'est vraiment impossible, marquez "pas de balle".

---

### 🌐 Accès et compatibilité

**Q : L'application fonctionne-t-elle hors ligne ?**
R : Non, une connexion internet est nécessaire pour charger les images et sauvegarder les annotations.

**Q : Sur quels navigateurs ça fonctionne ?**
R : Chrome, Firefox, Safari, Edge (versions récentes). Chrome est recommandé pour les meilleures performances.

**Q : Puis-je utiliser l'application sur plusieurs appareils ?**
R : Oui ! Connectez-vous avec le même compte Google, votre progression se synchronise automatiquement.

**Q : Y a-t-il une limite de vidéos que je peux annoter ?**
R : Non, annotez autant que vous voulez !

---

## 🎉 CONCLUSION

Spike Track est une application **simple, rapide et intuitive** pour annoter des vidéos de volleyball.

### Points clés à retenir

✅ **Connexion facile** : Un clic avec Google
✅ **Workflow rapide** : Clic → A → Suivant
✅ **Progression sauvegardée** : Pas de stress
✅ **Raccourcis clavier** : Pour aller 3x plus vite
✅ **Flexible** : Annotez quand vous voulez, à votre rythme

### Prochaines étapes

1. **Connectez-vous** à l'application
2. **Choisissez** une vidéo
3. **Commencez** à annoter
4. **Trouvez votre rythme**
5. **Profitez** de la satisfaction de contribuer ! 🏐

---

**Besoin d'aide ?**
Consultez la FAQ ou contactez le support.

**Bonne annotation ! 🎯**
