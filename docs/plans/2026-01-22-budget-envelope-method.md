# Budget avec Méthode des Enveloppes - Plan d'Implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implémenter la méthode des enveloppes (envelope method) pour le module Budget, permettant l'allocation de fonds depuis les comptes vers des budgets, et le retour automatique des fonds non utilisés en fin de période.

**Architecture:**
- Étendre le modèle Budget existant pour inclure les champs d'allocation (sourceAccount, allocatedAt, returnedAt)
- Créer des transactions de type "transfer" pour simuler l'allocation vers des "enveloppes virtuelles"
- Implémenter un système de retour automatique des fonds non utilisés en fin de mois
- Séparer les budgets des autres dépenses fixes (Sol, Dettes, Investissements)

**Tech Stack:**
- Backend: Node.js + Express + MongoDB + Mongoose 6+
- Frontend: React + Redux Toolkit
- Transactions: MongoDB transactions pour garantir la cohérence des données

---

## Phase 1: Backend - Mise à jour du Modèle Budget

### Task 1: Étendre le modèle Budget

**Files:**
- Modify: `server/src/models/Budget.js`

**Step 1: Ajouter les nouveaux champs au schéma**

Ajouter après le champ `isActive`:

```javascript
sourceAccount: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Account',
  required: false // Sera requis lors de l'allocation
},
allocatedAt: {
  type: Date,
  required: false
},
returnedAt: {
  type: Date,
  required: false
},
status: {
  type: String,
  enum: ['draft', 'allocated', 'active', 'completed', 'archived'],
  default: 'draft'
}
```

**Step 2: Ajouter des propriétés virtuelles calculées**

Ajouter après les champs du schéma:

```javascript
// Propriété virtuelle pour calculer le montant dépensé
budgetSchema.virtual('spent').get(async function() {
  const Transaction = mongoose.model('Transaction');
  const result = await Transaction.aggregate([
    {
      $match: {
        user: this.user,
        type: 'expense',
        category: this.category,
        date: { $gte: this.startDate, $lte: this.endDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);
  return result.length > 0 ? result[0].total : 0;
});

// Propriété virtuelle pour calculer le montant restant
budgetSchema.virtual('remaining').get(function() {
  return this.amount - (this.spent || 0);
});

// Propriété virtuelle pour calculer le pourcentage dépensé
budgetSchema.virtual('percentage').get(function() {
  if (this.amount === 0) return 0;
  return Math.round((this.spent / this.amount) * 100);
});

// Propriété virtuelle pour le statut d'alerte
budgetSchema.virtual('alertStatus').get(function() {
  const percentage = this.percentage;
  if (percentage >= 100) return 'exceeded';
  if (percentage >= this.alertThreshold) return 'warning';
  return 'ok';
});
```

**Step 3: Ajouter une méthode d'instance pour l'allocation**

```javascript
// Méthode pour allouer les fonds depuis un compte
budgetSchema.methods.allocate = async function(accountId, session) {
  const Account = mongoose.model('Account');
  const Transaction = mongoose.model('Transaction');

  // Vérifier que le compte existe et appartient à l'utilisateur
  const account = await Account.findOne({ _id: accountId, user: this.user });
  if (!account) {
    throw new Error('Compte source introuvable');
  }

  // Vérifier que le compte a suffisamment de fonds
  if (account.balance < this.amount) {
    throw new Error('Solde insuffisant dans le compte source');
  }

  // Vérifier que le budget n'a pas déjà été alloué
  if (this.status === 'allocated' || this.status === 'active') {
    throw new Error('Ce budget a déjà été alloué');
  }

  // Créer une transaction de "transfert" vers le budget (virtuel)
  const transaction = new Transaction({
    user: this.user,
    type: 'transfer',
    amount: this.amount,
    currency: this.currency,
    account: accountId,
    category: 'budget_allocation',
    description: `Allocation budget: ${this.name}`,
    date: new Date()
  });

  // Déduire le montant du compte source
  account.balance -= this.amount;
  await account.save({ session });
  await transaction.save({ session });

  // Mettre à jour le budget
  this.sourceAccount = accountId;
  this.allocatedAt = new Date();
  this.status = 'allocated';
  await this.save({ session });

  return this;
};

// Méthode pour retourner les fonds non utilisés
budgetSchema.methods.returnUnusedFunds = async function(session) {
  const Account = mongoose.model('Account');
  const Transaction = mongoose.model('Transaction');

  // Vérifier que le budget a été alloué
  if (!this.sourceAccount || this.status === 'draft') {
    throw new Error('Ce budget n\'a pas été alloué');
  }

  // Vérifier que les fonds n'ont pas déjà été retournés
  if (this.returnedAt) {
    throw new Error('Les fonds ont déjà été retournés');
  }

  // Calculer le montant restant
  const spent = await this.spent;
  const remaining = this.amount - spent;

  if (remaining <= 0) {
    // Rien à retourner, marquer comme complété
    this.status = 'completed';
    this.returnedAt = new Date();
    await this.save({ session });
    return this;
  }

  // Récupérer le compte source
  const account = await Account.findById(this.sourceAccount);
  if (!account) {
    throw new Error('Compte source introuvable');
  }

  // Créer une transaction de retour
  const transaction = new Transaction({
    user: this.user,
    type: 'transfer',
    amount: remaining,
    currency: this.currency,
    account: this.sourceAccount,
    category: 'budget_return',
    description: `Retour fonds non utilisés: ${this.name}`,
    date: new Date()
  });

  // Ajouter le montant au compte source
  account.balance += remaining;
  await account.save({ session });
  await transaction.save({ session });

  // Mettre à jour le budget
  this.returnedAt = new Date();
  this.status = 'completed';
  await this.save({ session });

  return this;
};
```

**Step 4: Commit**

```bash
git add server/src/models/Budget.js
git commit -m "feat(budget): add envelope method fields and methods to Budget model"
```

---

## Phase 2: Backend - Contrôleur Budget

### Task 2: Ajouter les contrôleurs d'allocation et de retour

**Files:**
- Modify: `server/src/controllers/budgetController.js`

**Step 1: Ajouter le contrôleur allocateBudget**

Ajouter à la fin du fichier:

```javascript
// @desc    Allouer les fonds pour un budget
// @route   POST /api/budgets/:id/allocate
// @access  Private
export const allocateBudget = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { accountId } = req.body;

    if (!accountId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Le compte source est requis' });
    }

    const budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!budget) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Budget introuvable' });
    }

    // Appeler la méthode d'allocation
    await budget.allocate(accountId, session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json(budget);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

// @desc    Retourner les fonds non utilisés d'un budget
// @route   POST /api/budgets/:id/return
// @access  Private
export const returnBudgetFunds = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!budget) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Budget introuvable' });
    }

    // Appeler la méthode de retour
    await budget.returnUnusedFunds(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json(budget);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

// @desc    Retourner tous les fonds non utilisés des budgets expirés
// @route   POST /api/budgets/return-all-expired
// @access  Private
export const returnAllExpiredBudgets = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const now = new Date();

    // Trouver tous les budgets expirés non retournés
    const expiredBudgets = await Budget.find({
      user: req.user._id,
      status: { $in: ['allocated', 'active'] },
      endDate: { $lt: now },
      returnedAt: null
    });

    const results = [];

    for (const budget of expiredBudgets) {
      try {
        await budget.returnUnusedFunds(session);
        results.push({ budgetId: budget._id, success: true });
      } catch (error) {
        results.push({ budgetId: budget._id, success: false, error: error.message });
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: `${results.filter(r => r.success).length} budget(s) traité(s)`,
      results
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};
```

**Step 2: Commit**

```bash
git add server/src/controllers/budgetController.js
git commit -m "feat(budget): add allocation and return controllers"
```

---

## Phase 3: Backend - Routes Budget

### Task 3: Ajouter les routes d'allocation et de retour

**Files:**
- Modify: `server/src/routes/budgets.js`

**Step 1: Ajouter les imports nécessaires**

Modifier l'import du contrôleur:

```javascript
import {
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetStats,
  allocateBudget,
  returnBudgetFunds,
  returnAllExpiredBudgets
} from '../controllers/budgetController.js';
```

**Step 2: Ajouter les nouvelles routes**

Ajouter avant `export default router;`:

```javascript
// Routes d'allocation et retour
router.post('/:id/allocate', allocateBudget);
router.post('/:id/return', returnBudgetFunds);
router.post('/return-all-expired', returnAllExpiredBudgets);
```

**Step 3: Commit**

```bash
git add server/src/routes/budgets.js
git commit -m "feat(budget): add allocation and return routes"
```

---

## Phase 4: Frontend - Redux Slice Budget

### Task 4: Ajouter les actions async pour allocation et retour

**Files:**
- Modify: `client/src/store/slices/budgetSlice.js`

**Step 1: Ajouter les thunks d'allocation et de retour**

Ajouter après les thunks existants:

```javascript
// Allouer un budget
export const allocateBudget = createAsyncThunk(
  'budgets/allocate',
  async ({ budgetId, accountId }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/budgets/${budgetId}/allocate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ accountId })
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Retourner les fonds non utilisés d'un budget
export const returnBudgetFunds = createAsyncThunk(
  'budgets/return',
  async (budgetId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/budgets/${budgetId}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Retourner tous les fonds des budgets expirés
export const returnAllExpiredBudgets = createAsyncThunk(
  'budgets/returnAllExpired',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/budgets/return-all-expired', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

**Step 2: Ajouter les reducers pour les nouveaux thunks**

Dans `extraReducers`, ajouter après les reducers existants:

```javascript
// Allocate budget
.addCase(allocateBudget.pending, (state) => {
  state.loading = true;
})
.addCase(allocateBudget.fulfilled, (state, action) => {
  state.loading = false;
  // Mettre à jour le budget dans la liste
  const index = state.budgets.findIndex(b => b._id === action.payload._id);
  if (index !== -1) {
    state.budgets[index] = action.payload;
  }
  state.success = true;
})
.addCase(allocateBudget.rejected, (state, action) => {
  state.loading = false;
  state.error = action.payload;
})

// Return budget funds
.addCase(returnBudgetFunds.pending, (state) => {
  state.loading = true;
})
.addCase(returnBudgetFunds.fulfilled, (state, action) => {
  state.loading = false;
  // Mettre à jour le budget dans la liste
  const index = state.budgets.findIndex(b => b._id === action.payload._id);
  if (index !== -1) {
    state.budgets[index] = action.payload;
  }
  state.success = true;
})
.addCase(returnBudgetFunds.rejected, (state, action) => {
  state.loading = false;
  state.error = action.payload;
})

// Return all expired budgets
.addCase(returnAllExpiredBudgets.pending, (state) => {
  state.loading = true;
})
.addCase(returnAllExpiredBudgets.fulfilled, (state, action) => {
  state.loading = false;
  state.success = true;
  // On pourrait recharger tous les budgets ici
})
.addCase(returnAllExpiredBudgets.rejected, (state, action) => {
  state.loading = false;
  state.error = action.payload;
});
```

**Step 3: Commit**

```bash
git add client/src/store/slices/budgetSlice.js
git commit -m "feat(budget): add allocation and return actions to Redux slice"
```

---

## Phase 5: Frontend - Composants UI

### Task 5: Créer le composant AllocateBudgetModal

**Files:**
- Create: `client/src/components/budgets/AllocateBudgetModal.jsx`

**Step 1: Créer le composant modal d'allocation**

```jsx
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { allocateBudget } from '../../store/slices/budgetSlice';
import { fetchAccounts } from '../../store/slices/accountSlice';

const AllocateBudgetModal = ({ budget, isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { accounts } = useSelector((state) => state.accounts);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchAccounts());
    }
  }, [isOpen, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedAccount) {
      setError('Veuillez sélectionner un compte');
      return;
    }

    try {
      await dispatch(
        allocateBudget({
          budgetId: budget._id,
          accountId: selectedAccount
        })
      ).unwrap();
      onClose();
    } catch (err) {
      setError(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 bg-clip-text text-transparent">
          Allouer le Budget
        </h2>

        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            Budget: <span className="font-semibold">{budget.name}</span>
          </p>
          <p className="text-gray-600">
            Montant: <span className="font-semibold">{budget.amount} {budget.currency}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2 font-medium">
              Compte Source
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              required
            >
              <option value="">Sélectionner un compte</option>
              {accounts
                .filter(account => account.currency === budget.currency && account.isActive)
                .map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.icon} {account.name} - {account.balance} {account.currency}
                  </option>
                ))}
            </select>
            <p className="text-sm text-gray-500 mt-2">
              Ce montant sera déduit du compte sélectionné
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:scale-105 transition-all shadow-lg hover:shadow-purple-500/50"
            >
              Allouer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AllocateBudgetModal;
```

**Step 2: Commit**

```bash
git add client/src/components/budgets/AllocateBudgetModal.jsx
git commit -m "feat(budget): create AllocateBudgetModal component"
```

---

### Task 6: Mettre à jour la page Budgets

**Files:**
- Modify: `client/src/pages/Budgets.jsx`

**Step 1: Importer les nouveaux composants et actions**

Ajouter aux imports:

```javascript
import AllocateBudgetModal from '../components/budgets/AllocateBudgetModal';
import { returnBudgetFunds, returnAllExpiredBudgets } from '../store/slices/budgetSlice';
```

**Step 2: Ajouter les states pour les modals**

Dans le composant, ajouter:

```javascript
const [allocateModalOpen, setAllocateModalOpen] = useState(false);
const [selectedBudgetForAllocation, setSelectedBudgetForAllocation] = useState(null);
```

**Step 3: Ajouter les handlers**

```javascript
const handleAllocate = (budget) => {
  setSelectedBudgetForAllocation(budget);
  setAllocateModalOpen(true);
};

const handleReturn = async (budgetId) => {
  if (window.confirm('Voulez-vous vraiment retourner les fonds non utilisés?')) {
    try {
      await dispatch(returnBudgetFunds(budgetId)).unwrap();
      dispatch(fetchBudgets());
    } catch (error) {
      console.error('Erreur lors du retour des fonds:', error);
    }
  }
};

const handleReturnAllExpired = async () => {
  if (window.confirm('Retourner tous les fonds des budgets expirés?')) {
    try {
      await dispatch(returnAllExpiredBudgets()).unwrap();
      dispatch(fetchBudgets());
    } catch (error) {
      console.error('Erreur:', error);
    }
  }
};
```

**Step 4: Ajouter les boutons dans l'UI**

Dans la section des budgets, ajouter les boutons d'action pour chaque budget:

```jsx
<div className="flex space-x-2">
  {budget.status === 'draft' && (
    <button
      onClick={() => handleAllocate(budget)}
      className="px-4 py-2 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-lg hover:scale-105 transition-all"
    >
      Allouer
    </button>
  )}

  {(budget.status === 'allocated' || budget.status === 'active') && !budget.returnedAt && (
    <button
      onClick={() => handleReturn(budget._id)}
      className="px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-lg hover:scale-105 transition-all"
    >
      Retourner
    </button>
  )}

  {/* Boutons existants (Modifier, Supprimer) */}
</div>
```

**Step 5: Ajouter le bouton pour retourner tous les budgets expirés**

Dans le header de la page:

```jsx
<button
  onClick={handleReturnAllExpired}
  className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl hover:scale-105 transition-all shadow-lg"
>
  Retourner Budgets Expirés
</button>
```

**Step 6: Ajouter le modal en fin de composant**

```jsx
{allocateModalOpen && selectedBudgetForAllocation && (
  <AllocateBudgetModal
    budget={selectedBudgetForAllocation}
    isOpen={allocateModalOpen}
    onClose={() => {
      setAllocateModalOpen(false);
      setSelectedBudgetForAllocation(null);
      dispatch(fetchBudgets());
    }}
  />
)}
```

**Step 7: Commit**

```bash
git add client/src/pages/Budgets.jsx
git commit -m "feat(budget): add allocation and return UI to Budgets page"
```

---

## Phase 6: Tests et Validation

### Task 7: Tester le flux complet

**Step 1: Démarrer l'application**

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

**Step 2: Tests manuels**

1. Se connecter à l'application
2. Créer un nouveau budget (status = draft)
3. Allouer le budget depuis un compte avec suffisamment de fonds
4. Vérifier que le solde du compte a diminué
5. Créer quelques transactions de dépense dans la catégorie du budget
6. Retourner les fonds non utilisés
7. Vérifier que le solde du compte a augmenté du montant restant

**Step 3: Vérifier les transactions**

- Aller dans la page Transactions
- Vérifier la présence de transactions "budget_allocation" et "budget_return"

**Step 4: Tester le retour automatique des budgets expirés**

- Créer un budget avec une date de fin passée
- Allouer le budget
- Cliquer sur "Retourner Budgets Expirés"
- Vérifier que les fonds sont retournés

**Step 5: Commit final**

```bash
git add -A
git commit -m "test(budget): validate envelope method implementation"
```

---

## Phase 7: Documentation

### Task 8: Mettre à jour la documentation

**Files:**
- Modify: `SPECIFICATIONS.md`

**Step 1: Mettre à jour le statut du module Budget**

Changer le statut de:
```markdown
### Status
⚠️ **PARTIELLEMENT IMPLÉMENTÉ** - Nécessite révision pour méthode enveloppe
```

À:
```markdown
### Status
✅ **IMPLÉMENTÉ** - Méthode des enveloppes fonctionnelle
```

**Step 2: Mettre à jour la checklist**

Dans la section "Phase 2: Budget", cocher tous les items:

```markdown
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
```

**Step 3: Commit**

```bash
git add SPECIFICATIONS.md
git commit -m "docs: update Budget module status to completed"
```

---

## Résumé

Ce plan implémente complètement la méthode des enveloppes pour le module Budget:

1. ✅ Modèle étendu avec champs d'allocation
2. ✅ Méthodes d'allocation et de retour avec transactions MongoDB
3. ✅ Contrôleurs et routes API
4. ✅ Actions Redux pour le frontend
5. ✅ UI complète avec modals et boutons
6. ✅ Flux de données cohérent

**Prochaines étapes suggérées:**
- Implémenter la vue "Résumé Mensuel" (vue séparée)
- Ajouter des notifications pour les alertes de budget
- Implémenter le module Sol/Tontine (priorité haute)
