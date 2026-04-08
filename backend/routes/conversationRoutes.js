const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, conversationController.getUserConversations);
router.get('/unread-count', authenticateToken, conversationController.getUnreadCount);
router.get('/:id', authenticateToken, conversationController.getConversationById);
router.post('/:id/messages', authenticateToken, conversationController.sendMessage);
router.patch('/:id/read', authenticateToken, conversationController.markConversationAsRead);

module.exports = router;
