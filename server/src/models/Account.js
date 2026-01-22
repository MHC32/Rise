const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Le nom du compte est requis'],
      trim: true,
      maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères'],
    },
    type: {
      type: String,
      enum: ['bank', 'mobile_money', 'cash'],
      required: [true, 'Le type de compte est requis'],
    },
    institution: {
      type: String,
      trim: true,
      // BUH, Sogebank, Unibank, Capital Bank, etc.
    },
    provider: {
      type: String,
      enum: ['moncash', 'natcash', 'other', null],
      default: null,
    },
    currency: {
      type: String,
      enum: ['HTG', 'USD'],
      required: [true, 'La devise est requise'],
      default: 'HTG',
    },
    balance: {
      type: Number,
      default: 0,
    },
    initialBalance: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: '#3B82F6',
    },
    icon: {
      type: String,
      default: '💳',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    includeInTotal: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

accountSchema.index({ user: 1, isActive: 1 });

accountSchema.virtual('formattedBalance').get(function () {
  const symbol = this.currency === 'HTG' ? 'HTG' : '$';
  const balance = this.balance ?? 0;
  return `${balance.toLocaleString()} ${symbol}`;
});

accountSchema.set('toJSON', { virtuals: true });
accountSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Account', accountSchema);
