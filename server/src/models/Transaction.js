const mongoose = require('mongoose');

// Categories based on our discussion
const EXPENSE_CATEGORIES = [
  'nourriture',
  'transport',
  'abonnements',
  'personnel',
  'loisirs',
  'famille',
  'travail',
  'sante',
  'communication',
  'loyer',
  'paris_sportifs',
  'sol',
  'investissement',
  'remboursement_dette',
  'pret_accorde',
  'autre',
];

const INCOME_CATEGORIES = [
  'salaire',
  'freelance',
  'famille',
  'paris_sportifs',
  'cadeaux',
  'remboursement_recu',
  'vente_investissement',
  'pot_sol',
  'autre',
];

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['expense', 'income', 'transfer'],
      required: [true, 'Le type de transaction est requis'],
    },
    amount: {
      type: Number,
      required: [true, 'Le montant est requis'],
      min: [0.01, 'Le montant doit être supérieur à 0'],
    },
    currency: {
      type: String,
      enum: ['HTG', 'USD'],
      required: true,
    },
    // Source account (for expense and transfer)
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Le compte est requis'],
    },
    // Destination account (only for transfers)
    toAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    // Transfer fees (optional)
    fees: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      required: function() {
        return this.type !== 'transfer';
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'La description ne peut pas dépasser 200 caractères'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    // For recurring transactions
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecurringTransaction',
    },
    // Link to other modules (sol, debt, investment)
    linkedModule: {
      type: String,
      enum: ['sol', 'debt', 'investment', 'savings', null],
      default: null,
    },
    linkedId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, account: 1 });
transactionSchema.index({ user: 1, type: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1, date: -1 });

// Validate category based on type
transactionSchema.pre('validate', async function() {
  if (this.type === 'expense' && !EXPENSE_CATEGORIES.includes(this.category)) {
    if (this.category && !EXPENSE_CATEGORIES.includes(this.category)) {
      // Allow custom categories
    }
  }
  if (this.type === 'income' && !INCOME_CATEGORIES.includes(this.category)) {
    if (this.category && !INCOME_CATEGORIES.includes(this.category)) {
      // Allow custom categories
    }
  }
  if (this.type === 'transfer' && this.toAccount && this.account.equals(this.toAccount)) {
    throw new Error('Le compte source et destination ne peuvent pas être identiques');
  }
});

// Static method to get categories
transactionSchema.statics.getExpenseCategories = function() {
  return EXPENSE_CATEGORIES;
};

transactionSchema.statics.getIncomeCategories = function() {
  return INCOME_CATEGORIES;
};

module.exports = mongoose.model('Transaction', transactionSchema);
