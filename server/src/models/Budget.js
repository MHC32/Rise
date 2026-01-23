const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Le nom du budget est requis'],
      trim: true,
      maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères'],
    },
    category: {
      type: String,
      required: [true, 'La catégorie est requise'],
      // Uses same categories as Transaction expenses
    },
    amount: {
      type: Number,
      required: [true, 'Le montant du budget est requis'],
      min: [1, 'Le montant doit être supérieur à 0'],
    },
    currency: {
      type: String,
      enum: ['HTG', 'USD'],
      required: true,
      default: 'HTG',
    },
    period: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    icon: {
      type: String,
      default: '🎯',
    },
    color: {
      type: String,
      default: '#667eea',
    },
    alertThreshold: {
      type: Number,
      default: 80,
      min: [0, 'Le seuil doit être entre 0 et 100'],
      max: [100, 'Le seuil doit être entre 0 et 100'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sourceAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: false, // Sera requis lors de l'allocation
    },
    allocatedAt: {
      type: Date,
      required: false,
    },
    returnedAt: {
      type: Date,
      required: false,
    },
    status: {
      type: String,
      enum: ['draft', 'allocated', 'active', 'completed', 'archived'],
      default: 'draft',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
budgetSchema.index({ user: 1, isActive: 1 });
budgetSchema.index({ user: 1, category: 1 });
budgetSchema.index({ user: 1, startDate: 1, endDate: 1 });

// Virtual for spent amount (will be calculated from transactions)
budgetSchema.virtual('spent').get(function () {
  return this._spent || 0;
});

// Virtual for percentage
budgetSchema.virtual('percentage').get(function () {
  const spent = this._spent || 0;
  return Math.round((spent / this.amount) * 100);
});

// Virtual for remaining amount
budgetSchema.virtual('remaining').get(function () {
  const spent = this._spent || 0;
  return Math.max(0, this.amount - spent);
});

// Virtual for alert status (ok, warning, exceeded)
budgetSchema.virtual('alertStatus').get(function () {
  const percentage = this.percentage;
  if (percentage >= 100) return 'exceeded';
  if (percentage >= this.alertThreshold) return 'warning';
  return 'ok';
});

budgetSchema.set('toJSON', { virtuals: true });
budgetSchema.set('toObject', { virtuals: true });

// Instance method to allocate funds from account to budget
budgetSchema.methods.allocate = async function (accountId, session) {
  const Account = mongoose.model('Account');
  const Transaction = mongoose.model('Transaction');

  // Définir le compte source à partir du paramètre
  this.sourceAccount = accountId;

  // Vérifier que le budget est en statut draft
  if (this.status !== 'draft') {
    throw new Error('Seuls les budgets en statut draft peuvent être alloués');
  }

  // Récupérer le compte source
  const account = await Account.findById(this.sourceAccount).session(session);
  if (!account) {
    throw new Error('Compte source introuvable');
  }

  // Vérifier que le compte a suffisamment de fonds
  if (account.balance < this.amount) {
    throw new Error(
      `Solde insuffisant. Disponible: ${account.balance} ${this.currency}, Requis: ${this.amount} ${this.currency}`
    );
  }

  // Vérifier que la devise correspond
  if (account.currency !== this.currency) {
    throw new Error('La devise du budget doit correspondre à celle du compte source');
  }

  // Créer une transaction de transfert pour l'allocation
  const transaction = new Transaction({
    user: this.user,
    type: 'transfer',
    amount: this.amount,
    currency: this.currency,
    fromAccount: this.sourceAccount,
    toAccount: null, // Pas de compte destination (allocation virtuelle)
    category: 'budget_allocation',
    description: `Allocation budget: ${this.name}`,
    date: new Date(),
    budget: this._id,
  });

  await transaction.save({ session });

  // Mettre à jour le solde du compte
  account.balance -= this.amount;
  await account.save({ session });

  // Mettre à jour le statut du budget
  this.status = 'allocated';
  this.allocatedAt = new Date();
  await this.save({ session });

  return this;
};

// Instance method to return unused funds to source account
budgetSchema.methods.returnUnusedFunds = async function (session) {
  const Account = mongoose.model('Account');
  const Transaction = mongoose.model('Transaction');

  // Vérifier que le budget est en statut allocated ou active
  if (!['allocated', 'active'].includes(this.status)) {
    throw new Error('Seuls les budgets alloués ou actifs peuvent retourner des fonds');
  }

  // Vérifier qu'un compte source est défini
  if (!this.sourceAccount) {
    throw new Error('Aucun compte source défini');
  }

  // Calculer le montant dépensé
  const result = await Transaction.aggregate([
    {
      $match: {
        user: this.user,
        type: 'expense',
        category: this.category,
        date: { $gte: this.startDate, $lte: this.endDate },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
      },
    },
  ]).session(session);

  const spent = result.length > 0 ? result[0].total : 0;
  const remaining = this.amount - spent;

  // Si des fonds restent, les retourner au compte
  if (remaining > 0) {
    // Récupérer le compte source
    const account = await Account.findById(this.sourceAccount).session(session);
    if (!account) {
      throw new Error('Compte source introuvable');
    }

    // Créer une transaction de retour
    const transaction = new Transaction({
      user: this.user,
      type: 'transfer',
      amount: remaining,
      currency: this.currency,
      fromAccount: null, // Pas de compte source (retour d'allocation virtuelle)
      toAccount: this.sourceAccount,
      category: 'budget_return',
      description: `Retour fonds non utilisés: ${this.name}`,
      date: new Date(),
      budget: this._id,
    });

    await transaction.save({ session });

    // Mettre à jour le solde du compte
    account.balance += remaining;
    await account.save({ session });
  }

  // Mettre à jour le statut du budget
  this.status = 'completed';
  this.returnedAt = new Date();
  await this.save({ session });

  return { returned: remaining, spent };
};

module.exports = mongoose.model('Budget', budgetSchema);
