const chatService = require('./chat.service');
const ApiResponse = require('../../utils/apiResponse');
const { AuditLog } = require('../../database/models');

class ChatController {
  /**
   * Create a new conversation
   * POST /api/v1/chat/conversations
   * Auth: Staff only
   */
  async createConversation(req, res, next) {
    try {
      const { type, customerId, title, participantUserIds } = req.body;
      
      // Only staff can create conversations
      if (req.actorType !== 'staff') {
        return ApiResponse.forbidden(res, 'Only staff can create conversations');
      }
      
      const conversation = await chatService.createConversation({
        type,
        customerId,
        title,
        createdByUserId: req.userId,
        participantUserIds: participantUserIds || []
      });
      
      // Audit log
      await AuditLog.create({
        userId: req.userId,
        action: 'chat.conversation.created',
        entity: 'ChatConversation',
        entityId: conversation.id,
        changes: { type, customerId, title }
      });

      // Broadcast to all participants via Socket.IO
      const io = req.app.get('io');
      if (io && conversation.participants) {
        conversation.participants.forEach(participant => {
          if (participant.userId) {
            io.to(`user:${participant.userId}`).emit('conversation_created', {
              conversation
            });
          }
        });
      }
      
      return ApiResponse.created(res, { conversation }, 'Conversation created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all conversations for current user/customer
   * GET /api/v1/chat/conversations
   * Auth: Required (staff or customer)
   */
  async getConversations(req, res, next) {
    try {
      const { type } = req.query;
      
      const params = { type };
      if (req.actorType === 'staff') {
        params.userId = req.userId;
      } else {
        params.customerId = req.customerId;
      }
      
      const conversations = await chatService.getConversations(params);
      
      return ApiResponse.success(res, { conversations }, 'Conversations retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get messages in a conversation
   * GET /api/v1/chat/conversations/:id/messages
   * Auth: Required + must be participant
   */
  async getMessages(req, res, next) {
    try {
      const { id } = req.params;
      const { before, after, limit } = req.query;
      
      // Authorization is handled by middleware (canAccessConversation)
      
      const messages = await chatService.getMessages(id, {
        before,
        after,
        limit: parseInt(limit) || 50
      });
      
      return ApiResponse.success(res, { messages }, 'Messages retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send a message in a conversation
   * POST /api/v1/chat/conversations/:id/messages
   * Auth: Required + must be participant
   */
  async sendMessage(req, res, next) {
    try {
      const { id } = req.params;
      const { messageType, body, metadata } = req.body;
      
      // Authorization is handled by middleware (canAccessConversation)
      
      const message = await chatService.sendMessage({
        conversationId: id,
        senderUserId: req.actorType === 'staff' ? req.userId : null,
        senderCustomerId: req.actorType === 'customer' ? req.customerId : null,
        messageType,
        body,
        metadata
      });
      
      // Audit log (no body content for privacy)
      await AuditLog.create({
        userId: req.userId || null,
        action: 'chat.message.created',
        entity: 'ChatMessage',
        entityId: message.id,
        changes: { 
          conversationId: id, 
          messageType,
          bodyLength: body?.length || 0,
          hasMetadata: !!metadata
        }
      });
      
      return ApiResponse.created(res, { message }, 'Message sent successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark conversation as read
   * POST /api/v1/chat/conversations/:id/read
   * Auth: Required + must be participant
   */
  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const { messageId } = req.body;
      
      // Authorization is handled by middleware (canAccessConversation)
      
      await chatService.markAsRead(
        id,
        req.actorType === 'staff' ? req.userId : req.customerId,
        req.actorType === 'staff',
        messageId
      );
      
      return ApiResponse.success(res, null, 'Conversation marked as read');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Share invoice in conversation
   * POST /api/v1/chat/conversations/:id/share/invoice
   * Auth: Staff only + must be participant
   */
  async shareInvoice(req, res, next) {
    try {
      const { id } = req.params;
      const { invoiceId } = req.body;
      
      if (req.actorType !== 'staff') {
        return ApiResponse.forbidden(res, 'Only staff can share invoices');
      }
      
      const message = await chatService.sendMessage({
        conversationId: id,
        senderUserId: req.userId,
        messageType: 'DOCUMENT',
        body: 'Shared an invoice',
        metadata: {
          documentType: 'invoice',
          documentId: invoiceId
        }
      });
      
      await AuditLog.create({
        userId: req.userId,
        action: 'chat.document.shared',
        entity: 'ChatMessage',
        entityId: message.id,
        changes: { conversationId: id, documentType: 'invoice', documentId: invoiceId }
      });
      
      return ApiResponse.created(res, { message }, 'Invoice shared successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Share quote in conversation
   * POST /api/v1/chat/conversations/:id/share/quote
   * Auth: Staff only + must be participant
   */
  async shareQuote(req, res, next) {
    try {
      const { id } = req.params;
      const { quoteId } = req.body;
      
      if (req.actorType !== 'staff') {
        return ApiResponse.forbidden(res, 'Only staff can share quotes');
      }
      
      const message = await chatService.sendMessage({
        conversationId: id,
        senderUserId: req.userId,
        messageType: 'DOCUMENT',
        body: 'Shared a quote',
        metadata: {
          documentType: 'quote',
          documentId: quoteId
        }
      });
      
      await AuditLog.create({
        userId: req.userId,
        action: 'chat.document.shared',
        entity: 'ChatMessage',
        entityId: message.id,
        changes: { conversationId: id, documentType: 'quote', documentId: quoteId }
      });
      
      return ApiResponse.created(res, { message }, 'Quote shared successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get review pins for a conversation
   * GET /api/v1/chat/conversations/:id/pins
   * Auth: Admin/Manager only
   */
  async getReviewPins(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.query;
      
      if (req.actorType !== 'staff' || !['admin', 'manager'].includes(req.userRole)) {
        return ApiResponse.forbidden(res, 'Only Admin and Manager can access review pins');
      }
      
      const pins = await chatService.getReviewPins(id, status);
      
      return ApiResponse.success(res, { pins }, 'Review pins retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resolve a review pin
   * POST /api/v1/chat/pins/:pinId/resolve
   * Auth: Admin/Manager only
   */
  async resolvePin(req, res, next) {
    try {
      const { pinId } = req.params;
      
      if (req.actorType !== 'staff' || !['admin', 'manager'].includes(req.userRole)) {
        return ApiResponse.forbidden(res, 'Only Admin and Manager can resolve pins');
      }
      
      const pin = await chatService.resolvePin(pinId, req.userId);
      
      await AuditLog.create({
        userId: req.userId,
        action: 'chat.pin.resolved',
        entity: 'ChatReviewPin',
        entityId: pinId,
        changes: { status: 'RESOLVED' }
      });
      
      return ApiResponse.success(res, { pin }, 'Pin resolved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reopen a review pin
   * POST /api/v1/chat/pins/:pinId/reopen
   * Auth: Admin/Manager only
   */
  async reopenPin(req, res, next) {
    try {
      const { pinId } = req.params;
      
      if (req.actorType !== 'staff' || !['admin', 'manager'].includes(req.userRole)) {
        return ApiResponse.forbidden(res, 'Only Admin and Manager can reopen pins');
      }
      
      const pin = await chatService.reopenPin(pinId);
      
      await AuditLog.create({
        userId: req.userId,
        action: 'chat.pin.reopened',
        entity: 'ChatReviewPin',
        entityId: pinId,
        changes: { status: 'OPEN' }
      });
      
      return ApiResponse.success(res, { pin }, 'Pin reopened successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add document link to a review pin
   * POST /api/v1/chat/pins/:pinId/links
   * Auth: Admin/Manager only
   */
  async addPinLink(req, res, next) {
    try {
      const { pinId } = req.params;
      const { linkType, documentId } = req.body;
      
      if (req.actorType !== 'staff' || !['admin', 'manager'].includes(req.userRole)) {
        return ApiResponse.forbidden(res, 'Only Admin and Manager can add pin links');
      }
      
      const link = await chatService.addPinLink(pinId, linkType, documentId, req.userId);
      
      await AuditLog.create({
        userId: req.userId,
        action: 'chat.pin.link.added',
        entity: 'ChatReviewPinLink',
        entityId: link.id,
        changes: { pinId, linkType, documentId }
      });
      
      return ApiResponse.created(res, { link }, 'Document linked successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove document link from a review pin
   * DELETE /api/v1/chat/pins/:pinId/links/:linkId
   * Auth: Admin/Manager only
   */
  async removePinLink(req, res, next) {
    try {
      const { pinId, linkId } = req.params;
      
      if (req.actorType !== 'staff' || !['admin', 'manager'].includes(req.userRole)) {
        return ApiResponse.forbidden(res, 'Only Admin and Manager can remove pin links');
      }
      
      await chatService.removePinLink(linkId);
      
      await AuditLog.create({
        userId: req.userId,
        action: 'chat.pin.link.removed',
        entity: 'ChatReviewPinLink',
        entityId: linkId,
        changes: { pinId, linkId }
      });
      
      return ApiResponse.success(res, null, 'Document link removed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a conversation (soft delete)
   * DELETE /api/v1/chat/conversations/:id
   * Auth: Required + must be participant
   */
  async deleteConversation(req, res, next) {
    try {
      const { id } = req.params;
      
      // Get conversation participants before deleting
      const { ChatConversation, ChatParticipant } = require('../../database/models');
      const conversation = await ChatConversation.findByPk(id, {
        include: [{
          model: ChatParticipant,
          as: 'participants',
          where: { leftAt: null },
          required: false
        }]
      });
      
      await chatService.deleteConversation(
        id,
        req.actorType === 'staff' ? req.userId : null,
        req.actorType === 'customer' ? req.customerId : null
      );
      
      // Audit log
      await AuditLog.create({
        userId: req.userId || null,
        customerId: req.customerId || null,
        action: 'chat.conversation.deleted',
        entity: 'ChatConversation',
        entityId: id,
        changes: { conversationId: id }
      });

      // Broadcast to all participants via Socket.IO
      const io = req.app.get('io');
      if (io && conversation && conversation.participants) {
        conversation.participants.forEach(participant => {
          if (participant.userId && participant.userId !== req.userId) {
            io.to(`user:${participant.userId}`).emit('conversation_deleted', {
              conversationId: id,
              deletedBy: req.userId
            });
          }
        });
      }
      
      return ApiResponse.success(res, null, 'Conversation deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatController();
