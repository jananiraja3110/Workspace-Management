const express = require('express');
const router = express.Router();
const {
  createTicket,
  getMyTickets,
  getAllTickets,
  getTicketById,
  assignTicket,
  updateTicketStatus,
  addComment,
} = require('../controllers/ticketController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.post('/', createTicket);
router.get('/my', getMyTickets);
router.get('/', authorize('admin'), getAllTickets);
router.get('/:id', getTicketById);
router.put('/:id/assign', authorize('admin'), assignTicket);
router.patch('/:id/status', updateTicketStatus);
router.post('/:id/comment', addComment);

module.exports = router;
