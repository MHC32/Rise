const express = require('express');
const router = express.Router();
const {
  getBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetStats,
} = require('../controllers/budgetController');
const { protect } = require('../middlewares/auth');

// Apply authentication middleware to all routes
router.use(protect);

// Budget stats (must be before /:id route)
router.get('/stats', getBudgetStats);

// Main budget routes
router.route('/').get(getBudgets).post(createBudget);

router.route('/:id').get(getBudgetById).put(updateBudget).delete(deleteBudget);

module.exports = router;
