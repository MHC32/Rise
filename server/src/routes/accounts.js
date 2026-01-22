const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
} = require('../controllers/accountController');
const { protect } = require('../middlewares/auth');

// Validation rules
const accountValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom du compte est requis')
    .isLength({ max: 50 })
    .withMessage('Le nom ne peut pas dépasser 50 caractères'),
  body('type')
    .notEmpty()
    .withMessage('Le type de compte est requis')
    .isIn(['bank', 'mobile_money', 'cash'])
    .withMessage('Type invalide'),
  body('currency')
    .optional()
    .isIn(['HTG', 'USD'])
    .withMessage('Devise invalide'),
  body('initialBalance')
    .optional()
    .isNumeric()
    .withMessage('Le solde initial doit être un nombre'),
  body('provider')
    .optional()
    .isIn(['moncash', 'natcash', 'other', null])
    .withMessage('Provider invalide'),
];

const updateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Le nom ne peut pas dépasser 50 caractères'),
  body('type')
    .optional()
    .isIn(['bank', 'mobile_money', 'cash'])
    .withMessage('Type invalide'),
  body('currency')
    .optional()
    .isIn(['HTG', 'USD'])
    .withMessage('Devise invalide'),
];

// All routes require authentication
router.use(protect);

// Routes
router.route('/')
  .get(getAccounts)
  .post(accountValidation, createAccount);

router.route('/:id')
  .get(getAccount)
  .put(updateValidation, updateAccount)
  .delete(deleteAccount);

module.exports = router;
