const express = require('express');
const router = express.Router();
const {
  getSols,
  getSol,
  createSol,
  updateSol,
  deleteSol,
  contribute,
  moveToNextRecipient,
  getSolStats,
  getSolHistory,
} = require('../controllers/solController');
const { protect } = require('../middlewares/auth');

// Apply authentication middleware to all routes
router.use(protect);

// Stats route (must be before /:id route to avoid conflicts)
router.get('/stats', getSolStats);

// Main Sol routes
router.route('/').get(getSols).post(createSol);

router.route('/:id').get(getSol).put(updateSol).delete(deleteSol);

// Contribution and recipient management routes
router.post('/:id/contribute', contribute);
router.post('/:id/next-recipient', moveToNextRecipient);

// History route
router.get('/:id/history', getSolHistory);

module.exports = router;
