const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getCategories,
  getStats,
} = require('../controllers/transactionController');
const { protect } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// Get categories (no params needed)
router.get('/categories', getCategories);

// Get stats
router.get('/stats', getStats);

// CRUD routes
router
  .route('/')
  .get(getTransactions)
  .post(
    [
      body('type')
        .isIn(['expense', 'income', 'transfer'])
        .withMessage('Type invalide'),
      body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Le montant doit être supérieur à 0'),
      body('account')
        .notEmpty()
        .withMessage('Le compte est requis'),
      body('category')
        .if(body('type').isIn(['expense', 'income']))
        .notEmpty()
        .withMessage('La catégorie est requise pour les dépenses et revenus'),
      body('toAccount')
        .if(body('type').equals('transfer'))
        .notEmpty()
        .withMessage('Le compte destination est requis pour les transferts'),
    ],
    createTransaction
  );

router
  .route('/:id')
  .get(getTransaction)
  .put(
    [
      body('description')
        .optional()
        .isString()
        .isLength({ max: 200 })
        .withMessage('La description ne peut pas dépasser 200 caractères'),
    ],
    updateTransaction
  )
  .delete(deleteTransaction);

module.exports = router;
