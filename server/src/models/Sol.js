const mongoose = require('mongoose');

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
    required: false // Required only for type "personal"
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
    default: '#667eea'
  }
}, {
  timestamps: true
});

// Indexes for query optimization
solSchema.index({ user: 1, isActive: 1 });
solSchema.index({ nextPaymentDate: 1 });

// Virtual properties
solSchema.virtual('currentRecipient').get(function() {
  if (this.type === 'collaborative' && this.members && this.members.length > 0) {
    return this.members[this.currentRecipientIndex];
  }
  return null;
});

solSchema.virtual('totalCycles').get(function() {
  if (this.type === 'collaborative' && this.members) {
    return this.members.length;
  }
  return 0;
});

solSchema.virtual('cycleAmount').get(function() {
  if (this.type === 'collaborative' && this.members) {
    return this.amount * this.members.length;
  }
  return 0;
});

solSchema.virtual('progress').get(function() {
  if (this.type === 'personal' && this.targetAmount > 0) {
    return Math.round((this.totalContributions / this.targetAmount) * 100);
  }
  return 0;
});

// Method to calculate next payment date
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

// Method to move to next recipient (collaborative Sol)
solSchema.methods.moveToNextRecipient = function() {
  if (this.type !== 'collaborative' || !this.members || this.members.length === 0) {
    throw new Error('Cette méthode est uniquement pour les Sols collaboratifs');
  }

  // Mark current recipient as having received
  this.members[this.currentRecipientIndex].hasReceived = true;
  this.members[this.currentRecipientIndex].receivedDate = new Date();

  // Move to next
  this.currentRecipientIndex = (this.currentRecipientIndex + 1) % this.members.length;

  // If we've completed a full cycle, reset hasReceived
  if (this.currentRecipientIndex === 0) {
    this.members.forEach(member => {
      member.hasReceived = false;
      member.receivedDate = null;
    });
  }

  return this;
};

// Method to record a contribution
solSchema.methods.recordContribution = async function(accountId, session) {
  const Transaction = mongoose.model('Transaction');
  const Account = mongoose.model('Account');

  // Verify account exists
  const account = await Account.findOne({ _id: accountId, user: this.user });
  if (!account) {
    throw new Error('Compte introuvable');
  }

  // Verify account has sufficient funds
  if (account.balance < this.amount) {
    throw new Error('Solde insuffisant');
  }

  // Create the transaction
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

  // Deduct from account
  account.balance -= this.amount;
  await account.save({ session });
  await transaction.save({ session });

  // Update total contributions
  this.totalContributions += this.amount;

  // Update next payment date
  this.nextPaymentDate = this.calculateNextPaymentDate();

  await this.save({ session });

  return transaction;
};

// Enable virtuals in JSON
solSchema.set('toJSON', { virtuals: true });
solSchema.set('toObject', { virtuals: true });

const Sol = mongoose.model('Sol', solSchema);

module.exports = Sol;
