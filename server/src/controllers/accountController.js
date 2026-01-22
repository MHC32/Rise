const Account = require('../models/Account');
const { validationResult } = require('express-validator');

// @desc    Get all accounts for user
// @route   GET /api/accounts
// @access  Private
exports.getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({
      user: req.user.id,
      isActive: true
    }).sort({ createdAt: -1 });

    // Calculate totals by currency
    const totals = {
      HTG: 0,
      USD: 0,
    };

    accounts.forEach(account => {
      if (account.includeInTotal) {
        totals[account.currency] += account.balance;
      }
    });

    res.status(200).json({
      success: true,
      count: accounts.length,
      totals,
      data: accounts,
    });
  } catch (error) {
    console.error('GetAccounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des comptes',
    });
  }
};

// @desc    Get single account
// @route   GET /api/accounts/:id
// @access  Private
exports.getAccount = async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Compte non trouvé',
      });
    }

    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error('GetAccount error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du compte',
    });
  }
};

// @desc    Create new account
// @route   POST /api/accounts
// @access  Private
exports.createAccount = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { name, type, institution, provider, currency, initialBalance, color, icon } = req.body;

    const account = await Account.create({
      user: req.user.id,
      name,
      type,
      institution: institution || null,
      provider: provider || null,
      currency: currency || 'HTG',
      balance: initialBalance || 0,
      initialBalance: initialBalance || 0,
      color: color || '#3B82F6',
      icon: icon || '💳',
    });

    res.status(201).json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error('CreateAccount error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du compte',
    });
  }
};

// @desc    Update account
// @route   PUT /api/accounts/:id
// @access  Private
exports.updateAccount = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    let account = await Account.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Compte non trouvé',
      });
    }

    const { name, type, institution, provider, currency, color, icon, includeInTotal } = req.body;

    account = await Account.findByIdAndUpdate(
      req.params.id,
      {
        name,
        type,
        institution: institution || null,
        provider: provider || null,
        currency,
        color,
        icon,
        includeInTotal
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error('UpdateAccount error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du compte',
    });
  }
};

// @desc    Delete account (soft delete)
// @route   DELETE /api/accounts/:id
// @access  Private
exports.deleteAccount = async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Compte non trouvé',
      });
    }

    // Soft delete - just mark as inactive
    account.isActive = false;
    await account.save();

    res.status(200).json({
      success: true,
      message: 'Compte supprimé avec succès',
    });
  } catch (error) {
    console.error('DeleteAccount error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du compte',
    });
  }
};

// @desc    Update account balance (internal use)
// @access  Internal
exports.updateBalance = async (accountId, amount, operation = 'add') => {
  const account = await Account.findById(accountId);
  if (!account) {
    throw new Error('Compte non trouvé');
  }

  if (operation === 'add') {
    account.balance += amount;
  } else if (operation === 'subtract') {
    account.balance -= amount;
  } else {
    account.balance = amount;
  }

  await account.save();
  return account;
};
