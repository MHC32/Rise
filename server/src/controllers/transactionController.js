const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const { validationResult } = require('express-validator');

// @desc    Get all transactions for user
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    const { type, category, account, startDate, endDate, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = { user: req.user.id };

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (account) filter.account = account;

    // Date range
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(filter)
      .populate('account', 'name icon color')
      .populate('toAccount', 'name icon color')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(filter);

    // Calculate stats for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const statsAggregation = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const stats = {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
    };

    statsAggregation.forEach((item) => {
      if (item._id === 'income') stats.totalIncome = item.total;
      if (item._id === 'expense') stats.totalExpense = item.total;
    });

    stats.balance = stats.totalIncome - stats.totalExpense;

    res.status(200).json({
      success: true,
      count: transactions.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      stats,
      data: transactions,
    });
  } catch (error) {
    console.error('GetTransactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des transactions',
    });
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id,
    })
      .populate('account', 'name icon color')
      .populate('toAccount', 'name icon color');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction non trouvée',
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('GetTransaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la transaction',
    });
  }
};

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
exports.createTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { type, amount, currency, account, toAccount, fees, category, description, date, linkedModule, linkedId } = req.body;

    // Verify account belongs to user
    const sourceAccount = await Account.findOne({
      _id: account,
      user: req.user.id,
    });

    if (!sourceAccount) {
      return res.status(404).json({
        success: false,
        message: 'Compte source non trouvé',
      });
    }

    // For transfers, verify destination account
    let destAccount = null;
    if (type === 'transfer' && toAccount) {
      destAccount = await Account.findOne({
        _id: toAccount,
        user: req.user.id,
      });

      if (!destAccount) {
        return res.status(404).json({
          success: false,
          message: 'Compte destination non trouvé',
        });
      }
    }

    // Check balance for expense or transfer
    if ((type === 'expense' || type === 'transfer') && sourceAccount.balance < amount + (fees || 0)) {
      return res.status(400).json({
        success: false,
        message: 'Solde insuffisant sur le compte source',
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      user: req.user.id,
      type,
      amount,
      currency: currency || sourceAccount.currency,
      account,
      toAccount: toAccount || null,
      fees: fees || 0,
      category: type !== 'transfer' ? category : null,
      description,
      date: date || Date.now(),
      linkedModule: linkedModule || null,
      linkedId: linkedId || null,
    });

    // Update account balances
    if (type === 'expense') {
      sourceAccount.balance -= amount;
      await sourceAccount.save();
    } else if (type === 'income') {
      sourceAccount.balance += amount;
      await sourceAccount.save();
    } else if (type === 'transfer') {
      sourceAccount.balance -= amount + (fees || 0);
      await sourceAccount.save();

      if (destAccount) {
        destAccount.balance += amount;
        await destAccount.save();
      }
    }

    // Populate and return
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('account', 'name icon color')
      .populate('toAccount', 'name icon color');

    res.status(201).json({
      success: true,
      data: populatedTransaction,
    });
  } catch (error) {
    console.error('CreateTransaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la transaction',
    });
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
exports.updateTransaction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    let transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction non trouvée',
      });
    }

    // For now, only allow updating description, category, and date
    // Full amount/account changes would require reversing the original transaction
    const { description, category, date } = req.body;

    transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      {
        description,
        category: transaction.type !== 'transfer' ? category : transaction.category,
        date: date || transaction.date,
      },
      { new: true, runValidators: true }
    )
      .populate('account', 'name icon color')
      .populate('toAccount', 'name icon color');

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('UpdateTransaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la transaction',
    });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction non trouvée',
      });
    }

    // Reverse the balance changes
    const sourceAccount = await Account.findById(transaction.account);

    if (sourceAccount) {
      if (transaction.type === 'expense') {
        sourceAccount.balance += transaction.amount;
        await sourceAccount.save();
      } else if (transaction.type === 'income') {
        sourceAccount.balance -= transaction.amount;
        await sourceAccount.save();
      } else if (transaction.type === 'transfer') {
        sourceAccount.balance += transaction.amount + (transaction.fees || 0);
        await sourceAccount.save();

        if (transaction.toAccount) {
          const destAccount = await Account.findById(transaction.toAccount);
          if (destAccount) {
            destAccount.balance -= transaction.amount;
            await destAccount.save();
          }
        }
      }
    }

    await Transaction.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Transaction supprimée avec succès',
    });
  } catch (error) {
    console.error('DeleteTransaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la transaction',
    });
  }
};

// @desc    Get transaction categories
// @route   GET /api/transactions/categories
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        expense: Transaction.getExpenseCategories(),
        income: Transaction.getIncomeCategories(),
      },
    });
  } catch (error) {
    console.error('GetCategories error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des catégories',
    });
  }
};

// @desc    Get transaction stats
// @route   GET /api/transactions/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const stats = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            type: '$type',
            category: '$category',
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Organize stats
    const result = {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      byCategory: {
        expense: {},
        income: {},
      },
    };

    stats.forEach((item) => {
      if (item._id.type === 'income') {
        result.totalIncome += item.total;
        if (item._id.category) {
          result.byCategory.income[item._id.category] = item.total;
        }
      } else if (item._id.type === 'expense') {
        result.totalExpense += item.total;
        if (item._id.category) {
          result.byCategory.expense[item._id.category] = item.total;
        }
      }
    });

    result.balance = result.totalIncome - result.totalExpense;

    res.status(200).json({
      success: true,
      period,
      data: result,
    });
  } catch (error) {
    console.error('GetStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
    });
  }
};
