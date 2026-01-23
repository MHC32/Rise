# Rise - Spécifications Complètes

**Application de gestion financière personnelle**
**Stack**: MERN (MongoDB, Express, React, Node.js) + Redux Toolkit

## Table des Matières

1. [Architecture Globale](#architecture-globale)
2. [Module Comptes (Accounts)](#module-comptes-accounts)
3. [Module Transactions](#module-transactions)
4. [Module Budget](#module-budget)
5. [Module Sol/Tontine](#module-soltontine)
6. [Module Dettes](#module-dettes)
7. [Module Investissements](#module-investissements)
8. [Module Épargne](#module-épargne)
9. [Intégrations Entre Modules](#intégrations-entre-modules)
10. [Design System](#design-system)

---

## Architecture Globale

### Utilisateurs
- **Multi-utilisateurs**: ~15 utilisateurs prévus
- **Authentification**: JWT + localStorage
- **Protection des routes**: Middleware `protect` sur toutes les routes API

### Devises
- **HTG** (Gourde Haïtienne) - devise principale
- **USD** (Dollar Américain) - devise secondaire
- Tous les comptes et transactions supportent les deux devises

### Stack Technique
- **Backend**: Node.js + Express + MongoDB + Mongoose 6+
- **Frontend**: React + Redux Toolkit + React Router
- **UI**: Glassmorphism (backdrop-blur, rgba backgrounds)
- **Couleurs**: Gradient purple/pink/yellow

---

## Module Comptes (Accounts)

### Status
✅ **IMPLÉMENTÉ**

### Description
Gestion de plusieurs comptes bancaires et portefeuilles en multi-devises.

### Modèle de Données

```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  name: String, // Ex: "Compte Principal", "Argent de Poche"
  type: String, // "bank", "cash", "mobile_money", "other"
  currency: String, // "HTG" ou "USD"
  balance: Number, // Solde actuel
  initialBalance: Number, // Solde initial
  icon: String, // Emoji pour l'icône
  color: String, // Couleur hex pour l'UI
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Propriétés Virtuelles
- `formattedBalance`: Retourne le solde formaté avec la devise (ex: "10,000 HTG")

### API Endpoints
- `GET /api/accounts` - Liste tous les comptes de l'utilisateur
- `GET /api/accounts/:id` - Détails d'un compte
- `POST /api/accounts` - Créer un nouveau compte
- `PUT /api/accounts/:id` - Modifier un compte
- `DELETE /api/accounts/:id` - Supprimer un compte
- `GET /api/accounts/stats` - Statistiques des comptes

### Règles Métier
1. Un utilisateur peut avoir plusieurs comptes
2. Chaque compte a sa propre devise
3. Le solde est automatiquement mis à jour lors des transactions
4. Les comptes inactifs ne peuvent pas être utilisés pour de nouvelles transactions

---

## Module Transactions

### Status
✅ **IMPLÉMENTÉ** (avec bugs corrigés)

### Description
Suivi de toutes les opérations financières: dépenses, revenus, et transferts entre comptes.

### Types de Transactions

1. **expense** (Dépense)
   - Diminue le solde du compte source
   - Nécessite une catégorie

2. **revenue** (Revenu)
   - Augmente le solde du compte destination
   - Peut avoir une source (ex: salaire, vente)

3. **transfer** (Transfert)
   - Déplace de l'argent entre deux comptes de l'utilisateur
   - Peut inclure des frais de transfert
   - Gère les conversions de devises si nécessaire

### Modèle de Données

```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  type: String, // "expense", "revenue", "transfer"
  amount: Number, // Montant (requis)
  currency: String, // "HTG" ou "USD" (requis)
  account: ObjectId (ref: Account), // Compte source (requis)
  toAccount: ObjectId (ref: Account), // Compte destination (pour transfer)
  category: String, // Catégorie de la dépense
  description: String, // Description optionnelle
  date: Date, // Date de la transaction (requis)
  transferFee: Number, // Frais de transfert (optionnel, pour transfer)
  createdAt: Date,
  updatedAt: Date
}
```

### Catégories de Dépenses

**Catégories confirmées**:
- **nourriture** 🍔 - Nourriture
- **transport** 🚗 - Transport (voiture, moto, tap-tap)
- **abonnements** 📱 - Abonnements (Claude, serveur, etc.)
- **personnel** 👕 - Personnel (vêtements, soins personnels)
- **loisirs** 🎮 - Loisirs
- **communication** 📞 - Communication
- **sante** 💊 - Santé
- **logement** 🏠 - Logement (prévu pour l'année prochaine)
- **famille** 👨‍👩‍👧 - Famille
- **travail** 💼 - Travail
- **sol** 🤝 - Cotisations Sol/Tontine
- **investissement** 💼 - Investissements
- **autre** 🎯 - Autre

### API Endpoints
- `GET /api/transactions` - Liste les transactions (avec pagination)
- `GET /api/transactions/:id` - Détails d'une transaction
- `POST /api/transactions` - Créer une transaction
- `PUT /api/transactions/:id` - Modifier une transaction
- `DELETE /api/transactions/:id` - Supprimer une transaction
- `GET /api/transactions/stats` - Statistiques des transactions

### Règles Métier

1. **Validation des champs**:
   - Tous les champs sont optionnels SAUF: amount, type, account, date, currency
   - Le montant doit être positif
   - Les transferts nécessitent un `toAccount`
   - Le compte source et destination d'un transfert doivent être différents

2. **Mise à jour automatique des soldes**:
   - Les transactions modifient automatiquement les soldes des comptes
   - Utilise des transactions MongoDB pour garantir la cohérence

3. **Frais de transfert**:
   - Exemple: Retrait Moncash a des frais
   - Les frais sont déduits du compte source en plus du montant transféré

4. **Middleware Mongoose**:
   - Utilise `async/await` (Mongoose 6+)
   - Pas de callbacks `next()`
   - Utilise `throw new Error()` pour les erreurs de validation

### Bugs Corrigés
- ✅ Erreur "next is not a function" dans le middleware de validation
- ✅ Erreur "toLocaleString undefined" dans Account virtuals

---

## Module Budget

### Status
✅ **IMPLÉMENTÉ** - Méthode des enveloppes fonctionnelle

### Description
Gestion des budgets par catégorie avec la **méthode des enveloppes** (envelope method).

### Concept: Méthode des Enveloppes

**Principe**:
1. En début de mois, l'utilisateur **alloue** de l'argent de son compte principal vers différentes "enveloppes" (budgets)
2. Pendant le mois, les dépenses sont payées depuis ces enveloppes
3. En fin de mois, l'argent non dépensé **retourne automatiquement** au compte principal

**Exemple**:
- Compte principal: 50,000 HTG
- Allocation Budget Transport: 10,000 HTG
- Allocation Budget Nourriture: 15,000 HTG
- Dépenses Transport du mois: 7,000 HTG
- Fin du mois: 3,000 HTG retournent au compte principal

### Ce qui est Inclus dans les Budgets
- **OUI**: Dépenses contrôlables (nourriture, transport, loisirs, etc.)
- **NON**: Sol/Tontine, Dettes, Investissements (car ce sont des engagements fixes)

### Modèle de Données (à réviser)

```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  name: String, // Ex: "Transport Janvier"
  category: String, // Catégorie de dépense
  amount: Number, // Montant alloué
  currency: String, // "HTG" ou "USD"
  period: String, // "monthly" ou "yearly"
  startDate: Date, // Date de début
  endDate: Date, // Date de fin
  icon: String, // Emoji
  color: String, // Couleur hex
  alertThreshold: Number, // Seuil d'alerte en % (défaut: 80)
  isActive: Boolean,
  sourceAccount: ObjectId (ref: Account), // NOUVEAU: Compte source de l'allocation
  allocatedAt: Date, // NOUVEAU: Date d'allocation
  returnedAt: Date, // NOUVEAU: Date de retour des fonds non utilisés
  createdAt: Date,
  updatedAt: Date
}
```

### Propriétés Virtuelles/Calculées
- `spent`: Montant dépensé (calculé via agrégation des transactions)
- `percentage`: Pourcentage dépensé
- `remaining`: Montant restant
- `status`: "ok" (< 80%), "warning" (80-100%), "exceeded" (> 100%)

### API Endpoints
- `GET /api/budgets` - Liste les budgets
- `GET /api/budgets/:id` - Détails d'un budget
- `POST /api/budgets` - Créer un budget (avec allocation)
- `PUT /api/budgets/:id` - Modifier un budget
- `DELETE /api/budgets/:id` - Supprimer un budget
- `GET /api/budgets/stats` - Statistiques des budgets
- `POST /api/budgets/:id/allocate` - NOUVEAU: Allouer les fonds
- `POST /api/budgets/return-unused` - NOUVEAU: Retourner fonds non utilisés

### Règles Métier

1. **Période de budget**:
   - Généralement mensuel
   - Début de mois par défaut (1er du mois)
   - Fin de mois par défaut (dernier jour du mois)

2. **Alertes**:
   - **Seuil de 80%**: Alerte "warning" (orange)
   - **Dépassement de 100%**: Alerte "exceeded" (rouge)
   - Notification à l'utilisateur

3. **Allocation de fonds** (à implémenter):
   - Créer une transaction "transfer" du compte principal vers un compte virtuel "Budget"
   - Déduire le montant du compte principal
   - Marquer le budget comme "alloué"

4. **Retour des fonds non utilisés** (à implémenter):
   - À la fin du mois, calculer le montant restant
   - Créer une transaction "transfer" vers le compte principal
   - Archiver le budget ou le renouveler pour le mois suivant

5. **Exclusions**:
   - Les catégories "sol", "investissement", "dette" ne doivent PAS être incluses dans les budgets
   - Ces dépenses apparaissent uniquement dans le "Résumé Mensuel"

### Vue Séparée: Résumé Mensuel

**À implémenter**:
- Vue séparée qui montre TOUTES les dépenses du mois
- Inclut: budgets + sols + dettes + investissements
- Permet de voir la vue d'ensemble des finances

---

## Module Sol/Tontine

### Status
❌ **NON IMPLÉMENTÉ**

### Description
Gestion des cotisations collectives (Sol) et personnelles (Tontine), typiques de la culture haïtienne.

### Types de Sol

1. **Sol Collaboratif**:
   - Groupe de personnes qui cotisent
   - Chaque membre reçoit la cagnotte à tour de rôle
   - Exemple: 10 personnes, 5000 HTG/semaine, un membre reçoit 50,000 HTG chaque semaine

2. **Sol Personnel (Tontine)**:
   - Cotisation individuelle régulière
   - Objectif d'épargne personnel
   - Pas de distribution à d'autres membres

### Modèle de Données (proposition)

```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  name: String, // Ex: "Sol Famille"
  type: String, // "collaborative" ou "personal"
  amount: Number, // Montant de la cotisation
  currency: String, // "HTG" ou "USD"
  frequency: String, // "weekly", "monthly"
  startDate: Date,
  endDate: Date, // Optionnel
  members: [{
    name: String,
    phone: String,
    hasReceived: Boolean,
    receivedDate: Date
  }], // Pour Sol collaboratif uniquement
  currentRecipient: ObjectId, // Pour Sol collaboratif
  nextPaymentDate: Date,
  totalContributions: Number, // Total cotisé
  targetAmount: Number, // Objectif (pour Sol personnel)
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Transactions Sol

```javascript
{
  _id: ObjectId,
  sol: ObjectId (ref: Sol),
  user: ObjectId (ref: User),
  type: String, // "contribution", "distribution"
  amount: Number,
  currency: String,
  account: ObjectId (ref: Account), // Compte utilisé pour payer
  date: Date,
  isPaid: Boolean,
  validatedBy: ObjectId (ref: User), // Pour validation de paiement
  validatedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Règles Métier

1. **Rappels automatiques**:
   - Notification avant la date de cotisation
   - Notification si cotisation en retard

2. **Validation des paiements**:
   - Les paiements doivent être validés (par l'organisateur ou automatiquement)
   - Historique des paiements

3. **Distribution (Sol collaboratif)**:
   - Ordre de distribution défini
   - Chaque membre reçoit une fois avant qu'un cycle ne recommence
   - Notification au destinataire actuel

4. **Intégration avec Transactions**:
   - Chaque cotisation crée une transaction de type "expense" avec catégorie "sol"
   - Liée au compte utilisé pour le paiement

---

## Module Dettes

### Status
❌ **NON IMPLÉMENTÉ**

### Description
Suivi des dettes: ce que je dois aux autres ET ce que les autres me doivent.

### Types de Dettes

1. **Je dois** (I owe):
   - Argent que l'utilisateur doit à quelqu'un
   - Peut avoir une échéance
   - Peut être remboursé partiellement

2. **On me doit** (They owe me):
   - Argent que quelqu'un doit à l'utilisateur
   - Suivi des remboursements reçus

### Modèle de Données (proposition)

```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  type: String, // "i_owe" ou "they_owe_me"
  creditor: String, // Nom de la personne (créditeur ou débiteur)
  creditorPhone: String,
  amount: Number, // Montant total de la dette
  currency: String,
  description: String,
  dueDate: Date, // Optionnel
  isComplete: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Remboursements

```javascript
{
  _id: ObjectId,
  debt: ObjectId (ref: Debt),
  user: ObjectId (ref: User),
  amount: Number, // Montant du remboursement partiel
  currency: String,
  account: ObjectId (ref: Account), // Compte utilisé
  date: Date,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Propriétés Calculées
- `totalRepaid`: Somme des remboursements
- `remaining`: Montant restant à payer/recevoir
- `percentageRepaid`: Pourcentage remboursé

### Règles Métier

1. **Remboursements partiels**:
   - Plusieurs remboursements possibles
   - La dette est "complète" quand remaining = 0

2. **Échéances optionnelles**:
   - Certaines dettes n'ont pas de date limite
   - Notification si échéance approche

3. **Rappels**:
   - Notification pour les dettes à échéance proche
   - Notification pour les dettes en retard

4. **Intégration avec Transactions**:
   - Chaque remboursement crée une transaction
   - Type "expense" si je rembourse
   - Type "revenue" si je reçois un remboursement

---

## Module Investissements

### Status
❌ **NON IMPLÉMENTÉ**

### Description
Suivi des investissements, notamment l'**élevage collaboratif** (bétail).

### Concept: Élevage Collaboratif

**Principe**:
- Plusieurs investisseurs achètent et élèvent du bétail ensemble
- Partage des coûts fixes et variables
- Vente du bétail et partage des bénéfices

### Catégories d'Animaux
- Porcs
- Poulets
- Chèvres
- Vaches
- Autres

### Modèle de Données (proposition)

```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User), // Créateur/gestionnaire
  name: String, // Ex: "Élevage Porcs 2026"
  category: String, // "porcs", "poulets", "chevres", "vaches", "autres"
  quantity: Number, // Nombre d'animaux
  purchasePrice: Number, // Prix d'achat total
  currency: String,
  purchaseDate: Date,
  targetSaleDate: Date, // Date de vente prévue
  targetSalePrice: Number, // Objectif de vente
  investors: [{
    user: ObjectId (ref: User),
    name: String,
    share: Number, // Pourcentage de parts (ex: 30%)
    invested: Number // Montant investi
  }],
  status: String, // "active", "sold", "closed"
  soldDate: Date,
  soldPrice: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Coûts d'Élevage

```javascript
{
  _id: ObjectId,
  investment: ObjectId (ref: Investment),
  type: String, // "fixed" (vétérinaire, achat) ou "variable" (nourriture)
  description: String,
  amount: Number,
  currency: String,
  date: Date,
  paidBy: ObjectId (ref: User), // Qui a payé
  account: ObjectId (ref: Account), // Compte utilisé
  createdAt: Date,
  updatedAt: Date
}
```

### Propriétés Calculées
- `totalCosts`: Somme de tous les coûts (fixes + variables)
- `costPerInvestor`: Coût total réparti selon les parts
- `projectedProfit`: (targetSalePrice - purchasePrice - totalCosts)
- `profitPerInvestor`: Bénéfice réparti selon les parts
- `roi`: Retour sur investissement

### Règles Métier

1. **Partage des coûts**:
   - Chaque coût est réparti selon les parts de chaque investisseur
   - Suivi de qui a payé quoi

2. **Coûts fixes vs variables**:
   - **Fixes**: Vétérinaire, achat initial
   - **Variables**: Nourriture quotidienne/hebdomadaire

3. **Objectifs de vente**:
   - Date cible de vente
   - Prix de vente cible
   - Calcul du ROI projeté

4. **Vente et distribution**:
   - Enregistrer le prix de vente réel
   - Calculer le bénéfice réel
   - Distribuer les gains selon les parts

5. **Intégration avec Transactions**:
   - Chaque coût crée une transaction "expense" avec catégorie "investissement"
   - La vente crée des transactions "revenue" pour chaque investisseur

---

## Module Épargne

### Status
❌ **NON IMPLÉMENTÉ**

### Description
Objectifs d'épargne avec suivi de progression.

### Modèle de Données (proposition)

```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  name: String, // Ex: "Voyage en Espagne"
  targetAmount: Number,
  currency: String,
  currentAmount: Number,
  deadline: Date, // Optionnel
  category: String, // "voyage", "urgence", "achat", "autre"
  icon: String,
  color: String,
  isComplete: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Contributions à l'Épargne

```javascript
{
  _id: ObjectId,
  savings: ObjectId (ref: Savings),
  amount: Number,
  account: ObjectId (ref: Account),
  date: Date,
  createdAt: Date
}
```

### Règles Métier

1. **Suivi de progression**:
   - Pourcentage atteint: (currentAmount / targetAmount) * 100
   - Temps restant jusqu'à l'échéance

2. **Contributions régulières ou ponctuelles**:
   - L'utilisateur peut contribuer quand il veut
   - Suggestion de montant mensuel basé sur l'échéance

3. **Intégration avec Transactions**:
   - Option: créer des transactions "transfer" vers un compte "Épargne"
   - Ou simplement suivre les contributions sans affecter les comptes

---

## Intégrations Entre Modules

### Transactions ← Tous les Modules

Tous les modules qui impliquent de l'argent créent des transactions:

```
Sol/Tontine → Transaction (expense, catégorie "sol")
Dettes → Transaction (expense si je paie, revenue si je reçois)
Investissements → Transaction (expense pour coûts, revenue pour vente)
Budget → Transaction (expense depuis l'enveloppe budget)
Épargne → Transaction (transfer vers compte épargne, optionnel)
```

### Budget ← Transactions

Les budgets calculent leur montant dépensé en agrégeant les transactions:

```javascript
// Calculer le montant dépensé pour un budget
const spent = await Transaction.aggregate([
  {
    $match: {
      user: userId,
      type: 'expense',
      category: budget.category,
      date: { $gte: budget.startDate, $lte: budget.endDate }
    }
  },
  {
    $group: {
      _id: null,
      total: { $sum: '$amount' }
    }
  }
]);
```

### Dashboard ← Tous les Modules

Le Dashboard affiche:
- Solde total de tous les comptes
- Dépenses du mois (depuis Transactions)
- Revenus du mois (depuis Transactions)
- Budgets actifs et leur progression
- Prochaines échéances (Sols, Dettes)
- Investissements actifs et ROI

### Résumé Mensuel

Vue dédiée qui agrège:
- Toutes les dépenses du mois (budgets + sols + dettes + investissements)
- Graphique de répartition par catégorie
- Comparaison avec les mois précédents

---

## Design System

### Couleurs

**Palette Officielle** (extraite du wireframe):
```css
--purple-start: #667eea;
--purple-mid: #764ba2;
--pink: #f093fb;
--coral: #f5576c;
--yellow: #ffd876;
--green: #10b981;
--blue: #3b82f6;
--dark: #1e293b;
--text-muted: #64748b;
```

**Gradient Principal** (Background App):
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
/* purple-start → purple-mid */
```

**Gradient Logo**:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #ffd876 100%);
/* purple-start → purple-mid → pink → coral → yellow */
```

**Couleurs de Texte**:
```css
/* Titres */
background: linear-gradient(to right, #667eea, #f093fb, #ffd876);
background-clip: text;
text-fill-color: transparent;
/* purple-start → pink → yellow */
```

**États des Budgets**:
- OK: `text-green-custom` (#10b981) + gradient `from-[#10b981] to-[#3b82f6]`
- Warning (≥80%): `text-orange-500` + gradient `from-orange-400 to-orange-500`
- Exceeded (≥100%): `text-red-600` + gradient `from-red-500 to-red-600`

### Glassmorphism

```css
/* Sidebar */
background: rgba(255, 255, 255, 0.1);
backdrop-filter: blur(20px);
border: 2px solid rgba(255, 255, 255, 0.2);

/* Cards */
background: rgba(255, 255, 255, 0.95);
backdrop-filter: blur(10px);
```

### Composants

**Boutons Primaires**:
```css
background: linear-gradient(135deg, #f093fb, #f5576c);
/* pink → coral */
hover: scale(1.05);
shadow: 0 0 20px rgba(240, 147, 251, 0.5);
```

**Boutons Secondaires**:
```css
background: rgba(255, 255, 255, 0.2);
backdrop-filter: blur(10px);
border: 2px solid rgba(255, 255, 255, 0.3);
```

**Inputs**:
```css
border: 2px solid #E5E7EB; /* gray-200 */
focus: border-color: #667eea; /* purple-start */
focus: ring: 2px solid #667eea;
border-radius: 12px;
```

### Icônes

Utilisation d'emojis pour les icônes:
- 💳 Comptes
- 📊 Transactions
- 🎯 Budgets
- 🤝 Sols
- 💸 Dettes
- 💼 Investissements
- 💰 Épargne
- 🔔 Notifications
- ⚙️ Paramètres

---

## Checklist d'Implémentation

### Phase 1: Fondations (✅ Complété)
- [x] Backend: Setup serveur Express + MongoDB
- [x] Backend: Authentification (User model, login, register)
- [x] Backend: Module Comptes
- [x] Backend: Module Transactions
- [x] Frontend: Setup React + Redux + Router
- [x] Frontend: Pages Login/Register
- [x] Frontend: Layout avec navigation
- [x] Frontend: Page Dashboard (basique)
- [x] Frontend: Page Comptes
- [x] Frontend: Page Transactions

### Phase 2: Budget (✅ Complété)
- [x] Backend: Budget model basique
- [x] Backend: Budget controller et routes
- [x] Frontend: Budget slice (Redux)
- [x] Frontend: Page Budgets avec CRUD
- [x] Implémenter méthode des enveloppes
  - [x] Allocation de fonds (transaction vers budget)
  - [x] Retour automatique des fonds non utilisés
  - [x] Séparer budgets des autres dépenses
  - [ ] Créer vue "Résumé Mensuel" (à faire séparément)

### Phase 3: Sol/Tontine (❌ Non commencé)
- [ ] Backend: Sol model
- [ ] Backend: SolTransaction model
- [ ] Backend: Sol controller et routes
- [ ] Backend: Système de rappels
- [ ] Frontend: Sol slice
- [ ] Frontend: Page Sols
- [ ] Frontend: Gestion des membres
- [ ] Frontend: Validation des paiements

### Phase 4: Dettes (❌ Non commencé)
- [ ] Backend: Debt model
- [ ] Backend: Repayment model
- [ ] Backend: Debt controller et routes
- [ ] Frontend: Debt slice
- [ ] Frontend: Page Dettes
- [ ] Frontend: Suivi des remboursements

### Phase 5: Investissements (❌ Non commencé)
- [ ] Backend: Investment model
- [ ] Backend: InvestmentCost model
- [ ] Backend: Investment controller et routes
- [ ] Frontend: Investment slice
- [ ] Frontend: Page Investissements
- [ ] Frontend: Gestion des coûts
- [ ] Frontend: Calcul du ROI

### Phase 6: Épargne (❌ Non commencé)
- [ ] Backend: Savings model
- [ ] Backend: SavingsContribution model
- [ ] Backend: Savings controller et routes
- [ ] Frontend: Savings slice
- [ ] Frontend: Page Épargne

### Phase 7: Intégrations et Améliorations
- [ ] Dashboard complet avec toutes les statistiques
- [ ] Résumé Mensuel (vue unifiée)
- [ ] Système de notifications
- [ ] Graphiques et visualisations
- [ ] Export de données (PDF, Excel)
- [ ] Paramètres utilisateur

---

## Notes Techniques Importantes

### Mongoose 6+
- Utiliser `async/await` dans les middlewares
- Ne PAS utiliser `next()` dans les middlewares async
- Utiliser `throw new Error()` pour les erreurs

### Gestion des Erreurs
- Toujours vérifier si les valeurs sont `undefined` avant d'appeler des méthodes
- Utiliser l'opérateur nullish coalescing `??` pour les valeurs par défaut

### Transactions MongoDB
- Utiliser des transactions pour les opérations qui modifient plusieurs documents
- Exemple: Transfer entre comptes, allocation de budget

### Redux Toolkit
- Utiliser `createAsyncThunk` pour les appels API
- Gérer loading, error, et success states
- Utiliser `createSlice` pour simplifier le code

---

## Prochaines Étapes Immédiates

1. **Terminer le module Budget** avec la méthode des enveloppes
2. **Définir la liste complète des catégories** de transactions
3. **Implémenter le module Sol/Tontine** (priorité haute pour l'utilisateur)
4. **Créer le Dashboard complet** avec toutes les statistiques
5. Continuer avec Dettes et Investissements

---

**Document créé le**: 2026-01-22
**Dernière mise à jour**: 2026-01-22
**Version**: 1.0
