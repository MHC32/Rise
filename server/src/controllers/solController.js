const mongoose = require('mongoose');
const Sol = require('../models/Sol');
const Transaction = require('../models/Transaction');

// @desc    Get all Sols for user
// @route   GET /api/sols
// @access  Private
exports.getSols = async (req, res) => {
  try {
    const { isActive } = req.query;

    const query = { user: req.user._id };

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const sols = await Sol.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: sols.length,
      data: sols,
    });
  } catch (error) {
    console.error('GetSols error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des Sols',
    });
  }
};

// @desc    Get one Sol by ID
// @route   GET /api/sols/:id
// @access  Private
exports.getSol = async (req, res) => {
  try {
    const sol = await Sol.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!sol) {
      return res.status(404).json({
        success: false,
        message: 'Sol non trouvé',
      });
    }

    res.json({
      success: true,
      data: sol,
    });
  } catch (error) {
    console.error('GetSol error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du Sol',
    });
  }
};

// @desc    Create new Sol
// @route   POST /api/sols
// @access  Private
exports.createSol = async (req, res) => {
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
      color,
    } = req.body;

    // Validate collaborative Sol has members
    if (type === 'collaborative') {
      if (!members || !Array.isArray(members) || members.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Les Sols collaboratifs doivent avoir au moins un membre',
        });
      }

      // Auto-assign order to members
      const membersWithOrder = members.map((member, index) => ({
        ...member,
        order: index,
      }));

      const sol = await Sol.create({
        user: req.user._id,
        name,
        type,
        amount,
        currency,
        frequency,
        startDate,
        endDate,
        members: membersWithOrder,
        nextPaymentDate: startDate,
        description,
        icon,
        color,
      });

      return res.status(201).json({
        success: true,
        data: sol,
      });
    }

    // Validate personal Sol has targetAmount
    if (type === 'personal') {
      if (!targetAmount || targetAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Les Sols personnels doivent avoir un montant cible',
        });
      }

      const sol = await Sol.create({
        user: req.user._id,
        name,
        type,
        amount,
        currency,
        frequency,
        startDate,
        endDate,
        targetAmount,
        nextPaymentDate: startDate,
        description,
        icon,
        color,
      });

      return res.status(201).json({
        success: true,
        data: sol,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Type de Sol invalide',
    });
  } catch (error) {
    console.error('CreateSol error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la création du Sol',
    });
  }
};

// @desc    Update Sol
// @route   PUT /api/sols/:id
// @access  Private
exports.updateSol = async (req, res) => {
  try {
    let sol = await Sol.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!sol) {
      return res.status(404).json({
        success: false,
        message: 'Sol non trouvé',
      });
    }

    // Only allow updating specific fields
    const allowedFields = [
      'name',
      'amount',
      'frequency',
      'endDate',
      'targetAmount',
      'description',
      'icon',
      'color',
      'isActive',
      'members',
    ];

    const updateData = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // If updating members, ensure they have order
    if (updateData.members && Array.isArray(updateData.members)) {
      updateData.members = updateData.members.map((member, index) => ({
        ...member,
        order: member.order !== undefined ? member.order : index,
      }));
    }

    sol = await Sol.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      data: sol,
    });
  } catch (error) {
    console.error('UpdateSol error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du Sol',
    });
  }
};

// @desc    Delete Sol
// @route   DELETE /api/sols/:id
// @access  Private
exports.deleteSol = async (req, res) => {
  try {
    const sol = await Sol.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!sol) {
      return res.status(404).json({
        success: false,
        message: 'Sol non trouvé',
      });
    }

    await Sol.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: 'Sol supprimé avec succès',
    });
  } catch (error) {
    console.error('DeleteSol error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du Sol',
    });
  }
};

// @desc    Record a contribution
// @route   POST /api/sols/:id/contribute
// @access  Private
exports.contribute = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { accountId } = req.body;

    if (!accountId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Le compte source est requis',
      });
    }

    const sol = await Sol.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!sol) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Sol non trouvé',
      });
    }

    if (!sol.isActive) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Le Sol n\'est pas actif',
      });
    }

    // Call the model's recordContribution method
    const transaction = await sol.recordContribution(accountId, session);

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      data: {
        sol,
        transaction,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Contribute error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de l\'enregistrement de la contribution',
    });
  }
};

// @desc    Move to next recipient (collaborative only)
// @route   POST /api/sols/:id/next-recipient
// @access  Private
exports.moveToNextRecipient = async (req, res) => {
  try {
    const sol = await Sol.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!sol) {
      return res.status(404).json({
        success: false,
        message: 'Sol non trouvé',
      });
    }

    if (sol.type !== 'collaborative') {
      return res.status(400).json({
        success: false,
        message: 'Cette action est uniquement disponible pour les Sols collaboratifs',
      });
    }

    // Call the model's moveToNextRecipient method
    sol.moveToNextRecipient();
    await sol.save();

    res.json({
      success: true,
      data: sol,
    });
  } catch (error) {
    console.error('MoveToNextRecipient error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors du passage au prochain bénéficiaire',
    });
  }
};

// @desc    Get Sol statistics
// @route   GET /api/sols/stats
// @access  Private
exports.getSolStats = async (req, res) => {
  try {
    const sols = await Sol.find({
      user: req.user._id,
      isActive: true,
    });

    let totalContributions = 0;
    let totalTarget = 0;
    let activeSols = 0;
    let completedSols = 0;

    const statsBySol = sols.map((sol) => {
      totalContributions += sol.totalContributions;
      activeSols++;

      if (sol.type === 'personal') {
        totalTarget += sol.targetAmount;
        if (sol.totalContributions >= sol.targetAmount) {
          completedSols++;
        }
      }

      return {
        id: sol._id,
        name: sol.name,
        type: sol.type,
        totalContributions: sol.totalContributions,
        targetAmount: sol.targetAmount,
        progress: sol.progress,
        nextPaymentDate: sol.nextPaymentDate,
      };
    });

    res.json({
      success: true,
      data: {
        totalContributions,
        totalTarget,
        activeSols,
        completedSols,
        remaining: Math.max(0, totalTarget - totalContributions),
        statsBySol,
      },
    });
  } catch (error) {
    console.error('GetSolStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
    });
  }
};

// @desc    Get contribution history for a Sol
// @route   GET /api/sols/:id/history
// @access  Private
exports.getSolHistory = async (req, res) => {
  try {
    const sol = await Sol.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!sol) {
      return res.status(404).json({
        success: false,
        message: 'Sol non trouvé',
      });
    }

    // Find all transactions with category='sol' and matching Sol name in description
    const transactions = await Transaction.find({
      user: req.user._id,
      category: 'sol',
      description: { $regex: sol.name, $options: 'i' },
    })
      .populate('account', 'name icon color')
      .sort({ date: -1, createdAt: -1 });

    res.json({
      success: true,
      count: transactions.length,
      data: {
        sol: {
          id: sol._id,
          name: sol.name,
          type: sol.type,
          totalContributions: sol.totalContributions,
        },
        transactions,
      },
    });
  } catch (error) {
    console.error('GetSolHistory error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique',
    });
  }
};
