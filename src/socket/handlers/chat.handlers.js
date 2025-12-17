const chatService = require('../../modules/chat/chat.service');
const { ChatParticipant, ChatConversation } = require('../../database/models');
const logger = require('../../utils/logger');

/**
 * Handle socket connection for a user/customer
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket - Client socket
 */
const handleChatConnection = (io, socket) => {
  const actorId = socket.userId || socket.customerId;
  const actorType = socket.actorType;
  
  logger.info(`Chat connection established: ${actorType} ${actorId}`);

  /**
   * Join a conversation room
   */
  socket.on('join_conversation', async (data) => {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        socket.emit('error', { message: 'Conversation ID required' });
        return;
      }

      // Verify participant membership
      const participant = await ChatParticipant.findOne({
        where: {
          conversationId,
          ...(socket.userId ? { userId: socket.userId } : { customerId: socket.customerId }),
          leftAt: null
        }
      });

      if (!participant) {
        socket.emit('error', { message: 'Not a participant of this conversation' });
        return;
      }

      // Get conversation details
      const conversation = await ChatConversation.findByPk(conversationId);

      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found' });
        return;
      }

      // Check if customer trying to join staff-only conversation
      if (actorType === 'customer' && !conversation.isCustomerDM()) {
        socket.emit('error', { message: 'Access denied to this conversation' });
        return;
      }

      // Join the room
      const roomName = `conv:${conversationId}`;
      socket.join(roomName);
      
      logger.info(`${actorType} ${actorId} joined conversation ${conversationId}`);

      // Notify others in the room
      socket.to(roomName).emit('user_joined', {
        conversationId,
        userId: socket.userId,
        customerId: socket.customerId,
        actorType
      });

      // Confirm to the user
      socket.emit('joined_conversation', {
        conversationId,
        participantCount: (await io.in(roomName).fetchSockets()).length
      });
    } catch (error) {
      logger.error('Error joining conversation:', error);
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  });

  /**
   * Leave a conversation room
   */
  socket.on('leave_conversation', async (data) => {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        socket.emit('error', { message: 'Conversation ID required' });
        return;
      }

      const roomName = `conv:${conversationId}`;
      socket.leave(roomName);
      
      logger.info(`${actorType} ${actorId} left conversation ${conversationId}`);

      // Notify others in the room
      socket.to(roomName).emit('user_left', {
        conversationId,
        userId: socket.userId,
        customerId: socket.customerId,
        actorType
      });

      // Confirm to the user
      socket.emit('left_conversation', { conversationId });
    } catch (error) {
      logger.error('Error leaving conversation:', error);
      socket.emit('error', { message: 'Failed to leave conversation' });
    }
  });

  /**
   * Send a message
   */
  socket.on('send_message', async (data) => {
    try {
      const { conversationId, body, type = 'TEXT', metadata = null } = data;

      if (!conversationId) {
        socket.emit('error', { message: 'Conversation ID required' });
        return;
      }

      if (type === 'TEXT' && (!body || body.trim().length === 0)) {
        socket.emit('error', { message: 'Message body required' });
        return;
      }

      // Send message using service
      const message = await chatService.sendMessage(
        conversationId,
        socket.userId,
        socket.customerId,
        body,
        type,
        metadata
      );

      // Broadcast to all participants in the conversation room
      const roomName = `conv:${conversationId}`;
      io.to(roomName).emit('new_message', {
        conversationId,
        message: {
          id: message.id,
          conversationId: message.conversationId,
          userId: message.userId,
          customerId: message.customerId,
          body: message.body,
          type: message.type,
          metadata: message.metadata,
          createdAt: message.createdAt,
          editedAt: message.editedAt
        }
      });

      logger.info(`Message sent in conversation ${conversationId} by ${actorType} ${actorId}`);
    } catch (error) {
      logger.error('Error sending message:', error);
      socket.emit('error', { message: error.message || 'Failed to send message' });
    }
  });

  /**
   * Mark messages as read
   */
  socket.on('mark_read', async (data) => {
    try {
      const { conversationId, messageId } = data;

      if (!conversationId || !messageId) {
        socket.emit('error', { message: 'Conversation ID and message ID required' });
        return;
      }

      // Mark as read using service
      await chatService.markAsRead(conversationId, socket.userId, socket.customerId, messageId);

      // Broadcast to conversation room
      const roomName = `conv:${conversationId}`;
      io.to(roomName).emit('message_read', {
        conversationId,
        messageId,
        userId: socket.userId,
        customerId: socket.customerId,
        actorType
      });

      logger.info(`Messages marked as read in conversation ${conversationId} by ${actorType} ${actorId}`);
    } catch (error) {
      logger.error('Error marking messages as read:', error);
      socket.emit('error', { message: 'Failed to mark messages as read' });
    }
  });

  /**
   * Typing indicator - start typing
   */
  socket.on('typing_start', async (data) => {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        return;
      }

      const roomName = `conv:${conversationId}`;
      
      // Broadcast to others (not self)
      socket.to(roomName).emit('typing', {
        conversationId,
        userId: socket.userId,
        customerId: socket.customerId,
        actorType,
        isTyping: true
      });
    } catch (error) {
      logger.error('Error handling typing start:', error);
    }
  });

  /**
   * Typing indicator - stop typing
   */
  socket.on('typing_stop', async (data) => {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        return;
      }

      const roomName = `conv:${conversationId}`;
      
      // Broadcast to others (not self)
      socket.to(roomName).emit('typing', {
        conversationId,
        userId: socket.userId,
        customerId: socket.customerId,
        actorType,
        isTyping: false
      });
    } catch (error) {
      logger.error('Error handling typing stop:', error);
    }
  });

  /**
   * Handle disconnect
   */
  socket.on('disconnect', () => {
    logger.info(`Chat disconnected: ${actorType} ${actorId}`);
  });

  /**
   * Handle errors
   */
  socket.on('error', (error) => {
    logger.error(`Socket error for ${actorType} ${actorId}:`, error);
  });
};

module.exports = { handleChatConnection };
