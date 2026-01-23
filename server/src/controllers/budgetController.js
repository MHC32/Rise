const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// Helper function to calculate spent amount for a budget
const calculateSpent = async (budgetId, userId, category, startDate, endDate) => {
  const transactions = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: 'expense',
        category: category,
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
      },
    },
  ]);

  return transactions.length > 0 ? transactions[0].total : 0;
};

// @desc    Get all budgets for user
// @route   GET /api/budgets
// @access  Private
exports.getBudgets = async (req, res) => {
  try {
    const { period, isActive } = req.query;

    const query = { user: req.user.id };

    if (period) {
      query.period = period;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const budgets = await Budget.find(query).sort({ createdAt: -1 });

    // Calculate spent amount for each budget
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const budgetObj = budget.toObject();
        const spent = await calculateSpent(
          budget._id,
          req.user.id,
          budget.category,
          budget.startDate,
          budget.endDate
        );
        budgetObj._spent = spent;
        return budgetObj;
      })
    );

    res.json({
      success: true,
      count: budgetsWithSpent.length,
      data: budgetsWithSpent,
    });
  } catch (error) {
    console.error('GetBudgets error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des budgets',
    });
  }
};

// @desc    Get single budget
// @route   GET /api/budgets/:id
// @access  Private
exports.getBudgetById = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget non trouvé',
      });
    }

    const budgetObj = budget.toObject();
    const spent = await calculateSpent(
      budget._id,
      req.user.id,
      budget.category,
      budget.startDate,
      budget.endDate
    );
    budgetObj._spent = spent;

    res.json({
      success: true,
      data: budgetObj,
    });
  } catch (error) {
    console.error('GetBudgetById error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du budget',
    });
  }
};

// @desc    Create new budget
// @route   POST /api/budgets
// @access  Private
exports.createBudget = async (req, res) => {
  try {
    const { name, category, amount, currency, period, startDate, endDate, icon, color, alertThreshold } = req.body;

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'La date de fin doit être après la date de début',
      });
    }

    // Check if budget already exists for this category and period
    const existingBudget = await Budget.findOne({
      user: req.user.id,
      category,
      period,
      isActive: true,
      $or: [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) },
        },
      ],
    });

    if (existingBudget) {
      return res.status(400).json({
        success: false,
        message: 'Un budget actif existe déjà pour cette catégorie et période',
      });
    }

    const budget = await Budget.create({
      user: req.user.id,
      name,
      category,
      amount,
      currency: currency || req.user.preferredCurrency,
      period,
      startDate,
      endDate,
      icon,
      color,
      alertThreshold,
    });

    const budgetObj = budget.toObject();
    budgetObj._spent = 0; // New budget has 0 spent

    res.status(201).json({
      success: true,
      data: budgetObj,
    });
  } catch (error) {
    console.error('CreateBudget error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la création du budget',
    });
  }
};

// @desc    Update budget
// @route   PUT /api/budgets/:id
// @access  Private
exports.updateBudget = async (req, res) => {
  try {
    let budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget non trouvé',
      });
    }

    const { name, amount, startDate, endDate, icon, color, alertThreshold, isActive } = req.body;

    // Validate dates if provided
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'La date de fin doit être après la date de début',
      });
    }

    budget = await Budget.findByIdAndUpdate(
      req.params.id,
      {
        name,
        amount,
        startDate,
        endDate,
        icon,
        color,
        alertThreshold,
        isActive,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    const budgetObj = budget.toObject();
    const spent = await calculateSpent(
      budget._id,
      req.user.id,
      budget.category,
      budget.startDate,
      budget.endDate
    );
    budgetObj._spent = spent;

    res.json({
      success: true,
      data: budgetObj,
    });
  } catch (error) {
    console.error('UpdateBudget error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du budget',
    });
  }
};

// @desc    Delete budget
// @route   DELETE /api/budgets/:id
// @access  Private
exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget non trouvé',
      });
    }

    await Budget.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: 'Budget supprimé',
    });
  } catch (error) {
    console.error('DeleteBudget error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du budget',
    });
  }
};

// @desc    Get budget statistics
// @route   GET /api/budgets/stats
// @access  Private
exports.getBudgetStats = async (req, res) => {
  try {
    const budgets = await Budget.find({
      user: req.user.id,
      isActive: true,
    });

    let totalBudget = 0;
    let totalSpent = 0;
    let exceededCount = 0;
    let warningCount = 0;
    let okCount = 0;

    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const budgetObj = budget.toObject();
        const spent = await calculateSpent(
          budget._id,
          req.user.id,
          budget.category,
          budget.startDate,
          budget.endDate
        );
        budgetObj._spent = spent;

        totalBudget += budget.amount;
        totalSpent += spent;

        if (budgetObj.status === 'exceeded') exceededCount++;
        else if (budgetObj.status === 'warning') warningCount++;
        else okCount++;

        return budgetObj;
      })
    );

    res.json({
      success: true,
      data: {
        totalBudget,
        totalSpent,
        remaining: Math.max(0, totalBudget - totalSpent),
        budgetsRespected: okCount + warningCount,
        totalBudgets: budgets.length,
        budgetsByStatus: {
          ok: okCount,
          warning: warningCount,
          exceeded: exceededCount,
        },
      },
    });
  } catch (error) {
    console.error('GetBudgetStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
    });
  }
};
