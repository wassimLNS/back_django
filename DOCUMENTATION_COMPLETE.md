# 📡 Portail de Réclamations — Algérie Télécom
## Documentation Complète du Projet (PFE)

---

## 📋 Table des Matières

1. [Présentation du Projet](#1-présentation-du-projet)
2. [Stack Technique](#2-stack-technique)
3. [Architecture Générale](#3-architecture-générale)
4. [Base de Données](#4-base-de-données)
5. [Backend Django](#5-backend-django)
6. [API Endpoints](#6-api-endpoints)
7. [Authentification JWT](#7-authentification-jwt)
8. [Rôles & Permissions](#8-rôles--permissions)
9. [Logique Métier](#9-logique-métier)
10. [WebSocket & Chat](#10-websocket--chat)
11. [Notifications Email](#11-notifications-email)
12. [Rapports & Exports](#12-rapports--exports)
13. [Frontend React](#13-frontend-react)
14. [Lancer le Projet](#14-lancer-le-projet)
15. [Décisions Techniques](#15-décisions-techniques)

---

## 1. Présentation du Projet

### Contexte
Portail web de gestion des réclamations (tickets) pour **Algérie Télécom**. Projet de Fin d'Études (PFE).

### Objectif
Permettre aux clients d'Algérie Télécom de déposer leurs réclamations en ligne et aux agents de les traiter efficacement, avec un système d'attribution automatique, de chat en temps réel, et de rapports de performance.

### Types de Dérangements Supportés
| Code | Libellé | Priorité |
|---|---|---|
| PAS_TONALITE | Pas de tonalité | Haute |
| PAS_APPELS | Pas d'appels émis/reçus | Haute |
| FRITURES_LIGNE | Fritures sur ligne | Normale |
| CHUTE_DEBIT | Chute de débit internet | Normale |
| PAS_INTERNET | Pas d'internet | Haute |
| LIAISON_SPECIALISEE | Liaison spécialisée | Haute |
| IDOOM_INTERNET_PRO | IDOOM Internet PRO | Normale |
| INTRANET_VPN | Intranet/VPN | Haute |
| SIGNAUX_NON_RETABLIS | Problèmes signaux non rétablis | Haute |
| PING_ELEVE | Ping élevé | Normale |
| UPLOAD_FAIBLE | Upload faible | Normale |
| COUPURES_REPETITIVES | Coupures répétitives | Haute |
| COUVERTURE_4G | Problème de couverture réseau (4G LTE) | Normale |
| PAS_TONALITE_INTERNET | Pas de tonalité / pas d'internet | Critique |

---

## 2. Stack Technique

| Composant | Technologie | Version |
|---|---|---|
| Frontend | React (create-react-app) | 18.x |
| Backend | Django + Django REST Framework | 6.0 + 3.14 |
| Base de données (dev) | SQLite | — |
| Base de données (prod) | PostgreSQL | 15 |
| Authentification | JWT + Refresh Token | simplejwt 5.3 |
| Temps réel | Django Channels + Redis | 4.0 |
| Emails | SMTP Gmail | — |
| Export PDF | ReportLab | 4.1 |
| Export Excel | OpenPyXL | 3.1 |
| Gestionnaire dépendances | Pipenv | — |
| Icons Frontend | lucide-react | — |
| HTTP Frontend | axios | — |
| Routing Frontend | react-router-dom | — |

### Charte Graphique AT
| Élément | Valeur |
|---|---|
| Couleur bleue principale | `#0055A4` |
| Couleur verte | `#10B981` |
| Couleur verte staff | `#059669` |
| Fond page | `#F8FAFC` |
| Fond card | `#FFFFFF` |
| Bordure top card | `10px solid #0055A4` |
| Border radius card | `24px` |
| Police titres | Barlow Condensed (700/800/900) |
| Police corps | Barlow (400/600/700) |

---

## 3. Architecture Générale

```
projet/
├── back/                        ← Backend Django
│   ├── config/
│   │   ├── settings.py          ← Configuration Django
│   │   ├── urls.py              ← Routes principales
│   │   └── asgi.py              ← WebSocket (Channels)
│   ├── apps/
│   │   ├── users/               ← Auth, utilisateurs, lignes tél
│   │   ├── centres/             ← Centres AT, paramètres SLA
│   │   ├── tickets/             ← Réclamations, pièces jointes, escalades
│   │   ├── chat/                ← Messages WebSocket temps réel
│   │   ├── notifications/       ← Emails SMTP automatiques
│   │   └── rapports/            ← Stats, export PDF/Excel
│   ├── templates/
│   │   └── emails/
│   │       └── statut_change.html
│   ├── manage.py
│   ├── Pipfile
│   └── .env
│
└── front/                       ← Frontend React (à faire)
    └── src/
        ├── App.js
        └── pages/
            ├── LoginClient.jsx  ← Page /
            ├── LoginStaff.jsx   ← Page /staff
            └── Login.css
```

---

## 4. Base de Données

### Schéma SQL (PostgreSQL)
Le schéma complet est dans `algerie_telecom_schema.sql`.

### Tables Principales

#### `utilisateurs`
Table commune à tous les rôles.
| Colonne | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| role | ENUM | client, agent, agent_technique, agent_annexe, admin |
| telephone | VARCHAR | Utilisé pour l'auth client |
| email | VARCHAR | Utilisé pour l'auth staff |
| mot_de_passe_hash | TEXT | Hash bcrypt |
| nom, prenom | VARCHAR | Identité |
| type_client | ENUM | particulier, professionnel |
| centre_id | FK | Centre de rattachement |
| actif | BOOLEAN | Compte actif/désactivé |

**Contrainte importante :** Un seul admin par centre
```sql
CREATE UNIQUE INDEX idx_un_admin_par_centre 
ON utilisateurs(centre_id) WHERE role = 'admin';
```

**Contrainte :** Email obligatoire pour agents/admin
```sql
ALTER TABLE utilisateurs
ADD CONSTRAINT chk_email_agents
CHECK (role = 'client' OR email IS NOT NULL);
```

#### `lignes_telephoniques`
Un client peut avoir plusieurs lignes (plusieurs maisons).
| Colonne | Type | Description |
|---|---|---|
| id | SERIAL | Identifiant |
| client_id | FK | Référence utilisateur (client) |
| numero | VARCHAR | Numéro de ligne (unique) |
| type_abonnement | VARCHAR | ADSL, Fibre, IDOOM... |
| num_contrat | VARCHAR | Numéro de contrat AT |
| date_abonnement | DATE | Date de souscription |
| actif | BOOLEAN | Ligne active |

#### `centres_distribution`
| Colonne | Type | Description |
|---|---|---|
| id | SERIAL | Identifiant |
| code | VARCHAR | ex: AT-ALGER-01 |
| nom | VARCHAR | Nom du centre |
| wilaya | VARCHAR | Wilaya |
| prefixes_tel | JSON | Préfixes téléphoniques couverts |
| actif | BOOLEAN | Centre actif |

#### `tickets`
| Colonne | Type | Description |
|---|---|---|
| id | UUID | Identifiant |
| numero_ticket | VARCHAR | ex: TKT-2026-000001 |
| client_id | FK | Client qui a déposé |
| agent_id | FK | Agent assigné |
| agent_technique_id | FK | Agent technique (si escalade) |
| agent_annexe_id | FK | Agent annexe (si escalade) |
| centre_id | FK | Centre de traitement |
| type_service_id | FK | Type de dérangement |
| statut | ENUM | soumis, ouvert, en_cours, escalade_*, resolu, ferme, rejete |
| priorite | ENUM | basse, normale, haute, critique |
| echeance_sla | DATETIME | Délai de résolution calculé auto |

#### `messages`
| Colonne | Type | Description |
|---|---|---|
| id | BIGSERIAL | Identifiant |
| ticket_id | FK | Ticket concerné |
| expediteur_id | FK | Qui a envoyé |
| expediteur_type | ENUM | client, agent, agent_technique, agent_annexe, systeme |
| contenu | TEXT | Contenu du message |
| lu_par_client | BOOLEAN | Lu par le client |
| lu_par_agent | BOOLEAN | Lu par l'agent |

#### `escalades`
| Colonne | Type | Description |
|---|---|---|
| id | SERIAL | Identifiant |
| ticket_id | FK | Ticket escaladé |
| type_escalade | ENUM | technique, annexe |
| agent_source_id | FK | Agent qui escalade |
| agent_cible_id | FK | Agent qui reçoit |
| motif | TEXT | Raison de l'escalade (obligatoire) |
| resume_ia | TEXT | Résumé IA (prévu plus tard) |

#### `emails`
Journal de tous les emails envoyés.
| Colonne | Type | Description |
|---|---|---|
| id | BIGSERIAL | Identifiant |
| destinataire_id | FK | Utilisateur destinataire |
| destinataire_email | VARCHAR | Email au moment de l'envoi |
| type_email | ENUM | statut_change, ticket_resolu... |
| statut | ENUM | en_attente, envoye, echec |
| tentatives | SMALLINT | Nombre de tentatives |

---

## 5. Backend Django

### Structure de chaque App
Chaque app contient :
```
app/
├── models.py        ← Modèles Django
├── serializers.py   ← Sérialisation DRF
├── views.py         ← Logique des endpoints
├── urls.py          ← Routes de l'app
├── permissions.py   ← Contrôle d'accès
├── admin.py         ← Interface Django Admin
└── apps.py          ← Configuration de l'app
```

### App `users`
- Modèles : `Utilisateur`, `LigneTelephonique`, `HistoriqueConnexion`
- Auth client : téléphone + mot de passe
- Auth staff : email + mot de passe
- Permissions : `EstClient`, `EstAgent`, `EstAdmin`, `EstAgentOuPlus`, `EstAgentEscalade`

### App `centres`
- Modèles : `CentreDistribution`, `ParametresCentre`
- Gestion des centres AT et leurs paramètres SLA

### App `tickets`
- Modèles : `Ticket`, `TypeService`, `PieceJointe`, `Escalade`
- Signal `pre_save` → email automatique si statut change
- Génération automatique du numéro ticket : `TKT-{ANNÉE}-{XXXXXX}`

### App `chat`
- Modèle : `Message`
- API REST pour récupérer/envoyer des messages
- WebSocket via `ChatConsumer` (Django Channels)
- Chaque ticket a son canal : `ticket_{ticket_id}`

### App `notifications`
- Modèle : `Email`
- Envoi via SMTP Gmail
- Template HTML : `templates/emails/statut_change.html`
- Déclenché automatiquement par signal Django

### App `rapports`
- Pas de modèle propre
- Utilise les données de toutes les autres apps
- Statistiques temps réel
- Export PDF (ReportLab)
- Export Excel (OpenPyXL, 2 feuilles : Tickets + Performances)

---

## 6. API Endpoints

**Base URL :** `http://127.0.0.1:8000/api`

**Headers requis (sauf login) :**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

### 🔐 Auth & Utilisateurs — `/api/users/`

| Méthode | URL | Rôle | Qui |
|---|---|---|---|
| POST | `/users/login/client/` | Login client | — |
| POST | `/users/login/agent/` | Login staff | — |
| POST | `/users/logout/` | Déconnexion | Tous |
| POST | `/auth/token/refresh/` | Renouveler token | Tous |
| GET | `/users/me/` | Mon profil | Tous |
| PUT | `/users/me/` | Modifier profil | Tous |
| GET | `/users/agents/` | Liste agents du centre | Admin |
| POST | `/users/agents/` | Créer agent | Admin |
| GET | `/users/agents/{id}/` | Détail agent | Admin |
| PUT | `/users/agents/{id}/` | Modifier agent | Admin |
| DELETE | `/users/agents/{id}/` | Désactiver agent | Admin |
| GET | `/users/connexions/` | Historique connexions agents | Admin |
| GET | `/users/clients/connexions/` | Historique connexions clients | Agent + Admin |
| GET | `/users/mes-lignes/` | Mes lignes téléphoniques | Client |
| POST | `/users/mes-lignes/` | Ajouter une ligne | Client |
| GET | `/users/mes-lignes/{id}/` | Détail ligne | Client |
| PUT | `/users/mes-lignes/{id}/` | Modifier ligne | Client |
| DELETE | `/users/mes-lignes/{id}/` | Désactiver ligne | Client |

### 🏢 Centres — `/api/centres/`

| Méthode | URL | Rôle | Qui |
|---|---|---|---|
| GET | `/centres/` | Liste centres | Admin |
| POST | `/centres/` | Créer centre | Admin |
| GET | `/centres/{id}/` | Détail centre | Admin |
| PUT | `/centres/{id}/` | Modifier centre | Admin |
| DELETE | `/centres/{id}/` | Désactiver centre | Admin |
| GET | `/centres/parametres/` | Voir paramètres SLA | Admin |
| PUT | `/centres/parametres/` | Modifier paramètres SLA | Admin |
| GET | `/centres/mon-centre/` | Mon centre | Tous |

### 🎫 Tickets — `/api/tickets/`

| Méthode | URL | Rôle | Qui |
|---|---|---|---|
| GET | `/tickets/types-service/` | Types de dérangement | Tous |
| GET | `/tickets/mes-tickets/` | Mes tickets | Client |
| POST | `/tickets/mes-tickets/` | Créer ticket (statut initial: soumis) | Client |
| GET | `/tickets/mes-tickets/{id}/` | Détail ticket | Client |
| POST | `/tickets/mes-tickets/{id}/` | Donner satisfaction | Client |
| DELETE | `/tickets/mes-tickets/{id}/` | Supprimer ticket (seulement si statut == soumis) | Client |
| GET | `/tickets/agent/mes-tickets/` | Tickets assignés | Agent |
| GET | `/tickets/agent/mes-tickets/{id}/` | Détail ticket | Agent |
| PUT | `/tickets/agent/mes-tickets/{id}/` | Changer statut | Agent |
| POST | `/tickets/agent/mes-tickets/{id}/escalader/` | Escalader | Agent |
| GET | `/tickets/escalades/` | Tickets escaladés | Agent Tech/Annexe |
| GET | `/tickets/admin/tous/` | Tous les tickets | Admin |
| POST | `/tickets/admin/{id}/attribuer/` | Attribution manuelle | Admin |
| POST | `/tickets/{id}/pieces-jointes/` | Ajouter pièce jointe | Tous |

### 💬 Chat — `/api/chat/`

| Méthode | URL | Rôle | Qui |
|---|---|---|---|
| GET | `/chat/{ticket_id}/messages/` | Voir messages | Tous |
| POST | `/chat/{ticket_id}/messages/` | Envoyer message | Tous |
| GET | `/chat/non-lus/` | Messages non lus | Tous |
| WS | `ws://127.0.0.1:8000/ws/chat/{ticket_id}/` | Chat temps réel | Tous |

### 📧 Notifications — `/api/notifications/`

| Méthode | URL | Rôle | Qui |
|---|---|---|---|
| GET | `/notifications/historique/` | Historique emails | Admin |
| POST | `/notifications/tester/` | Tester SMTP | Admin |

### 📊 Rapports — `/api/rapports/`

| Méthode | URL | Rôle | Qui |
|---|---|---|---|
| GET | `/rapports/stats/` | Statistiques générales | Admin |
| GET | `/rapports/performances/` | Performances agents | Admin |
| GET | `/rapports/export/pdf/` | Export PDF | Admin |
| GET | `/rapports/export/excel/` | Export Excel | Admin |

---

## 7. Authentification JWT

### Fonctionnement
```
Client envoie : identifiant + mot de passe
Serveur répond : access_token + refresh_token
```

| Token | Durée | Usage |
|---|---|---|
| `access` | 60 minutes | Toutes les requêtes API |
| `refresh` | 7 jours | Renouveler le access token |

### Renouveler le token
```http
POST /api/auth/token/refresh/
Content-Type: application/json

{
    "refresh": "eyJhbGci..."
}
```

### Stockage côté frontend
```javascript
localStorage.setItem('access', res.data.tokens.access);
localStorage.setItem('refresh', res.data.tokens.refresh);
localStorage.setItem('user', JSON.stringify(res.data.user));
```

### Utilisation dans les requêtes
```javascript
headers: {
    Authorization: `Bearer ${localStorage.getItem('access')}`
}
```

---

## 8. Rôles & Permissions

| Rôle | Auth | Créé par |
|---|---|---|
| `client` | téléphone + mdp | Présentiellement chez AT |
| `agent` | email + mdp | Admin du centre |
| `agent_technique` | email + mdp | Admin du centre |
| `agent_annexe` | email + mdp | Admin du centre |
| `admin` | email + mdp | Django Admin (superuser) |

### Permissions Django (permissions.py)
```python
EstClient       → role == 'client'
EstAgent        → role == 'agent'
EstAgentTechnique → role == 'agent_technique'
EstAgentAnnexe  → role == 'agent_annexe'
EstAdmin        → role == 'admin'
EstAgentOuPlus  → role in ['agent', 'agent_technique', 'agent_annexe', 'admin']
EstAgentEscalade → role in ['agent_technique', 'agent_annexe']
```

---

## 9. Logique Métier

### Attribution Automatique des Tickets
1. Client crée un ticket
2. Système détecte le centre via `client.centre`
3. Si attribution auto activée → attribue à l'agent avec le moins de tickets actifs
4. Calcule l'échéance SLA selon la priorité

### Calcul SLA
| Priorité | Délai par défaut |
|---|---|
| Basse | 72 heures |
| Normale | 48 heures |
| Haute | 24 heures |
| Critique | 4 heures |

Ces délais sont configurables par centre dans `ParametresCentre`.

### Transitions de Statut
```
soumis            → ouvert (lorsqu'un agent prend en charge), rejete, (suppression par le client)
ouvert            → en_cours, rejete
en_cours          → resolu, escalade_technique, escalade_annexe, rejete
escalade_technique → resolu, ferme
escalade_annexe   → resolu, ferme
resolu            → ferme
```

### Escalade
- L'agent décide d'escalader si le problème est trop complexe
- Motif obligatoire
- Le ticket passe en statut `escalade_technique` ou `escalade_annexe`
- L'agent technique/annexe voit **toute la discussion** avec le client
- Résumé IA prévu (à implémenter)

### Numérotation des Tickets
Format : `TKT-{ANNÉE}-{XXXXXX}`
Exemple : `TKT-2026-000001`

---

## 10. WebSocket & Chat

### Architecture
```
Client React ←→ WebSocket ←→ Django Channels ←→ Redis ←→ Autres clients
```

### URL WebSocket
```
ws://127.0.0.1:8000/ws/chat/{ticket_id}/
```

### Format des messages WebSocket
**Envoyer :**
```json
{
    "contenu": "Bonjour, ma connexion est coupée !"
}
```

**Recevoir :**
```json
{
    "type": "message",
    "message_id": 1,
    "contenu": "Bonjour, ma connexion est coupée !",
    "expediteur_id": "uuid...",
    "expediteur_nom": "Benali",
    "expediteur_prenom": "Karim",
    "expediteur_type": "client",
    "created_at": "2026-03-29T14:39:30.240906+01:00"
}
```

> ⚠️ **Note :** Le WebSocket nécessite Redis installé et daphne comme serveur ASGI. En développement sans Redis, utiliser l'API REST `/api/chat/{ticket_id}/messages/`.

---

## 11. Notifications Email

### Déclencheur
Un email est envoyé automatiquement au client quand le statut de son ticket change vers : `en_cours`, `resolu`, `ferme`, `rejete`.

### Fonctionnement
```
Changement statut ticket
        ↓
Signal pre_save Django
        ↓
notifier_changement_statut()
        ↓
Template HTML rendu
        ↓
Envoi SMTP Gmail
        ↓
Enregistrement dans table emails
```

### Configuration SMTP (.env)
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=votre-email@gmail.com
EMAIL_HOST_PASSWORD=votre-mot-de-passe-app
```

---

## 12. Rapports & Exports

### Statistiques (temps réel)
- Total tickets par statut
- Tickets par priorité
- Tickets par type de dérangement
- Évolution par jour (7 derniers jours)
- Évolution par mois (6 derniers mois)
- Satisfaction client moyenne

### Performances des Agents
- Total tickets traités
- Taux de résolution (%)
- Taux d'escalade (%)
- Temps moyen de résolution (minutes)
- Satisfaction client moyenne
- Dernière connexion

### Export PDF
- Généré avec ReportLab
- Contient : statistiques générales + tableau performances agents
- Couleurs Algérie Télécom (`#0055A4`)
- Nom de fichier : `rapport_{CODE_CENTRE}_{DATE}.pdf`

### Export Excel
- Généré avec OpenPyXL
- Feuille 1 : Liste complète des tickets
- Feuille 2 : Performances des agents
- Nom de fichier : `rapport_{CODE_CENTRE}_{DATE}.xlsx`

---

## 13. Frontend React

> ⚠️ **Status :** Non commencé (à faire)

### Routes Prévues
| URL | Page | Rôle |
|---|---|---|
| `/` | LoginClient | Client |
| `/staff` | LoginStaff | Staff (agents, admin) |
| `/client/dashboard` | Dashboard Client | Client |
| `/client/tickets` | Mes Tickets | Client |
| `/client/tickets/{id}` | Détail Ticket + Chat | Client |
| `/agent/dashboard` | Dashboard Agent | Agent |
| `/agent/tickets` | Mes Tickets | Agent |
| `/agent/tickets/{id}` | Détail Ticket + Chat | Agent |
| `/technique/dashboard` | Dashboard Agent Technique | Agent Technique |
| `/annexe/dashboard` | Dashboard Agent Annexe | Agent Annexe |
| `/admin/dashboard` | Dashboard Admin | Admin |
| `/admin/agents` | Gestion Agents | Admin |
| `/admin/tickets` | Tous les Tickets | Admin |
| `/admin/rapports` | Rapports & Stats | Admin |

### Composants & Fonctionnalités Clés Implémentés
- **Client :**
  - Consultation de la liste de ses tickets avec info bulles pour les statuts.
  - Affichage des pièces jointes en prévisualisation directe (sans téléchargement) depuis un Drawer latéral affichant les détails du ticket et le chat.
  - Possibilité de supprimer le ticket si et seulement si son statut actuel est "soumis" (ticket pas encore traité par un agent).
  - La date de création du ticket figure de façon bien visible dans la carte d'information du ticket.
- **Agent :**
  - KPI dynamiques en haut du tableau de bord (résolus du jour, respect SLA global, etc.).
  - File d'attente détaillée affichant la SLA et l'urgence pour le traitement des cas.
  - Affichage précis de la date de création du ticket lors de son ouverture.
  - Escalade vers d'autres niveaux de support (Technique ou Annexe) avec intégration prête (mocked pour le moment) d'une technologie IA pour la génération de résumés.
  - Option de résolution simple par bouton dédié.
- **Transverse :** 
  - Dynamicité du Header selon le rôle de l'utilisateur authentifié.

### Pages Login (faites)
- `LoginClient.jsx` → `/` → téléphone + mot de passe
- `LoginStaff.jsx` → `/staff` → email + mot de passe
- `Login.css` → styles partagés

### Dépendances Frontend Installées
```bash
npm install axios react-router-dom lucide-react
```

---

## 14. Lancer le Projet

### Backend
```bash
cd back

# Activer l'environnement
pipenv shell

# Installer les dépendances
pipenv install

# Appliquer les migrations
pipenv run python manage.py migrate

# Créer le superuser (admin)
pipenv run python manage.py createsuperuser

# Lancer le serveur
pipenv run python manage.py runserver
```

### Créer les données de test
```bash
pipenv run python manage.py shell
```
```python
from apps.centres.models import CentreDistribution, ParametresCentre
from apps.users.models import Utilisateur
from apps.tickets.models import TypeService

# Centre
centre = CentreDistribution.objects.create(
    code='AT-ALGER-01',
    nom='Centre Alger Centre',
    wilaya='Alger',
    prefixes_tel=['0561', '0562', '0770', '0771']
)
ParametresCentre.objects.create(centre=centre)

# Rattacher l'admin au centre
admin = Utilisateur.objects.first()
admin.centre = centre
admin.save()

# Client test
client = Utilisateur.objects.create(
    role='client', nom='Benali', prenom='Karim',
    telephone='0561234567', type_client='particulier',
    num_contrat='AT-2024-001', centre=centre,
)
client.set_password('client123')
client.save()

# Types de service
types = [
    ('PAS_TONALITE', 'Pas de tonalité', 3),
    ('PAS_INTERNET', "Pas d'internet", 3),
    ('CHUTE_DEBIT', 'Chute de débit internet', 2),
    # ... etc
]
for code, libelle, priorite in types:
    TypeService.objects.create(code=code, libelle=libelle, priorite_defaut=priorite)
```

### Frontend
```bash
cd front
npm install
npm start
```

### Variables d'environnement (.env)
```env
SECRET_KEY=algerie-telecom-super-secret-key-2024
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=algerie_telecom
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

REDIS_URL=redis://localhost:6379/0

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=votre-email@gmail.com
EMAIL_HOST_PASSWORD=votre-mot-de-passe-app

ACCESS_TOKEN_LIFETIME_MINUTES=60
REFRESH_TOKEN_LIFETIME_DAYS=7

CORS_ALLOWED_ORIGINS=http://localhost:3000
```

---

## 15. Décisions Techniques

| Décision | Choix | Raison |
|---|---|---|
| Un seul modèle utilisateur | Table `utilisateurs` unique | Simplifier les jointures et l'auth |
| Stockage pièces jointes | BYTEA PostgreSQL | Pas de serveur de fichiers externe |
| Auth client | Téléphone + mdp | AT identifie ses clients par numéro |
| Auth staff | Email + mdp | Standard professionnel |
| Pas d'inscription client | Login seul | Base clients existante chez AT |
| Attribution automatique | Agent le moins chargé | Équilibrage de charge |
| Centre du client | `client.centre` FK | Rattachement présentiel chez AT |
| Plusieurs lignes tél | Table `LigneTelephonique` | Client peut avoir plusieurs maisons |
| Notifications | Email SMTP seul | Simple, pas de dépendance externe |
| CSS | Tailwind CSS v3 + shadcn/ui | Meilleur rendu visuel, composants réutilisables, cohérence UI |
| Base dev | SQLite | Pas d'installation PostgreSQL requise |
| Numéro ticket | `TKT-{ANNÉE}-{XXXXXX}` | Lisible et unique |
| Admin par centre | Un seul admin | Contrainte métier AT |

---

## 📊 Diagrammes UML

Les codes PlantUML pour les diagrammes de classes et de cas d'utilisation sont disponibles séparément.

---

*Documentation générée dans le cadre du PFE — Algérie Télécom Portail Réclamations*
*Stack : React + Django + PostgreSQL*
