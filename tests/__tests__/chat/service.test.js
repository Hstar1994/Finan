/**
 * Chat Service Tests
 * Tests for chat/messaging functionality
 */

const ChatService = require('../../../src/modules/chat/chat.service');

// Mock dependencies
jest.mock('../../../src/database/models', () => ({
  ChatConversation: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  ChatParticipant: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  ChatMessage: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  ChatReviewPin: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  ChatReviewPinLink: {
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  Customer: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
  User: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
  Invoice: {
    findByPk: jest.fn(),
  },
  Quote: {
    findByPk: jest.fn(),
  },
  Receipt: {
    findByPk: jest.fn(),
  },
}));

jest.mock('../../../src/database/connection', () => ({
  sequelize: {
    transaction: jest.fn(),
  },
}));

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
  Receipt,
} = require('../../../src/database/models');
const { sequelize } = require('../../../src/database/connection');

describe('ChatService', () => {
  let mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(true),
      rollback: jest.fn().mockResolvedValue(true),
    };
    
    sequelize.transaction.mockResolvedValue(mockTransaction);
  });

  describe('createConversation', () => {
    it('should create a new CUSTOMER_DM conversation', async () => {
      const mockConversation = {
        id: 1,
        type: 'CUSTOMER_DM',
        customerId: 1,
        createdByUserId: 1,
      };
      
      ChatConversation.findOne.mockResolvedValue(null); // No existing
      ChatConversation.create.mockResolvedValue(mockConversation);
      ChatParticipant.create.mockResolvedValue({ id: 1 });
      
      const result = await ChatService.createConversation({
        type: 'CUSTOMER_DM',
        createdByUserId: 1,
        customerId: 1,
      });
      
      expect(ChatConversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CUSTOMER_DM',
          customerId: 1,
          createdByUserId: 1,
        }),
        { transaction: mockTransaction }
      );
      expect(ChatParticipant.create).toHaveBeenCalledTimes(2); // Staff + Customer
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toEqual(mockConversation);
    });

    it('should return existing CUSTOMER_DM conversation (idempotency)', async () => {
      const existingConversation = {
        id: 1,
        type: 'CUSTOMER_DM',
        customerId: 1,
        participants: [{ id: 1, userId: 1 }],
      };
      
      ChatConversation.findOne.mockResolvedValue(existingConversation);
      
      const result = await ChatService.createConversation({
        type: 'CUSTOMER_DM',
        createdByUserId: 1,
        customerId: 1,
      });
      
      expect(ChatConversation.create).not.toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toEqual(existingConversation);
    });

    it('should create STAFF_GROUP conversation with multiple participants', async () => {
      const mockConversation = {
        id: 2,
        type: 'STAFF_GROUP',
        title: 'Test Group',
      };
      
      ChatConversation.create.mockResolvedValue(mockConversation);
      ChatParticipant.create.mockResolvedValue({ id: 1 });
      
      await ChatService.createConversation({
        type: 'STAFF_GROUP',
        createdByUserId: 1,
        title: 'Test Group',
        participantUserIds: [2, 3],
      });
      
      // Should add creator + 2 participants
      expect(ChatParticipant.create).toHaveBeenCalledTimes(3);
    });

    it('should throw error if CUSTOMER_DM without customerId', async () => {
      await expect(
        ChatService.createConversation({
          type: 'CUSTOMER_DM',
          createdByUserId: 1,
        })
      ).rejects.toThrow('customerId is required for CUSTOMER_DM conversations');
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      const error = new Error('Database error');
      ChatConversation.findOne.mockResolvedValue(null);
      ChatConversation.create.mockRejectedValue(error);
      
      await expect(
        ChatService.createConversation({
          type: 'CUSTOMER_DM',
          createdByUserId: 1,
          customerId: 1,
        })
      ).rejects.toThrow('Database error');
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('getConversations', () => {
    it('should get conversations for a user', async () => {
      const mockConversations = [
        { id: 1, type: 'CUSTOMER_DM' },
        { id: 2, type: 'STAFF_GROUP' },
      ];
      
      ChatConversation.findAll.mockResolvedValue(mockConversations);
      
      const result = await ChatService.getConversations({ userId: 1 });
      
      expect(ChatConversation.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.any(Array),
          order: expect.any(Array),
        })
      );
      expect(result).toEqual(mockConversations);
    });

    it('should filter by conversation type', async () => {
      ChatConversation.findAll.mockResolvedValue([]);
      
      await ChatService.getConversations({ userId: 1, type: 'STAFF_GROUP' });
      
      expect(ChatConversation.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'STAFF_GROUP' },
        })
      );
    });

    it('should get conversations for a customer', async () => {
      ChatConversation.findAll.mockResolvedValue([]);
      
      await ChatService.getConversations({ customerId: 1 });
      
      expect(ChatConversation.findAll).toHaveBeenCalled();
    });

    it('should throw error if neither userId nor customerId provided', async () => {
      await expect(
        ChatService.getConversations({})
      ).rejects.toThrow('Either userId or customerId must be provided');
    });
  });

  describe('getMessages', () => {
    it('should get messages with default pagination', async () => {
      const mockMessages = [
        { id: 1, body: 'Hello', createdAt: new Date() },
        { id: 2, body: 'Hi', createdAt: new Date() },
      ];
      
      ChatMessage.findAll.mockResolvedValue(mockMessages);
      
      const result = await ChatService.getMessages('conv-1');
      
      expect(ChatMessage.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            conversationId: 'conv-1',
            deletedAt: null,
          }),
          limit: 50,
        })
      );
      expect(result).toEqual(mockMessages.reverse()); // Reversed for chronological order
    });

    it('should support cursor pagination with before', async () => {
      const beforeMessage = { id: 'msg-5', createdAt: new Date('2026-01-01') };
      ChatMessage.findByPk.mockResolvedValue(beforeMessage);
      ChatMessage.findAll.mockResolvedValue([]);
      
      await ChatService.getMessages('conv-1', { before: 'msg-5' });
      
      expect(ChatMessage.findByPk).toHaveBeenCalledWith('msg-5');
      expect(ChatMessage.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.any(Object), // Op.lt
          }),
        })
      );
    });

    it('should support cursor pagination with after', async () => {
      const afterMessage = { id: 'msg-5', createdAt: new Date('2026-01-01') };
      ChatMessage.findByPk.mockResolvedValue(afterMessage);
      ChatMessage.findAll.mockResolvedValue([]);
      
      await ChatService.getMessages('conv-1', { after: 'msg-5' });
      
      expect(ChatMessage.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['createdAt', 'ASC']], // ASC when fetching after
        })
      );
    });

    it('should cap limit at 100', async () => {
      ChatMessage.findAll.mockResolvedValue([]);
      
      await ChatService.getMessages('conv-1', { limit: 200 });
      
      expect(ChatMessage.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100, // Capped
        })
      );
    });
  });

  describe('sendMessage', () => {
    it('should send a text message', async () => {
      const mockMessage = {
        id: 1,
        conversationId: 'conv-1',
        body: 'Hello',
        messageType: 'TEXT',
      };
      
      ChatMessage.create.mockResolvedValue(mockMessage);
      ChatMessage.findByPk.mockResolvedValue({
        ...mockMessage,
        senderUser: { id: 1, firstName: 'Test' },
      });
      ChatConversation.update.mockResolvedValue([1]);
      ChatConversation.findByPk.mockResolvedValue({ type: 'CUSTOMER_DM' });
      
      const result = await ChatService.sendMessage({
        conversationId: 'conv-1',
        senderUserId: 1,
        messageType: 'TEXT',
        body: 'Hello',
      });
      
      expect(ChatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-1',
          senderUserId: 1,
          messageType: 'TEXT',
          body: 'Hello',
        }),
        { transaction: mockTransaction }
      );
      expect(ChatConversation.update).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw error for message exceeding 5000 characters', async () => {
      const longMessage = 'x'.repeat(5001);
      
      await expect(
        ChatService.sendMessage({
          conversationId: 'conv-1',
          senderUserId: 1,
          messageType: 'TEXT',
          body: longMessage,
        })
      ).rejects.toThrow('Message exceeds maximum length of 5000 characters');
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should scan for mentions in STAFF_GROUP', async () => {
      const mockConversation = { type: 'STAFF_GROUP' };
      const mockMessage = {
        id: 1,
        conversationId: 'conv-1',
        body: 'Check John Smith',
        messageType: 'TEXT',
      };
      
      ChatConversation.findByPk.mockResolvedValue(mockConversation);
      ChatMessage.create.mockResolvedValue(mockMessage);
      ChatMessage.findByPk.mockResolvedValue(mockMessage);
      ChatConversation.update.mockResolvedValue([1]);
      Customer.findAll.mockResolvedValue([]);
      User.findAll.mockResolvedValue([
        { id: 1, firstName: 'John', lastName: 'Smith' },
      ]);
      ChatReviewPin.findOne.mockResolvedValue(null);
      ChatReviewPin.create.mockResolvedValue({ id: 1 });
      
      await ChatService.sendMessage({
        conversationId: 'conv-1',
        senderUserId: 1,
        messageType: 'TEXT',
        body: 'Check john smith',
      });
      
      expect(ChatReviewPin.create).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      const error = new Error('Database error');
      ChatMessage.create.mockRejectedValue(error);
      
      await expect(
        ChatService.sendMessage({
          conversationId: 'conv-1',
          senderUserId: 1,
          messageType: 'TEXT',
          body: 'Hello',
        })
      ).rejects.toThrow('Database error');
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should mark conversation as read for staff', async () => {
      const mockParticipant = {
        id: 1,
        markRead: jest.fn().mockResolvedValue(true),
      };
      
      ChatParticipant.findOne.mockResolvedValue(mockParticipant);
      
      await ChatService.markAsRead('conv-1', 'user-1', true, 'msg-10');
      
      expect(ChatParticipant.findOne).toHaveBeenCalledWith({
        where: {
          conversationId: 'conv-1',
          userId: 'user-1',
          leftAt: null,
        },
      });
      expect(mockParticipant.markRead).toHaveBeenCalledWith('msg-10');
    });

    it('should mark conversation as read for customer', async () => {
      const mockParticipant = {
        id: 1,
        markRead: jest.fn().mockResolvedValue(true),
      };
      
      ChatParticipant.findOne.mockResolvedValue(mockParticipant);
      
      await ChatService.markAsRead('conv-1', 'cust-1', false, 'msg-10');
      
      expect(ChatParticipant.findOne).toHaveBeenCalledWith({
        where: {
          conversationId: 'conv-1',
          customerId: 'cust-1',
          leftAt: null,
        },
      });
    });

    it('should throw error if participant not found', async () => {
      ChatParticipant.findOne.mockResolvedValue(null);
      
      await expect(
        ChatService.markAsRead('conv-1', 'user-1', true, 'msg-10')
      ).rejects.toThrow('Participant not found in conversation');
    });
  });

  describe('addParticipant', () => {
    it('should add participant to STAFF_GROUP', async () => {
      const mockConversation = { id: 1, type: 'STAFF_GROUP' };
      const mockUser = { id: 2, firstName: 'Jane', lastName: 'Doe' };
      const mockParticipant = { id: 1, conversationId: 1, userId: 2 };
      
      ChatConversation.findByPk.mockResolvedValue(mockConversation);
      ChatParticipant.findOne.mockResolvedValue(null); // Not already participant
      ChatParticipant.create.mockResolvedValue(mockParticipant);
      User.findByPk.mockResolvedValue(mockUser);
      ChatMessage.create.mockResolvedValue({ id: 1 });
      ChatMessage.findByPk.mockResolvedValue({ id: 1 });
      ChatConversation.update.mockResolvedValue([1]);
      ChatConversation.findByPk.mockResolvedValue({ type: 'STAFF_GROUP' });
      Customer.findAll.mockResolvedValue([]);
      User.findAll.mockResolvedValue([]);
      
      const result = await ChatService.addParticipant(1, 2, 1);
      
      expect(ChatParticipant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 1,
          userId: 2,
        })
      );
      expect(result).toEqual(mockParticipant);
    });

    it('should return existing participant if already added', async () => {
      const mockConversation = { id: 1, type: 'STAFF_GROUP' };
      const existingParticipant = { id: 1, conversationId: 1, userId: 2 };
      
      ChatConversation.findByPk.mockResolvedValue(mockConversation);
      ChatParticipant.findOne.mockResolvedValue(existingParticipant);
      
      const result = await ChatService.addParticipant(1, 2, 1);
      
      expect(ChatParticipant.create).not.toHaveBeenCalled();
      expect(result).toEqual(existingParticipant);
    });

    it('should throw error for CUSTOMER_DM', async () => {
      const mockConversation = { id: 1, type: 'CUSTOMER_DM' };
      ChatConversation.findByPk.mockResolvedValue(mockConversation);
      
      await expect(
        ChatService.addParticipant(1, 2, 1)
      ).rejects.toThrow('Cannot add participants to CUSTOMER_DM conversations');
    });

    it('should throw error if conversation not found', async () => {
      ChatConversation.findByPk.mockResolvedValue(null);
      
      await expect(
        ChatService.addParticipant(1, 2, 1)
      ).rejects.toThrow('Conversation not found');
    });
  });

  describe('removeParticipant', () => {
    it('should remove participant and create system message', async () => {
      const mockParticipant = {
        id: 1,
        leave: jest.fn().mockResolvedValue(true),
      };
      const mockUser = { id: 2, firstName: 'Jane', lastName: 'Doe' };
      
      ChatParticipant.findOne.mockResolvedValue(mockParticipant);
      User.findByPk.mockResolvedValue(mockUser);
      ChatMessage.create.mockResolvedValue({ id: 1 });
      ChatMessage.findByPk.mockResolvedValue({ id: 1 });
      ChatConversation.update.mockResolvedValue([1]);
      ChatConversation.findByPk.mockResolvedValue({ type: 'STAFF_GROUP' });
      Customer.findAll.mockResolvedValue([]);
      User.findAll.mockResolvedValue([]);
      
      await ChatService.removeParticipant(1, 2, 1);
      
      expect(mockParticipant.leave).toHaveBeenCalled();
    });

    it('should throw error if participant not found', async () => {
      ChatParticipant.findOne.mockResolvedValue(null);
      
      await expect(
        ChatService.removeParticipant(1, 2, 1)
      ).rejects.toThrow('Participant not found or already left');
    });
  });

  describe('deleteConversation', () => {
    it('should mark staff user as left', async () => {
      const mockConversation = { id: 1, type: 'STAFF_GROUP' };
      const mockParticipant = {
        id: 1,
        update: jest.fn().mockResolvedValue(true),
      };
      
      ChatConversation.findByPk.mockResolvedValue(mockConversation);
      ChatParticipant.findOne.mockResolvedValue(mockParticipant);
      
      const result = await ChatService.deleteConversation(1, 1, null);
      
      expect(mockParticipant.update).toHaveBeenCalledWith({ leftAt: expect.any(Date) });
      expect(result).toEqual({ success: true });
    });

    it('should mark customer as left for CUSTOMER_DM', async () => {
      const mockConversation = {
        id: 1,
        type: 'CUSTOMER_DM',
        metadata: {},
        update: jest.fn().mockResolvedValue(true),
      };
      
      ChatConversation.findByPk.mockResolvedValue(mockConversation);
      
      const result = await ChatService.deleteConversation(1, null, 1);
      
      expect(mockConversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            customerLeft: true,
          }),
        })
      );
      expect(result).toEqual({ success: true });
    });

    it('should throw error if conversation not found', async () => {
      ChatConversation.findByPk.mockResolvedValue(null);
      
      await expect(
        ChatService.deleteConversation(1, 1, null)
      ).rejects.toThrow('Conversation not found');
    });
  });

  describe('normalizeText', () => {
    it('should normalize text to lowercase', () => {
      expect(ChatService.normalizeText('HELLO WORLD')).toBe('hello world');
    });

    it('should trim whitespace', () => {
      expect(ChatService.normalizeText('  hello  ')).toBe('hello');
    });

    it('should collapse multiple spaces', () => {
      expect(ChatService.normalizeText('hello    world')).toBe('hello world');
    });

    it('should remove Arabic diacritics', () => {
      const withDiacritics = 'مُحَمَّد';
      const result = ChatService.normalizeText(withDiacritics);
      expect(result).not.toContain('\u064B'); // No tanwin
    });
  });

  describe('isNameMentioned', () => {
    it('should match exact full name', () => {
      expect(ChatService.isNameMentioned('hello john smith how are you', 'john smith')).toBe(true);
    });

    it('should match consecutive words', () => {
      expect(ChatService.isNameMentioned('check john smith invoice', 'john smith')).toBe(true);
    });

    it('should not match partial words', () => {
      expect(ChatService.isNameMentioned('johnson smithfield', 'john smith')).toBe(false);
    });

    it('should ignore names shorter than 3 characters', () => {
      expect(ChatService.isNameMentioned('hello al there', 'al')).toBe(false);
    });

    it('should match at beginning of message', () => {
      expect(ChatService.isNameMentioned('john smith is here', 'john smith')).toBe(true);
    });

    it('should match at end of message', () => {
      expect(ChatService.isNameMentioned('please contact john smith', 'john smith')).toBe(true);
    });
  });

  describe('getReviewPins', () => {
    it('should get all pins for conversation', async () => {
      const mockPins = [
        { id: 1, matchedEntityType: 'CUSTOMER', matchedEntityId: 1, dataValues: {} },
        { id: 2, matchedEntityType: 'USER', matchedEntityId: 1, dataValues: {} },
      ];
      
      ChatReviewPin.findAll.mockResolvedValue(mockPins);
      Customer.findByPk.mockResolvedValue({ id: 1, name: 'Test Customer' });
      User.findByPk.mockResolvedValue({ id: 1, firstName: 'John', lastName: 'Doe' });
      
      const result = await ChatService.getReviewPins('conv-1');
      
      expect(ChatReviewPin.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversationId: 'conv-1' },
        })
      );
      expect(result).toHaveLength(2);
    });

    it('should filter by status', async () => {
      ChatReviewPin.findAll.mockResolvedValue([]);
      
      await ChatService.getReviewPins('conv-1', 'OPEN');
      
      expect(ChatReviewPin.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversationId: 'conv-1', status: 'OPEN' },
        })
      );
    });
  });

  describe('resolvePin', () => {
    it('should resolve a pin', async () => {
      const mockPin = {
        id: 1,
        resolve: jest.fn().mockResolvedValue(true),
      };
      
      ChatReviewPin.findByPk.mockResolvedValue(mockPin);
      
      await ChatService.resolvePin(1, 1);
      
      expect(mockPin.resolve).toHaveBeenCalledWith(1);
    });

    it('should throw error if pin not found', async () => {
      ChatReviewPin.findByPk.mockResolvedValue(null);
      
      await expect(
        ChatService.resolvePin(1, 1)
      ).rejects.toThrow('Pin not found');
    });
  });

  describe('reopenPin', () => {
    it('should reopen a pin', async () => {
      const mockPin = {
        id: 1,
        reopen: jest.fn().mockResolvedValue(true),
      };
      
      ChatReviewPin.findByPk.mockResolvedValue(mockPin);
      
      await ChatService.reopenPin(1);
      
      expect(mockPin.reopen).toHaveBeenCalled();
    });

    it('should throw error if pin not found', async () => {
      ChatReviewPin.findByPk.mockResolvedValue(null);
      
      await expect(
        ChatService.reopenPin(1)
      ).rejects.toThrow('Pin not found');
    });
  });

  describe('addPinLink', () => {
    it('should add invoice link to pin', async () => {
      const mockPin = {
        id: 1,
        matchedEntityType: 'CUSTOMER',
        matchedEntityId: 1,
      };
      const mockInvoice = { id: 1, customerId: 1 };
      const mockLink = { id: 1, pinId: 1, linkType: 'INVOICE', documentId: 1 };
      
      ChatReviewPin.findByPk.mockResolvedValue(mockPin);
      Invoice.findByPk.mockResolvedValue(mockInvoice);
      ChatReviewPinLink.create.mockResolvedValue(mockLink);
      
      const result = await ChatService.addPinLink(1, 'INVOICE', 1, 1);
      
      expect(Invoice.findByPk).toHaveBeenCalledWith(1, { transaction: mockTransaction });
      expect(ChatReviewPinLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pinId: 1,
          linkType: 'INVOICE',
          documentId: 1,
        }),
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toEqual(mockLink);
    });

    it('should throw error if pin not found', async () => {
      ChatReviewPin.findByPk.mockResolvedValue(null);
      
      await expect(
        ChatService.addPinLink(1, 'INVOICE', 1, 1)
      ).rejects.toThrow('Pin not found');
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should throw error if invoice not found', async () => {
      const mockPin = { id: 1, matchedEntityType: 'CUSTOMER', matchedEntityId: 1 };
      
      ChatReviewPin.findByPk.mockResolvedValue(mockPin);
      Invoice.findByPk.mockResolvedValue(null);
      
      await expect(
        ChatService.addPinLink(1, 'INVOICE', 999, 1)
      ).rejects.toThrow('INVOICE not found');
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should throw error if document belongs to different customer', async () => {
      const mockPin = {
        id: 1,
        matchedEntityType: 'CUSTOMER',
        matchedEntityId: 1,
      };
      const mockInvoice = { id: 1, customerId: 999 }; // Different customer
      
      ChatReviewPin.findByPk.mockResolvedValue(mockPin);
      Invoice.findByPk.mockResolvedValue(mockInvoice);
      
      await expect(
        ChatService.addPinLink(1, 'INVOICE', 1, 1)
      ).rejects.toThrow('INVOICE does not belong to the referenced customer');
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should add quote link', async () => {
      const mockPin = { id: 1, matchedEntityType: 'USER', matchedEntityId: 1 };
      const mockQuote = { id: 1, customerId: 1 };
      
      ChatReviewPin.findByPk.mockResolvedValue(mockPin);
      Quote.findByPk.mockResolvedValue(mockQuote);
      ChatReviewPinLink.create.mockResolvedValue({ id: 1 });
      
      await ChatService.addPinLink(1, 'QUOTE', 1, 1);
      
      expect(Quote.findByPk).toHaveBeenCalledWith(1, { transaction: mockTransaction });
    });

    it('should add receipt link', async () => {
      const mockPin = { id: 1, matchedEntityType: 'USER', matchedEntityId: 1 };
      const mockReceipt = { id: 1, customerId: 1 };
      
      ChatReviewPin.findByPk.mockResolvedValue(mockPin);
      Receipt.findByPk.mockResolvedValue(mockReceipt);
      ChatReviewPinLink.create.mockResolvedValue({ id: 1 });
      
      await ChatService.addPinLink(1, 'RECEIPT', 1, 1);
      
      expect(Receipt.findByPk).toHaveBeenCalledWith(1, { transaction: mockTransaction });
    });
  });

  describe('removePinLink', () => {
    it('should remove a link', async () => {
      const mockLink = {
        id: 1,
        destroy: jest.fn().mockResolvedValue(true),
      };
      
      ChatReviewPinLink.findByPk.mockResolvedValue(mockLink);
      
      await ChatService.removePinLink(1);
      
      expect(mockLink.destroy).toHaveBeenCalled();
    });

    it('should throw error if link not found', async () => {
      ChatReviewPinLink.findByPk.mockResolvedValue(null);
      
      await expect(
        ChatService.removePinLink(1)
      ).rejects.toThrow('Link not found');
    });
  });
});
