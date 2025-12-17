const { 
  ChatConversation, 
  ChatParticipant, 
  ChatMessage, 
  ChatReviewPin,
  ChatReviewPinLink,
  Customer,
  User,
  Invoice,
  Quote,
  Receipt
} = require('../../database/models');
const { Op } = require('sequelize');
const { sequelize } = require('../../database/connection');

class ChatService {
  /**
   * Create a new conversation with idempotency
   * @param {Object} data - Conversation data
   * @param {string} data.type - CUSTOMER_DM, STAFF_GROUP, or STAFF_DM
   * @param {string} data.createdByUserId - Staff user creating the conversation
   * @param {string} [data.customerId] - Customer ID (required for CUSTOMER_DM)
   * @param {string} [data.title] - Optional title for group chats
   * @param {Array} [data.participantUserIds] - Array of staff user IDs to add
   * @returns {Promise<Object>} Created conversation
   */
  async createConversation(data) {
    const transaction = await sequelize.transaction();
    
    try {
      const { type, createdByUserId, customerId, title, participantUserIds = [] } = data;
      
      // Validation
      if (type === 'CUSTOMER_DM' && !customerId) {
        throw new Error('customerId is required for CUSTOMER_DM conversations');
      }
      
      // Check for existing CUSTOMER_DM (idempotency)
      if (type === 'CUSTOMER_DM') {
        const existing = await ChatConversation.findOne({
          where: {
            type: 'CUSTOMER_DM',
            customerId
          },
          include: [{
            model: ChatParticipant,
            as: 'participants',
            where: { leftAt: null }
          }],
          transaction
        });
        
        if (existing) {
          await transaction.commit();
          return existing;
        }
      }
      
      // Create conversation
      const conversation = await ChatConversation.create({
        type,
        customerId: type === 'CUSTOMER_DM' ? customerId : null,
        createdByUserId,
        title: title || null
      }, { transaction });
      
      // Add participants
      const participantsToAdd = [createdByUserId, ...participantUserIds];
      
      for (const userId of participantsToAdd) {
        await ChatParticipant.create({
          conversationId: conversation.id,
          userId,
          customerId: null,
          joinedAt: new Date()
        }, { transaction });
      }
      
      // For CUSTOMER_DM, add customer as participant
      if (type === 'CUSTOMER_DM') {
        await ChatParticipant.create({
          conversationId: conversation.id,
          userId: null,
          customerId,
          joinedAt: new Date()
        }, { transaction });
      }
      
      await transaction.commit();
      return conversation;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get conversations for a user or customer
   * @param {Object} params
   * @param {string} [params.userId] - Staff user ID
   * @param {string} [params.customerId] - Customer ID
   * @param {string} [params.type] - Filter by conversation type
   * @returns {Promise<Array>} List of conversations
   */
  async getConversations({ userId, customerId, type }) {
    if (!userId && !customerId) {
      throw new Error('Either userId or customerId must be provided');
    }
    
    const where = {};
    if (type) {
      where.type = type;
    }
    
    // Build participant filter
    const participantWhere = { leftAt: null };
    if (userId) {
      participantWhere.userId = userId;
    }
    if (customerId) {
      participantWhere.customerId = customerId;
    }
    
    const conversations = await ChatConversation.findAll({
      where,
      include: [
        {
          model: ChatParticipant,
          as: 'participants',
          where: participantWhere,
          required: true
        },
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['lastMessageAt', 'DESC NULLS LAST'], ['createdAt', 'DESC']]
    });
    
    return conversations;
  }

  /**
   * Get messages in a conversation with cursor pagination
   * @param {string} conversationId
   * @param {Object} options - Pagination options
   * @param {string} [options.before] - Message ID to fetch before
   * @param {string} [options.after] - Message ID to fetch after
   * @param {number} [options.limit=50] - Number of messages to fetch
   * @returns {Promise<Array>} List of messages
   */
  async getMessages(conversationId, options = {}) {
    const { before, after, limit = 50 } = options;
    
    const where = {
      conversationId,
      deletedAt: null
    };
    
    // Cursor pagination
    if (before) {
      const beforeMessage = await ChatMessage.findByPk(before);
      if (beforeMessage) {
        where.createdAt = { [Op.lt]: beforeMessage.createdAt };
      }
    }
    
    if (after) {
      const afterMessage = await ChatMessage.findByPk(after);
      if (afterMessage) {
        where.createdAt = { [Op.gt]: afterMessage.createdAt };
      }
    }
    
    const messages = await ChatMessage.findAll({
      where,
      include: [
        {
          model: User,
          as: 'senderUser',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: Customer,
          as: 'senderCustomer',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', after ? 'ASC' : 'DESC']],
      limit: Math.min(limit, 100) // Cap at 100
    });
    
    // If fetching before (scrolling up), reverse to chronological order
    if (!after) {
      messages.reverse();
    }
    
    return messages;
  }

  /**
   * Send a message in a conversation
   * @param {Object} data
   * @param {string} data.conversationId
   * @param {string} [data.senderUserId] - Staff user ID
   * @param {string} [data.senderCustomerId] - Customer ID
   * @param {string} data.messageType - TEXT, SYSTEM, DOCUMENT, FILE
   * @param {string} [data.body] - Message text
   * @param {Object} [data.metadata] - Additional data
   * @returns {Promise<Object>} Created message
   */
  async sendMessage(data) {
    const transaction = await sequelize.transaction();
    
    try {
      const { 
        conversationId, 
        senderUserId, 
        senderCustomerId, 
        messageType, 
        body, 
        metadata 
      } = data;
      
      // Validate message length
      if (messageType === 'TEXT' && body && body.length > 5000) {
        throw new Error('Message exceeds maximum length of 5000 characters');
      }
      
      // Create message
      const message = await ChatMessage.create({
        conversationId,
        senderUserId: senderUserId || null,
        senderCustomerId: senderCustomerId || null,
        messageType,
        body,
        metadata
      }, { transaction });
      
      // Update conversation's lastMessageAt
      await ChatConversation.update(
        { lastMessageAt: new Date() },
        { where: { id: conversationId }, transaction }
      );
      
      // Scan for mentions (STAFF_GROUP only)
      if (messageType === 'TEXT' && body && senderUserId) {
        await this.scanMessageForMentions(
          message.id, 
          conversationId, 
          body, 
          senderUserId, 
          transaction
        );
      }
      
      await transaction.commit();
      
      // Reload with sender info
      return await ChatMessage.findByPk(message.id, {
        include: [
          {
            model: User,
            as: 'senderUser',
            attributes: ['id', 'firstName', 'lastName', 'email', 'role']
          },
          {
            model: Customer,
            as: 'senderCustomer',
            attributes: ['id', 'name', 'email']
          }
        ]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Mark conversation as read up to a specific message
   * @param {string} conversationId
   * @param {string} actorId - userId or customerId
   * @param {boolean} isStaff - true for staff, false for customer
   * @param {string} messageId - Last read message ID
   */
  async markAsRead(conversationId, actorId, isStaff, messageId) {
    const where = {
      conversationId,
      leftAt: null
    };
    
    if (isStaff) {
      where.userId = actorId;
    } else {
      where.customerId = actorId;
    }
    
    const participant = await ChatParticipant.findOne({ where });
    
    if (!participant) {
      throw new Error('Participant not found in conversation');
    }
    
    await participant.markRead(messageId);
  }

  /**
   * Add a participant to a conversation
   * @param {string} conversationId
   * @param {string} userId - Staff user ID to add
   * @param {string} addedByUserId - Staff user performing the action
   */
  async addParticipant(conversationId, userId, addedByUserId) {
    const conversation = await ChatConversation.findByPk(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    if (conversation.type === 'CUSTOMER_DM') {
      throw new Error('Cannot add participants to CUSTOMER_DM conversations');
    }
    
    // Check if already a participant
    const existing = await ChatParticipant.findOne({
      where: {
        conversationId,
        userId,
        leftAt: null
      }
    });
    
    if (existing) {
      return existing;
    }
    
    const participant = await ChatParticipant.create({
      conversationId,
      userId,
      customerId: null,
      joinedAt: new Date()
    });
    
    // Create system message
    const addedUser = await User.findByPk(userId);
    await this.sendMessage({
      conversationId,
      senderUserId: null,
      senderCustomerId: null,
      messageType: 'SYSTEM',
      body: `${addedUser.firstName} ${addedUser.lastName} was added to the conversation`,
      metadata: { action: 'participant_added', userId, addedByUserId }
    });
    
    return participant;
  }

  /**
   * Remove a participant from a conversation
   * @param {string} conversationId
   * @param {string} userId - Staff user ID to remove
   * @param {string} removedByUserId - Staff user performing the action
   */
  async removeParticipant(conversationId, userId, removedByUserId) {
    const participant = await ChatParticipant.findOne({
      where: {
        conversationId,
        userId,
        leftAt: null
      }
    });
    
    if (!participant) {
      throw new Error('Participant not found or already left');
    }
    
    await participant.leave();
    
    // Create system message
    const removedUser = await User.findByPk(userId);
    await this.sendMessage({
      conversationId,
      senderUserId: null,
      senderCustomerId: null,
      messageType: 'SYSTEM',
      body: `${removedUser.firstName} ${removedUser.lastName} left the conversation`,
      metadata: { action: 'participant_removed', userId, removedByUserId }
    });
  }

  /**
   * Scan message for entity mentions and create review pins
   * @param {string} messageId
   * @param {string} conversationId
   * @param {string} messageBody
   * @param {string} senderUserId
   * @param {Object} transaction - Sequelize transaction
   */
  async scanMessageForMentions(messageId, conversationId, messageBody, senderUserId, transaction) {
    // Only scan STAFF_GROUP conversations
    const conversation = await ChatConversation.findByPk(conversationId, { transaction });
    if (conversation.type !== 'STAFF_GROUP') {
      return [];
    }
    
    const pins = [];
    const normalizedBody = this.normalizeText(messageBody);
    
    // Scan for customer names
    const customers = await Customer.findAll({
      attributes: ['id', 'name'],
      where: { isActive: true },
      transaction
    });
    
    for (const customer of customers) {
      const normalizedName = this.normalizeText(customer.name);
      if (this.isNameMentioned(normalizedBody, normalizedName)) {
        // Check for duplicate pin in same message
        const existing = await ChatReviewPin.findOne({
          where: {
            sourceMessageId: messageId,
            matchedEntityType: 'CUSTOMER',
            matchedEntityId: customer.id
          },
          transaction
        });
        
        if (!existing) {
          const pin = await ChatReviewPin.create({
            conversationId,
            sourceMessageId: messageId,
            matchedEntityType: 'CUSTOMER',
            matchedEntityId: customer.id,
            status: 'OPEN',
            createdByUserId: senderUserId
          }, { transaction });
          
          pins.push(pin);
        }
      }
    }
    
    // Scan for user names (staff mentions)
    const users = await User.findAll({
      attributes: ['id', 'firstName', 'lastName'],
      where: { isActive: true },
      transaction
    });
    
    for (const user of users) {
      const fullName = `${user.firstName} ${user.lastName}`;
      const normalizedName = this.normalizeText(fullName);
      
      if (this.isNameMentioned(normalizedBody, normalizedName)) {
        const existing = await ChatReviewPin.findOne({
          where: {
            sourceMessageId: messageId,
            matchedEntityType: 'USER',
            matchedEntityId: user.id
          },
          transaction
        });
        
        if (!existing) {
          const pin = await ChatReviewPin.create({
            conversationId,
            sourceMessageId: messageId,
            matchedEntityType: 'USER',
            matchedEntityId: user.id,
            status: 'OPEN',
            createdByUserId: senderUserId
          }, { transaction });
          
          pins.push(pin);
        }
      }
    }
    
    return pins;
  }

  /**
   * Normalize text for mention matching
   * @param {string} text
   * @returns {string}
   */
  normalizeText(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      // Arabic normalization (remove diacritics)
      .replace(/[\u064B-\u065F]/g, '');
  }

  /**
   * Check if name is mentioned in message
   * @param {string} messageBody - Normalized message text
   * @param {string} targetName - Normalized target name
   * @returns {boolean}
   */
  isNameMentioned(messageBody, targetName) {
    // Ignore extremely short names
    if (targetName.length < 3) {
      return false;
    }
    
    // Exact full name match
    if (messageBody.includes(targetName)) {
      return true;
    }
    
    // Token boundary match
    const words = messageBody.split(/\s+/);
    const targetWords = targetName.split(/\s+/);
    
    // Check if all target words appear consecutively
    for (let i = 0; i <= words.length - targetWords.length; i++) {
      let match = true;
      for (let j = 0; j < targetWords.length; j++) {
        if (words[i + j] !== targetWords[j]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
    
    return false;
  }

  /**
   * Get review pins for a conversation
   * @param {string} conversationId
   * @param {string} [status] - Filter by OPEN or RESOLVED
   * @returns {Promise<Array>}
   */
  async getReviewPins(conversationId, status) {
    const where = { conversationId };
    if (status) {
      where.status = status;
    }
    
    const pins = await ChatReviewPin.findAll({
      where,
      include: [
        {
          model: ChatMessage,
          as: 'sourceMessage',
          attributes: ['id', 'body', 'createdAt']
        },
        {
          model: ChatReviewPinLink,
          as: 'links',
          include: [{
            model: User,
            as: 'addedBy',
            attributes: ['id', 'firstName', 'lastName']
          }]
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'resolver',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Enrich with entity names
    for (const pin of pins) {
      if (pin.matchedEntityType === 'CUSTOMER') {
        const customer = await Customer.findByPk(pin.matchedEntityId, {
          attributes: ['id', 'name']
        });
        pin.dataValues.entityName = customer?.name || 'Unknown Customer';
      } else if (pin.matchedEntityType === 'USER') {
        const user = await User.findByPk(pin.matchedEntityId, {
          attributes: ['id', 'firstName', 'lastName']
        });
        pin.dataValues.entityName = user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
      }
    }
    
    return pins;
  }

  /**
   * Resolve a review pin
   * @param {string} pinId
   * @param {string} userId - User resolving the pin
   */
  async resolvePin(pinId, userId) {
    const pin = await ChatReviewPin.findByPk(pinId);
    if (!pin) {
      throw new Error('Pin not found');
    }
    
    await pin.resolve(userId);
    return pin;
  }

  /**
   * Reopen a review pin
   * @param {string} pinId
   */
  async reopenPin(pinId) {
    const pin = await ChatReviewPin.findByPk(pinId);
    if (!pin) {
      throw new Error('Pin not found');
    }
    
    await pin.reopen();
    return pin;
  }

  /**
   * Add a document link to a review pin
   * @param {string} pinId
   * @param {string} linkType - INVOICE, QUOTE, or RECEIPT
   * @param {string} documentId
   * @param {string} userId - User adding the link
   */
  async addPinLink(pinId, linkType, documentId, userId) {
    const transaction = await sequelize.transaction();
    
    try {
      const pin = await ChatReviewPin.findByPk(pinId, { transaction });
      if (!pin) {
        throw new Error('Pin not found');
      }
      
      // Verify document exists
      let document;
      if (linkType === 'INVOICE') {
        document = await Invoice.findByPk(documentId, { transaction });
      } else if (linkType === 'QUOTE') {
        document = await Quote.findByPk(documentId, { transaction });
      } else if (linkType === 'RECEIPT') {
        document = await Receipt.findByPk(documentId, { transaction });
      }
      
      if (!document) {
        throw new Error(`${linkType} not found`);
      }
      
      // If pin references a customer, verify document belongs to that customer
      if (pin.matchedEntityType === 'CUSTOMER' && 
          document.customerId !== pin.matchedEntityId) {
        throw new Error(`${linkType} does not belong to the referenced customer`);
      }
      
      // Create link (unique constraint prevents duplicates)
      const link = await ChatReviewPinLink.create({
        pinId,
        linkType,
        documentId,
        addedByUserId: userId
      }, { transaction });
      
      await transaction.commit();
      return link;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Remove a document link from a review pin
   * @param {string} linkId
   */
  async removePinLink(linkId) {
    const link = await ChatReviewPinLink.findByPk(linkId);
    if (!link) {
      throw new Error('Link not found');
    }
    
    await link.destroy();
  }
}

module.exports = new ChatService();
