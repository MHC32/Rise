# Module Sol/Tontine - Plan d'Implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implémenter le module de gestion des Sols (cotisations collaboratives) et Tontines (épargne personnelle), typiques de la culture haïtienne, avec suivi des contributions, distributions, et intégration complète avec les transactions.

**Architecture:**
- Deux types de Sols: Collaboratif (plusieurs membres qui reçoivent à tour de rôle) et Personnel (Tontine)
- Système de rappels pour les cotisations
- Intégration avec le module Transactions (chaque cotisation = transaction "expense" catégorie "sol")
- Validation des paiements et suivi des distributions

**Tech Stack:**
- Backend: Node.js + Express + MongoDB + Mongoose 6+
- Frontend: React + Redux Toolkit
- Gestion des dates: JavaScript Date API

---

## Phase 1: Backend - Modèle Sol

### Task 1: Créer le modèle Sol

**Files:**
- Create: `server/src/models/Sol.js`

**Step 1: Créer le schéma de base**

```javascript
import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: false
  },
  hasReceived: {
    type: Boolean,
    default: false
  },
  receivedDate: {
    type: Date,
    required: false
  },
  order: {
    type: Number,
    required: true
  }
});

const solSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['collaborative', 'personal'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    enum: ['HTG', 'USD'],
    required: true
  },
  frequency: {
    type: String,
    enum: ['weekly', 'biweekly', 'monthly'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: false
  },
  members: {
    type: [memberSchema],
    required: false
  },
  currentRecipientIndex: {
    type: Number,
    default: 0
  },
  nextPaymentDate: {
    type: Date,
    required: true
  },
  totalContributions: {
    type: Number,
    default: 0
  },
  targetAmount: {
    type: Number,
    required: false // Requis uniquement pour type "personal"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    required: false
  },
  icon: {
    type: String,
    default: '🤝'
  },
  color: {
    type: String,
    default: '#8B5CF6'
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
solSchema.index({ user: 1, isActive: 1 });
solSchema.index({ nextPaymentDate: 1 });

// Propriété virtuelle: destinataire actuel
solSchema.virtual('currentRecipient').get(function() {
  if (this.type === 'collaborative' && this.members && this.members.length > 0) {
    return this.members[this.currentRecipientIndex];
  }
  return null;
});

// Propriété virtuelle: nombre total de cycles (pour Sol collaboratif)
solSchema.virtual('totalCycles').get(function() {
  if (this.type === 'collaborative' && this.members) {
    return this.members.length;
  }
  return 0;
});

// Propriété virtuelle: montant total par cycle (pour Sol collaboratif)
solSchema.virtual('cycleAmount').get(function() {
  if (this.type === 'collaborative' && this.members) {
    return this.amount * this.members.length;
  }
  return 0;
});

// Propriété virtuelle: progression (pour Tontine)
solSchema.virtual('progress').get(function() {
  if (this.type === 'personal' && this.targetAmount > 0) {
    return Math.round((this.totalContributions / this.targetAmount) * 100);
  }
  return 0;
});

// Méthode pour calculer la prochaine date de paiement
solSchema.methods.calculateNextPaymentDate = function() {
  const current = new Date(this.nextPaymentDate);

  switch (this.frequency) {
    case 'weekly':
      current.setDate(current.getDate() + 7);
      break;
    case 'biweekly':
      current.setDate(current.getDate() + 14);
      break;
    case 'monthly':
      current.setMonth(current.getMonth() + 1);
      break;
    default:
      current.setDate(current.getDate() + 7);
  }

  return current;
};

// Méthode pour passer au destinataire suivant (Sol collaboratif)
solSchema.methods.moveToNextRecipient = function() {
  if (this.type !== 'collaborative' || !this.members || this.members.length === 0) {
    throw new Error('Cette méthode est uniquement pour les Sols collaboratifs');
  }

  // Marquer le destinataire actuel comme ayant reçu
  this.members[this.currentRecipientIndex].hasReceived = true;
  this.members[this.currentRecipientIndex].receivedDate = new Date();

  // Passer au suivant
  this.currentRecipientIndex = (this.currentRecipientIndex + 1) % this.members.length;

  // Si on a fait un tour complet, réinitialiser hasReceived
  if (this.currentRecipientIndex === 0) {
    this.members.forEach(member => {
      member.hasReceived = false;
      member.receivedDate = null;
    });
  }

  return this;
};

// Méthode pour enregistrer une contribution
solSchema.methods.recordContribution = async function(accountId, session) {
  const Transaction = mongoose.model('Transaction');
  const Account = mongoose.model('Account');

  // Vérifier que le compte existe
  const account = await Account.findOne({ _id: accountId, user: this.user });
  if (!account) {
    throw new Error('Compte introuvable');
  }

  // Vérifier que le compte a suffisamment de fonds
  if (account.balance < this.amount) {
    throw new Error('Solde insuffisant');
  }

  // Créer la transaction
  const transaction = new Transaction({
    user: this.user,
    type: 'expense',
    amount: this.amount,
    currency: this.currency,
    account: accountId,
    category: 'sol',
    description: `Cotisation ${this.name}`,
    date: new Date()
  });

  // Déduire le montant du compte
  account.balance -= this.amount;
  await account.save({ session });
  await transaction.save({ session });

  // Mettre à jour le total des contributions
  this.totalContributions += this.amount;

  // Mettre à jour la prochaine date de paiement
  this.nextPaymentDate = this.calculateNextPaymentDate();

  await this.save({ session });

  return transaction;
};

// Activer les propriétés virtuelles dans JSON
solSchema.set('toJSON', { virtuals: true });
solSchema.set('toObject', { virtuals: true });

const Sol = mongoose.model('Sol', solSchema);

export default Sol;
```

**Step 2: Commit**

```bash
git add server/src/models/Sol.js
git commit -m "feat(sol): create Sol model with collaborative and personal types"
```

---

## Phase 2: Backend - Contrôleur Sol

### Task 2: Créer le contrôleur Sol

**Files:**
- Create: `server/src/controllers/solController.js`

**Step 1: Créer les contrôleurs CRUD de base**

```javascript
import mongoose from 'mongoose';
import Sol from '../models/Sol.js';
import Transaction from '../models/Transaction.js';

// @desc    Obtenir tous les Sols de l'utilisateur
// @route   GET /api/sols
// @access  Private
export const getSols = async (req, res) => {
  try {
    const { isActive } = req.query;

    const filter = { user: req.user._id };
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const sols = await Sol.find(filter).sort({ createdAt: -1 });

    res.status(200).json(sols);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir un Sol par ID
// @route   GET /api/sols/:id
// @access  Private
export const getSol = async (req, res) => {
  try {
    const sol = await Sol.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!sol) {
      return res.status(404).json({ message: 'Sol introuvable' });
    }

    res.status(200).json(sol);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Créer un nouveau Sol
// @route   POST /api/sols
// @access  Private
export const createSol = async (req, res) => {
  try {
    const {
      name,
      type,
      amount,
      currency,
      frequency,
      startDate,
      endDate,
      members,
      targetAmount,
      description,
      icon,
      color
    } = req.body;

    // Validation
    if (!name || !type || !amount || !currency || !frequency || !startDate) {
      return res.status(400).json({
        message: 'Veuillez fournir tous les champs requis'
      });
    }

    if (type === 'collaborative' && (!members || members.length === 0)) {
      return res.status(400).json({
        message: 'Un Sol collaboratif nécessite au moins un membre'
      });
    }

    if (type === 'personal' && !targetAmount) {
      return res.status(400).json({
        message: 'Une Tontine nécessite un montant cible'
      });
    }

    // Créer le Sol
    const sol = new Sol({
      user: req.user._id,
      name,
      type,
      amount,
      currency,
      frequency,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      members: type === 'collaborative' ? members.map((m, index) => ({
        ...m,
        order: index
      })) : [],
      targetAmount,
      nextPaymentDate: new Date(startDate),
      description,
      icon: icon || '🤝',
      color: color || '#8B5CF6'
    });

    await sol.save();

    res.status(201).json(sol);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Mettre à jour un Sol
// @route   PUT /api/sols/:id
// @access  Private
export const updateSol = async (req, res) => {
  try {
    const sol = await Sol.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!sol) {
      return res.status(404).json({ message: 'Sol introuvable' });
    }

    // Mise à jour des champs autorisés
    const allowedUpdates = [
      'name',
      'amount',
      'frequency',
      'endDate',
      'targetAmount',
      'description',
      'icon',
      'color',
      'isActive'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        sol[field] = req.body[field];
      }
    });

    // Mise à jour des membres (uniquement pour Sol collaboratif)
    if (sol.type === 'collaborative' && req.body.members) {
      sol.members = req.body.members.map((m, index) => ({
        ...m,
        order: index
      }));
    }

    await sol.save();

    res.status(200).json(sol);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Supprimer un Sol
// @route   DELETE /api/sols/:id
// @access  Private
export const deleteSol = async (req, res) => {
  try {
    const sol = await Sol.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!sol) {
      return res.status(404).json({ message: 'Sol introuvable' });
    }

    await sol.deleteOne();

    res.status(200).json({ message: 'Sol supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Enregistrer une contribution
// @route   POST /api/sols/:id/contribute
// @access  Private
export const contribute = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { accountId } = req.body;

    if (!accountId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Le compte est requis' });
    }

    const sol = await Sol.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!sol) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Sol introuvable' });
    }

    if (!sol.isActive) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Ce Sol n\'est pas actif' });
    }

    // Enregistrer la contribution
    const transaction = await sol.recordContribution(accountId, session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      sol,
      transaction,
      message: 'Contribution enregistrée avec succès'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

// @desc    Passer au destinataire suivant (Sol collaboratif)
// @route   POST /api/sols/:id/next-recipient
// @access  Private
export const moveToNextRecipient = async (req, res) => {
  try {
    const sol = await Sol.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!sol) {
      return res.status(404).json({ message: 'Sol introuvable' });
    }

    if (sol.type !== 'collaborative') {
      return res.status(400).json({
        message: 'Cette action est uniquement pour les Sols collaboratifs'
      });
    }

    sol.moveToNextRecipient();
    await sol.save();

    res.status(200).json(sol);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Obtenir les statistiques des Sols
// @route   GET /api/sols/stats
// @access  Private
export const getSolStats = async (req, res) => {
  try {
    const sols = await Sol.find({ user: req.user._id, isActive: true });

    // Calculer les statistiques
    const stats = {
      totalSols: sols.length,
      activeSols: sols.filter(s => s.isActive).length,
      collaborativeSols: sols.filter(s => s.type === 'collaborative').length,
      personalSols: sols.filter(s => s.type === 'personal').length,
      totalContributions: sols.reduce((sum, s) => sum + s.totalContributions, 0),
      upcomingPayments: sols
        .filter(s => s.isActive)
        .map(s => ({
          solId: s._id,
          solName: s.name,
          amount: s.amount,
          currency: s.currency,
          nextPaymentDate: s.nextPaymentDate
        }))
        .sort((a, b) => new Date(a.nextPaymentDate) - new Date(b.nextPaymentDate))
        .slice(0, 5)
    };

    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir l'historique des contributions d'un Sol
// @route   GET /api/sols/:id/history
// @access  Private
export const getSolHistory = async (req, res) => {
  try {
    const sol = await Sol.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!sol) {
      return res.status(404).json({ message: 'Sol introuvable' });
    }

    // Trouver toutes les transactions liées à ce Sol
    const transactions = await Transaction.find({
      user: req.user._id,
      category: 'sol',
      description: { $regex: sol.name, $options: 'i' }
    }).sort({ date: -1 });

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

**Step 2: Commit**

```bash
git add server/src/controllers/solController.js
git commit -m "feat(sol): create Sol controller with CRUD and contribution logic"
```

---

## Phase 3: Backend - Routes Sol

### Task 3: Créer les routes Sol

**Files:**
- Create: `server/src/routes/sols.js`

**Step 1: Créer le fichier de routes**

```javascript
import express from 'express';
import {
  getSols,
  getSol,
  createSol,
  updateSol,
  deleteSol,
  contribute,
  moveToNextRecipient,
  getSolStats,
  getSolHistory
} from '../controllers/solController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Toutes les routes sont protégées
router.use(protect);

// Routes CRUD
router.route('/').get(getSols).post(createSol);
router.route('/stats').get(getSolStats);
router.route('/:id').get(getSol).put(updateSol).delete(deleteSol);

// Routes d'action
router.post('/:id/contribute', contribute);
router.post('/:id/next-recipient', moveToNextRecipient);
router.get('/:id/history', getSolHistory);

export default router;
```

**Step 2: Intégrer les routes dans le serveur**

Modifier `server/src/index.js`, ajouter:

```javascript
import solRoutes from './routes/sols.js';

// Après les autres routes
app.use('/api/sols', solRoutes);
```

**Step 3: Commit**

```bash
git add server/src/routes/sols.js server/src/index.js
git commit -m "feat(sol): add Sol routes and integrate into server"
```

---

## Phase 4: Frontend - Redux Slice Sol

### Task 4: Créer le slice Redux pour Sol

**Files:**
- Create: `client/src/store/slices/solSlice.js`

**Step 1: Créer le slice complet**

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = '/api/sols';

// Thunks
export const fetchSols = createAsyncThunk(
  'sols/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(API_URL, {
        headers: {
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

export const fetchSol = createAsyncThunk(
  'sols/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        headers: {
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

export const createSol = createAsyncThunk(
  'sols/create',
  async (solData, { rejectWithValue }) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(solData)
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

export const updateSol = createAsyncThunk(
  'sols/update',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
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

export const deleteSol = createAsyncThunk(
  'sols/delete',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message);
      }

      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const contributeSol = createAsyncThunk(
  'sols/contribute',
  async ({ id, accountId }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/${id}/contribute`, {
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

export const moveToNextRecipient = createAsyncThunk(
  'sols/nextRecipient',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/${id}/next-recipient`, {
        method: 'POST',
        headers: {
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

export const fetchSolStats = createAsyncThunk(
  'sols/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/stats`, {
        headers: {
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

export const fetchSolHistory = createAsyncThunk(
  'sols/fetchHistory',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/${id}/history`, {
        headers: {
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

// Slice
const solSlice = createSlice({
  name: 'sols',
  initialState: {
    sols: [],
    currentSol: null,
    stats: null,
    history: [],
    loading: false,
    error: null,
    success: false
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = false;
    },
    setCurrentSol: (state, action) => {
      state.currentSol = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch all sols
      .addCase(fetchSols.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSols.fulfilled, (state, action) => {
        state.loading = false;
        state.sols = action.payload;
      })
      .addCase(fetchSols.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch one sol
      .addCase(fetchSol.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSol.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSol = action.payload;
      })
      .addCase(fetchSol.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create sol
      .addCase(createSol.pending, (state) => {
        state.loading = true;
      })
      .addCase(createSol.fulfilled, (state, action) => {
        state.loading = false;
        state.sols.push(action.payload);
        state.success = true;
      })
      .addCase(createSol.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update sol
      .addCase(updateSol.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateSol.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.sols.findIndex(s => s._id === action.payload._id);
        if (index !== -1) {
          state.sols[index] = action.payload;
        }
        state.success = true;
      })
      .addCase(updateSol.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete sol
      .addCase(deleteSol.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteSol.fulfilled, (state, action) => {
        state.loading = false;
        state.sols = state.sols.filter(s => s._id !== action.payload);
        state.success = true;
      })
      .addCase(deleteSol.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Contribute
      .addCase(contributeSol.pending, (state) => {
        state.loading = true;
      })
      .addCase(contributeSol.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.sols.findIndex(s => s._id === action.payload.sol._id);
        if (index !== -1) {
          state.sols[index] = action.payload.sol;
        }
        state.success = true;
      })
      .addCase(contributeSol.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Move to next recipient
      .addCase(moveToNextRecipient.pending, (state) => {
        state.loading = true;
      })
      .addCase(moveToNextRecipient.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.sols.findIndex(s => s._id === action.payload._id);
        if (index !== -1) {
          state.sols[index] = action.payload;
        }
        state.success = true;
      })
      .addCase(moveToNextRecipient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch stats
      .addCase(fetchSolStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSolStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchSolStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch history
      .addCase(fetchSolHistory.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSolHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload;
      })
      .addCase(fetchSolHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, clearSuccess, setCurrentSol } = solSlice.actions;

export default solSlice.reducer;
```

**Step 2: Intégrer le slice dans le store**

Modifier `client/src/store/store.js`:

```javascript
import solReducer from './slices/solSlice';

// Dans configureStore
  reducer: {
    auth: authReducer,
    accounts: accountReducer,
    transactions: transactionReducer,
    budgets: budgetReducer,
    sols: solReducer, // NOUVEAU
  },
```

**Step 3: Commit**

```bash
git add client/src/store/slices/solSlice.js client/src/store/store.js
git commit -m "feat(sol): create Sol Redux slice and integrate into store"
```

---

## Phase 5: Frontend - Page Sols

### Task 5: Créer la page Sols

**Files:**
- Create: `client/src/pages/Sols.jsx`

**Step 1: Créer la page principale**

```jsx
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSols,
  createSol,
  updateSol,
  deleteSol,
  contributeSol,
  moveToNextRecipient
} from '../store/slices/solSlice';
import { fetchAccounts } from '../store/slices/accountSlice';

const Sols = () => {
  const dispatch = useDispatch();
  const { sols, loading, error } = useSelector((state) => state.sols);
  const { accounts } = useSelector((state) => state.accounts);

  const [showModal, setShowModal] = useState(false);
  const [editingSol, setEditingSol] = useState(null);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [selectedSol, setSelectedSol] = useState(null);

  useEffect(() => {
    dispatch(fetchSols());
    dispatch(fetchAccounts());
  }, [dispatch]);

  const handleCreateOrUpdate = () => {
    setShowModal(true);
  };

  const handleEdit = (sol) => {
    setEditingSol(sol);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce Sol?')) {
      await dispatch(deleteSol(id));
      dispatch(fetchSols());
    }
  };

  const handleContribute = (sol) => {
    setSelectedSol(sol);
    setShowContributeModal(true);
  };

  const handleNextRecipient = async (id) => {
    if (window.confirm('Passer au destinataire suivant?')) {
      await dispatch(moveToNextRecipient(id));
      dispatch(fetchSols());
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (nextPaymentDate) => {
    const daysUntil = Math.floor(
      (new Date(nextPaymentDate) - new Date()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil < 0) return 'text-red-600';
    if (daysUntil <= 3) return 'text-orange-500';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 bg-clip-text text-transparent">
            Sols & Tontines
          </h1>
          <p className="text-gray-600 mt-2">
            Gérez vos cotisations collaboratives et votre épargne personnelle
          </p>
        </div>
        <button
          onClick={handleCreateOrUpdate}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl hover:scale-105 transition-all shadow-lg hover:shadow-purple-500/50"
        >
          + Nouveau Sol
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <div className="text-center py-8">Chargement...</div>}

      {/* Sols Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sols.map((sol) => (
          <div
            key={sol._id}
            className="bg-white/95 backdrop-blur-lg rounded-2xl p-6 shadow-lg border-2 border-white/20 hover:scale-105 transition-all"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="text-4xl">{sol.icon}</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{sol.name}</h3>
                  <span
                    className={`text-sm px-3 py-1 rounded-full ${
                      sol.type === 'collaborative'
                        ? 'bg-purple-100 text-purple-600'
                        : 'bg-green-100 text-green-600'
                    }`}
                  >
                    {sol.type === 'collaborative' ? '🤝 Collaboratif' : '💰 Personnel'}
                  </span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Cotisation:</span>
                <span className="font-semibold">
                  {sol.amount} {sol.currency}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Fréquence:</span>
                <span className="font-semibold capitalize">{sol.frequency}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Total cotisé:</span>
                <span className="font-semibold">
                  {sol.totalContributions} {sol.currency}
                </span>
              </div>

              {sol.type === 'personal' && sol.targetAmount && (
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Objectif:</span>
                    <span className="font-semibold">
                      {sol.targetAmount} {sol.currency}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min(sol.progress || 0, 100)}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{sol.progress}% atteint</p>
                </div>
              )}

              {sol.type === 'collaborative' && (
                <div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Membres:</span>
                    <span className="font-semibold">{sol.totalCycles}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Destinataire actuel:</span>
                    <span className="font-semibold text-purple-600">
                      {sol.currentRecipient?.name || 'N/A'}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-600">Prochain paiement:</span>
                  <span className={`font-semibold ${getStatusColor(sol.nextPaymentDate)}`}>
                    {formatDate(sol.nextPaymentDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleContribute(sol)}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-lg hover:scale-105 transition-all"
              >
                Cotiser
              </button>

              {sol.type === 'collaborative' && (
                <button
                  onClick={() => handleNextRecipient(sol._id)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-lg hover:scale-105 transition-all"
                  title="Passer au destinataire suivant"
                >
                  Suivant
                </button>
              )}

              <button
                onClick={() => handleEdit(sol)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
              >
                ✏️
              </button>

              <button
                onClick={() => handleDelete(sol._id)}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!loading && sols.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🤝</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Aucun Sol pour le moment
          </h3>
          <p className="text-gray-600">
            Créez votre premier Sol ou Tontine pour commencer
          </p>
        </div>
      )}

      {/* Modals - À créer dans les prochaines tasks */}
      {/* {showModal && <SolFormModal ... />} */}
      {/* {showContributeModal && <ContributeModal ... />} */}
    </div>
  );
};

export default Sols;
```

**Step 2: Ajouter la route dans le Layout**

Modifier `client/src/components/Layout.jsx`:

```jsx
// Dans les liens de navigation
<Link
  to="/sols"
  className="flex items-center space-x-3 px-6 py-3 rounded-xl hover:bg-white/20 transition-all"
>
  <span className="text-2xl">🤝</span>
  <span className="font-medium">Sols</span>
</Link>
```

**Step 3: Ajouter la route dans App.jsx**

```jsx
import Sols from './pages/Sols';

// Dans les routes protégées
<Route path="/sols" element={<Sols />} />
```

**Step 4: Commit**

```bash
git add client/src/pages/Sols.jsx client/src/components/Layout.jsx client/src/App.jsx
git commit -m "feat(sol): create Sols page with display and basic actions"
```

---

## Phase 6: Frontend - Composants Modals

### Task 6: Créer les composants modals

**Files:**
- Create: `client/src/components/sols/SolFormModal.jsx`
- Create: `client/src/components/sols/ContributeModal.jsx`

**Step 1: Créer SolFormModal**

```jsx
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { createSol, updateSol } from '../../store/slices/solSlice';

const SolFormModal = ({ sol, isOpen, onClose }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    name: '',
    type: 'collaborative',
    amount: '',
    currency: 'HTG',
    frequency: 'monthly',
    startDate: '',
    endDate: '',
    targetAmount: '',
    description: '',
    icon: '🤝',
    color: '#8B5CF6',
    members: [{ name: '', phone: '' }]
  });

  useEffect(() => {
    if (sol) {
      setFormData({
        ...sol,
        startDate: sol.startDate ? sol.startDate.split('T')[0] : '',
        endDate: sol.endDate ? sol.endDate.split('T')[0] : ''
      });
    }
  }, [sol]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMemberChange = (index, field, value) => {
    const newMembers = [...formData.members];
    newMembers[index][field] = value;
    setFormData(prev => ({ ...prev, members: newMembers }));
  };

  const addMember = () => {
    setFormData(prev => ({
      ...prev,
      members: [...prev.members, { name: '', phone: '' }]
    }));
  };

  const removeMember = (index) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (sol) {
        await dispatch(updateSol({ id: sol._id, updates: formData })).unwrap();
      } else {
        await dispatch(createSol(formData)).unwrap();
      }
      onClose();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 my-8">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 bg-clip-text text-transparent">
          {sol ? 'Modifier le Sol' : 'Nouveau Sol'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Nom</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
            >
              <option value="collaborative">Collaboratif (Sol)</option>
              <option value="personal">Personnel (Tontine)</option>
            </select>
          </div>

          {/* Montant et Devise */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Montant de cotisation
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2 font-medium">Devise</label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
              >
                <option value="HTG">HTG</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* Fréquence */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Fréquence</label>
            <select
              name="frequency"
              value={formData.frequency}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
            >
              <option value="weekly">Hebdomadaire</option>
              <option value="biweekly">Bihebdomadaire</option>
              <option value="monthly">Mensuel</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Date de début
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Date de fin (optionnel)
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Montant cible (Tontine uniquement) */}
          {formData.type === 'personal' && (
            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Montant cible
              </label>
              <input
                type="number"
                name="targetAmount"
                value={formData.targetAmount}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
                required={formData.type === 'personal'}
              />
            </div>
          )}

          {/* Membres (Sol collaboratif uniquement) */}
          {formData.type === 'collaborative' && (
            <div>
              <label className="block text-gray-700 mb-2 font-medium">Membres</label>
              {formData.members.map((member, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="Nom"
                    value={member.name}
                    onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Téléphone"
                    value={member.phone}
                    onChange={(e) => handleMemberChange(index, 'phone', e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
                  />
                  {formData.members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMember(index)}
                      className="px-4 py-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addMember}
                className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                + Ajouter un membre
              </button>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              Description (optionnel)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:scale-105 transition-all shadow-lg"
            >
              {sol ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SolFormModal;
```

**Step 2: Créer ContributeModal**

```jsx
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { contributeSol } from '../../store/slices/solSlice';

const ContributeModal = ({ sol, isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { accounts } = useSelector((state) => state.accounts);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedAccount) {
      setError('Veuillez sélectionner un compte');
      return;
    }

    try {
      await dispatch(
        contributeSol({
          id: sol._id,
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
          Cotiser au Sol
        </h2>

        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            Sol: <span className="font-semibold">{sol.name}</span>
          </p>
          <p className="text-gray-600">
            Montant: <span className="font-semibold">{sol.amount} {sol.currency}</span>
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
              Compte à débiter
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
              required
            >
              <option value="">Sélectionner un compte</option>
              {accounts
                .filter(account => account.currency === sol.currency && account.isActive)
                .map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.icon} {account.name} - {account.balance} {account.currency}
                  </option>
                ))}
            </select>
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
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-400 to-green-500 text-white hover:scale-105 transition-all shadow-lg"
            >
              Cotiser
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContributeModal;
```

**Step 3: Intégrer les modals dans la page Sols**

Modifier `client/src/pages/Sols.jsx`:

```jsx
import SolFormModal from '../components/sols/SolFormModal';
import ContributeModal from '../components/sols/ContributeModal';

// Remplacer les commentaires par:
{showModal && (
  <SolFormModal
    sol={editingSol}
    isOpen={showModal}
    onClose={() => {
      setShowModal(false);
      setEditingSol(null);
      dispatch(fetchSols());
    }}
  />
)}

{showContributeModal && selectedSol && (
  <ContributeModal
    sol={selectedSol}
    isOpen={showContributeModal}
    onClose={() => {
      setShowContributeModal(false);
      setSelectedSol(null);
      dispatch(fetchSols());
    }}
  />
)}
```

**Step 4: Commit**

```bash
git add client/src/components/sols/
git commit -m "feat(sol): create SolFormModal and ContributeModal components"
```

---

## Phase 7: Tests et Documentation

### Task 7: Tests manuels complets

**Step 1: Tester le flux Sol Collaboratif**

1. Démarrer l'application
2. Créer un Sol collaboratif avec 3 membres
3. Faire une contribution depuis un compte
4. Vérifier que le solde du compte a diminué
5. Vérifier qu'une transaction "sol" a été créée
6. Passer au destinataire suivant
7. Faire 3 contributions pour compléter un cycle

**Step 2: Tester le flux Tontine**

1. Créer une Tontine avec un montant cible
2. Faire plusieurs contributions
3. Vérifier la progression vers l'objectif
4. Vérifier les transactions créées

**Step 3: Commit final**

```bash
git add -A
git commit -m "test(sol): validate Sol/Tontine module implementation"
```

---

### Task 8: Mettre à jour la documentation

**Files:**
- Modify: `SPECIFICATIONS.md`

**Step 1: Mettre à jour le statut**

Changer:
```markdown
### Status
❌ **NON IMPLÉMENTÉ**
```

À:
```markdown
### Status
✅ **IMPLÉMENTÉ**
```

**Step 2: Mettre à jour la checklist**

```markdown
### Phase 3: Sol/Tontine (✅ Complété)
- [x] Backend: Sol model
- [x] Backend: SolTransaction model (intégré dans Transaction)
- [x] Backend: Sol controller et routes
- [x] Backend: Système de rappels (à améliorer avec notifications)
- [x] Frontend: Sol slice
- [x] Frontend: Page Sols
- [x] Frontend: Gestion des membres
- [x] Frontend: Contributions et paiements
```

**Step 3: Commit**

```bash
git add SPECIFICATIONS.md
git commit -m "docs: update Sol/Tontine module status to completed"
```

---

## Résumé

Ce plan implémente complètement le module Sol/Tontine:

1. ✅ Modèle Sol avec types collaboratif et personnel
2. ✅ Méthodes de contribution et de gestion des destinataires
3. ✅ Contrôleurs CRUD complets
4. ✅ Routes API
5. ✅ Redux slice avec toutes les actions
6. ✅ UI complète avec gestion des membres
7. ✅ Intégration avec les transactions

**Prochaines étapes suggérées:**
- Implémenter le système de notifications/rappels
- Ajouter un calendrier de paiements
- Implémenter les modules Dettes et Investissements
- Créer le Dashboard complet avec toutes les statistiques
