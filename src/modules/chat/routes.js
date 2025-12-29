const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { 
  authenticateChatUser, 
  canAccessConversation, 
  enforceConversationType,
  adminOrManagerOnly,
  staffOnly
} = require('../../middleware/chatAuth');
const { chatRateLimiter, globalChatRateLimiter } = require('../../middleware/rateLimiter');

// Conversation routes

/**
 * Create a new conversation
 * POST /api/v1/chat/conversations
 * Auth: Staff only
 */
router.post(
  '/conversations',
  authenticateChatUser,
  staffOnly,
  controller.createConversation
);

/**
 * Get all conversations for current user/customer
 * GET /api/v1/chat/conversations
 * Auth: Required (staff or customer)
 */
router.get(
  '/conversations',
  authenticateChatUser,
  controller.getConversations
);

/**
 * Get messages in a conversation
 * GET /api/v1/chat/conversations/:id/messages
 * Auth: Required + must be participant
 */
router.get(
  '/conversations/:id/messages',
  authenticateChatUser,
  enforceConversationType,
  canAccessConversation,
  controller.getMessages
);

/**
 * Send a message in a conversation
 * POST /api/v1/chat/conversations/:id/messages
 * Auth: Required + must be participant
 * Rate limit: 60/min per conversation, 100/min global
 */
router.post(
  '/conversations/:id/messages',
  authenticateChatUser,
  globalChatRateLimiter,
  chatRateLimiter,
  enforceConversationType,
  canAccessConversation,
  controller.sendMessage
);

/**
 * Mark conversation as read
 * POST /api/v1/chat/conversations/:id/read
 * Auth: Required + must be participant
 */
router.post(
  '/conversations/:id/read',
  authenticateChatUser,
  enforceConversationType,
  canAccessConversation,
  controller.markAsRead
);

/**
 * Delete a conversation (soft delete)
 * DELETE /api/v1/chat/conversations/:id
 * Auth: Required + must be participant
 */
router.delete(
  '/conversations/:id',
  authenticateChatUser,
  enforceConversationType,
  canAccessConversation,
  controller.deleteConversation
);

/**
 * Share invoice in conversation
 * POST /api/v1/chat/conversations/:id/share/invoice
 * Auth: Staff only + must be participant
 */
router.post(
  '/conversations/:id/share/invoice',
  authenticateChatUser,
  staffOnly,
  enforceConversationType,
  canAccessConversation,
  controller.shareInvoice
);

/**
 * Share quote in conversation
 * POST /api/v1/chat/conversations/:id/share/quote
 * Auth: Staff only + must be participant
 */
router.post(
  '/conversations/:id/share/quote',
  authenticateChatUser,
  staffOnly,
  enforceConversationType,
  canAccessConversation,
  controller.shareQuote
);

// Review Pin routes

/**
 * Get review pins for a conversation
 * GET /api/v1/chat/conversations/:id/pins
 * Auth: Admin/Manager only
 */
router.get(
  '/conversations/:id/pins',
  authenticateChatUser,
  adminOrManagerOnly,
  controller.getReviewPins
);

/**
 * Resolve a review pin
 * POST /api/v1/chat/pins/:pinId/resolve
 * Auth: Admin/Manager only
 */
router.post(
  '/pins/:pinId/resolve',
  authenticateChatUser,
  adminOrManagerOnly,
  controller.resolvePin
);

/**
 * Reopen a review pin
 * POST /api/v1/chat/pins/:pinId/reopen
 * Auth: Admin/Manager only
 */
router.post(
  '/pins/:pinId/reopen',
  authenticateChatUser,
  adminOrManagerOnly,
  controller.reopenPin
);

/**
 * Add document link to a review pin
 * POST /api/v1/chat/pins/:pinId/links
 * Auth: Admin/Manager only
 */
router.post(
  '/pins/:pinId/links',
  authenticateChatUser,
  adminOrManagerOnly,
  controller.addPinLink
);

/**
 * Remove document link from a review pin
 * DELETE /api/v1/chat/pins/:pinId/links/:linkId
 * Auth: Admin/Manager only
 */
router.delete(
  '/pins/:pinId/links/:linkId',
  authenticateChatUser,
  adminOrManagerOnly,
  controller.removePinLink
);

module.exports = router;
