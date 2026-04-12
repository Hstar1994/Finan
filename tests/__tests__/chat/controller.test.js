/**
 * Chat Controller Tests
 */

const mockChatService = {
  createConversation: jest.fn(),
  getConversations: jest.fn(),
  getMessages: jest.fn(),
  sendMessage: jest.fn(),
  markAsRead: jest.fn(),
  getReviewPins: jest.fn(),
  resolvePin: jest.fn(),
  reopenPin: jest.fn(),
  addPinLink: jest.fn(),
  removePinLink: jest.fn(),
  deleteConversation: jest.fn(),
};

const mockApiResponse = {
  created: jest.fn(),
  success: jest.fn(),
  forbidden: jest.fn(),
  notFound: jest.fn(),
  error: jest.fn(),
};

const mockAuditLog = {
  create: jest.fn().mockResolvedValue({}),
};

const mockChatConversation = {
  findByPk: jest.fn(),
};

const mockChatParticipant = {};

jest.mock('../../../src/modules/chat/chat.service', () => mockChatService);
jest.mock('../../../src/utils/apiResponse', () => mockApiResponse);
jest.mock('../../../src/database/models', () => ({
  AuditLog: mockAuditLog,
  ChatConversation: mockChatConversation,
  ChatParticipant: mockChatParticipant,
}));

const controller = require('../../../src/modules/chat/controller');

describe('Chat Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let mockIo;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditLog.create.mockResolvedValue({});

    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    const mockApp = {
      get: jest.fn().mockReturnValue(mockIo),
    };

    mockReq = {
      body: {},
      params: {},
      query: {},
      actorType: 'staff',
      userRole: 'admin',
      userId: 'user-1',
      customerId: null,
      app: mockApp,
    };

    mockRes = {};
    mockNext = jest.fn();
  });

  describe('createConversation', () => {
    it('should create a conversation for staff', async () => {
      const conversation = {
        id: 'conv-1',
        participants: [{ userId: 'user-2' }],
      };
      mockChatService.createConversation.mockResolvedValue(conversation);
      mockReq.body = { type: 'DIRECT', customerId: 'cust-1', title: 'Test', participantUserIds: ['user-2'] };

      await controller.createConversation(mockReq, mockRes, mockNext);

      expect(mockChatService.createConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DIRECT',
          customerId: 'cust-1',
          title: 'Test',
          createdByUserId: 'user-1',
          participantUserIds: ['user-2'],
        })
      );
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'chat.conversation.created', entityId: 'conv-1' })
      );
      expect(mockIo.to).toHaveBeenCalledWith('user:user-2');
      expect(mockApiResponse.created).toHaveBeenCalledWith(
        mockRes,
        { conversation },
        'Conversation created successfully'
      );
    });

    it('should default participantUserIds to empty array if not provided', async () => {
      const conversation = { id: 'conv-1', participants: [] };
      mockChatService.createConversation.mockResolvedValue(conversation);
      mockReq.body = { type: 'DIRECT' };

      await controller.createConversation(mockReq, mockRes, mockNext);

      expect(mockChatService.createConversation).toHaveBeenCalledWith(
        expect.objectContaining({ participantUserIds: [] })
      );
    });

    it('should return forbidden for non-staff actor', async () => {
      mockReq.actorType = 'customer';

      await controller.createConversation(mockReq, mockRes, mockNext);

      expect(mockApiResponse.forbidden).toHaveBeenCalledWith(mockRes, 'Only staff can create conversations');
    });

    it('should call next on error', async () => {
      mockChatService.createConversation.mockRejectedValue(new Error('DB error'));
      await controller.createConversation(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getConversations', () => {
    it('should get conversations for staff with userId', async () => {
      const conversations = [{ id: 'conv-1' }];
      mockChatService.getConversations.mockResolvedValue(conversations);
      mockReq.query = { type: 'DIRECT' };

      await controller.getConversations(mockReq, mockRes, mockNext);

      expect(mockChatService.getConversations).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', type: 'DIRECT' })
      );
      expect(mockApiResponse.success).toHaveBeenCalledWith(
        mockRes,
        { conversations },
        'Conversations retrieved successfully'
      );
    });

    it('should get conversations for customer with customerId', async () => {
      const conversations = [{ id: 'conv-2' }];
      mockChatService.getConversations.mockResolvedValue(conversations);
      mockReq.actorType = 'customer';
      mockReq.customerId = 'cust-1';

      await controller.getConversations(mockReq, mockRes, mockNext);

      expect(mockChatService.getConversations).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'cust-1' })
      );
    });

    it('should call next on error', async () => {
      mockChatService.getConversations.mockRejectedValue(new Error('err'));
      await controller.getConversations(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getMessages', () => {
    it('should get messages for a conversation', async () => {
      const messages = [{ id: 'msg-1' }];
      mockChatService.getMessages.mockResolvedValue(messages);
      mockReq.params = { id: 'conv-1' };
      mockReq.query = { before: null, after: null, limit: '20' };

      await controller.getMessages(mockReq, mockRes, mockNext);

      expect(mockChatService.getMessages).toHaveBeenCalledWith('conv-1', { before: null, after: null, limit: 20 });
      expect(mockApiResponse.success).toHaveBeenCalledWith(
        mockRes,
        { messages },
        'Messages retrieved successfully'
      );
    });

    it('should default limit to 50 when not provided', async () => {
      mockChatService.getMessages.mockResolvedValue([]);
      mockReq.params = { id: 'conv-1' };

      await controller.getMessages(mockReq, mockRes, mockNext);

      expect(mockChatService.getMessages).toHaveBeenCalledWith('conv-1', expect.objectContaining({ limit: 50 }));
    });

    it('should call next on error', async () => {
      mockChatService.getMessages.mockRejectedValue(new Error('err'));
      mockReq.params = { id: 'conv-1' };
      await controller.getMessages(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('sendMessage', () => {
    it('should send a message from staff', async () => {
      const message = { id: 'msg-1' };
      mockChatService.sendMessage.mockResolvedValue(message);
      mockReq.params = { id: 'conv-1' };
      mockReq.body = { messageType: 'TEXT', body: 'Hello', metadata: null };

      await controller.sendMessage(mockReq, mockRes, mockNext);

      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-1',
          senderUserId: 'user-1',
          senderCustomerId: null,
          messageType: 'TEXT',
          body: 'Hello',
        })
      );
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'chat.message.created', entityId: 'msg-1' })
      );
      expect(mockApiResponse.created).toHaveBeenCalledWith(mockRes, { message }, 'Message sent successfully');
    });

    it('should send a message from customer', async () => {
      const message = { id: 'msg-2' };
      mockChatService.sendMessage.mockResolvedValue(message);
      mockReq.actorType = 'customer';
      mockReq.customerId = 'cust-1';
      mockReq.userId = null;
      mockReq.params = { id: 'conv-1' };
      mockReq.body = { messageType: 'TEXT', body: 'Hi', metadata: null };

      await controller.sendMessage(mockReq, mockRes, mockNext);

      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          senderUserId: null,
          senderCustomerId: 'cust-1',
        })
      );
    });

    it('should call next on error', async () => {
      mockChatService.sendMessage.mockRejectedValue(new Error('Send error'));
      mockReq.params = { id: 'conv-1' };
      await controller.sendMessage(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('markAsRead', () => {
    it('should mark conversation as read for staff', async () => {
      mockChatService.markAsRead.mockResolvedValue();
      mockReq.params = { id: 'conv-1' };
      mockReq.body = { messageId: 'msg-5' };

      await controller.markAsRead(mockReq, mockRes, mockNext);

      expect(mockChatService.markAsRead).toHaveBeenCalledWith('conv-1', 'user-1', true, 'msg-5');
      expect(mockApiResponse.success).toHaveBeenCalledWith(mockRes, null, 'Conversation marked as read');
    });

    it('should mark as read for customer', async () => {
      mockChatService.markAsRead.mockResolvedValue();
      mockReq.actorType = 'customer';
      mockReq.customerId = 'cust-1';
      mockReq.params = { id: 'conv-1' };
      mockReq.body = {};

      await controller.markAsRead(mockReq, mockRes, mockNext);

      expect(mockChatService.markAsRead).toHaveBeenCalledWith('conv-1', 'cust-1', false, undefined);
    });

    it('should call next on error', async () => {
      mockChatService.markAsRead.mockRejectedValue(new Error('err'));
      mockReq.params = { id: 'conv-1' };
      await controller.markAsRead(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('shareInvoice', () => {
    it('should share invoice for staff', async () => {
      const message = { id: 'msg-1' };
      mockChatService.sendMessage.mockResolvedValue(message);
      mockReq.params = { id: 'conv-1' };
      mockReq.body = { invoiceId: 'inv-1' };

      await controller.shareInvoice(mockReq, mockRes, mockNext);

      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-1',
          senderUserId: 'user-1',
          messageType: 'DOCUMENT',
          metadata: { documentType: 'invoice', documentId: 'inv-1' },
        })
      );
      expect(mockApiResponse.created).toHaveBeenCalledWith(mockRes, { message }, 'Invoice shared successfully');
    });

    it('should return forbidden for customer', async () => {
      mockReq.actorType = 'customer';

      await controller.shareInvoice(mockReq, mockRes, mockNext);

      expect(mockApiResponse.forbidden).toHaveBeenCalledWith(mockRes, 'Only staff can share invoices');
    });

    it('should call next on error', async () => {
      mockChatService.sendMessage.mockRejectedValue(new Error('err'));
      mockReq.params = { id: 'conv-1' };
      await controller.shareInvoice(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('shareQuote', () => {
    it('should share quote for staff', async () => {
      const message = { id: 'msg-1' };
      mockChatService.sendMessage.mockResolvedValue(message);
      mockReq.params = { id: 'conv-1' };
      mockReq.body = { quoteId: 'quote-1' };

      await controller.shareQuote(mockReq, mockRes, mockNext);

      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { documentType: 'quote', documentId: 'quote-1' },
        })
      );
      expect(mockApiResponse.created).toHaveBeenCalledWith(mockRes, { message }, 'Quote shared successfully');
    });

    it('should return forbidden for customer', async () => {
      mockReq.actorType = 'customer';

      await controller.shareQuote(mockReq, mockRes, mockNext);

      expect(mockApiResponse.forbidden).toHaveBeenCalledWith(mockRes, 'Only staff can share quotes');
    });

    it('should call next on error', async () => {
      mockChatService.sendMessage.mockRejectedValue(new Error('err'));
      mockReq.params = { id: 'conv-1' };
      await controller.shareQuote(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getReviewPins', () => {
    it('should get review pins for admin', async () => {
      const pins = [{ id: 'pin-1' }];
      mockChatService.getReviewPins.mockResolvedValue(pins);
      mockReq.params = { id: 'conv-1' };
      mockReq.query = { status: 'OPEN' };
      mockReq.userRole = 'admin';

      await controller.getReviewPins(mockReq, mockRes, mockNext);

      expect(mockChatService.getReviewPins).toHaveBeenCalledWith('conv-1', 'OPEN');
      expect(mockApiResponse.success).toHaveBeenCalledWith(mockRes, { pins }, 'Review pins retrieved successfully');
    });

    it('should return forbidden for non-admin/manager', async () => {
      mockReq.userRole = 'accountant';
      mockReq.params = { id: 'conv-1' };

      await controller.getReviewPins(mockReq, mockRes, mockNext);

      expect(mockApiResponse.forbidden).toHaveBeenCalledWith(mockRes, 'Only Admin and Manager can access review pins');
    });

    it('should return forbidden for customer actor', async () => {
      mockReq.actorType = 'customer';
      mockReq.params = { id: 'conv-1' };

      await controller.getReviewPins(mockReq, mockRes, mockNext);

      expect(mockApiResponse.forbidden).toHaveBeenCalled();
    });

    it('should call next on error', async () => {
      mockReq.params = { id: 'conv-1' };
      mockChatService.getReviewPins.mockRejectedValue(new Error('err'));
      await controller.getReviewPins(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('resolvePin', () => {
    it('should resolve a pin for admin', async () => {
      const pin = { id: 'pin-1', status: 'RESOLVED' };
      mockChatService.resolvePin.mockResolvedValue(pin);
      mockReq.params = { pinId: 'pin-1' };
      mockReq.userRole = 'admin';

      await controller.resolvePin(mockReq, mockRes, mockNext);

      expect(mockChatService.resolvePin).toHaveBeenCalledWith('pin-1', 'user-1');
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'chat.pin.resolved' })
      );
      expect(mockApiResponse.success).toHaveBeenCalledWith(mockRes, { pin }, 'Pin resolved successfully');
    });

    it('should return forbidden for non-admin/manager', async () => {
      mockReq.userRole = 'accountant';
      mockReq.params = { pinId: 'pin-1' };

      await controller.resolvePin(mockReq, mockRes, mockNext);

      expect(mockApiResponse.forbidden).toHaveBeenCalledWith(mockRes, 'Only Admin and Manager can resolve pins');
    });

    it('should call next on error', async () => {
      mockReq.params = { pinId: 'pin-1' };
      mockChatService.resolvePin.mockRejectedValue(new Error('err'));
      await controller.resolvePin(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('reopenPin', () => {
    it('should reopen a pin for admin', async () => {
      const pin = { id: 'pin-1', status: 'OPEN' };
      mockChatService.reopenPin.mockResolvedValue(pin);
      mockReq.params = { pinId: 'pin-1' };
      mockReq.userRole = 'admin';

      await controller.reopenPin(mockReq, mockRes, mockNext);

      expect(mockChatService.reopenPin).toHaveBeenCalledWith('pin-1');
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'chat.pin.reopened' })
      );
      expect(mockApiResponse.success).toHaveBeenCalledWith(mockRes, { pin }, 'Pin reopened successfully');
    });

    it('should return forbidden for non-admin/manager', async () => {
      mockReq.userRole = 'accountant';
      mockReq.params = { pinId: 'pin-1' };

      await controller.reopenPin(mockReq, mockRes, mockNext);

      expect(mockApiResponse.forbidden).toHaveBeenCalledWith(mockRes, 'Only Admin and Manager can reopen pins');
    });

    it('should call next on error', async () => {
      mockReq.params = { pinId: 'pin-1' };
      mockChatService.reopenPin.mockRejectedValue(new Error('err'));
      await controller.reopenPin(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('addPinLink', () => {
    it('should add a pin link for admin', async () => {
      const link = { id: 'link-1' };
      mockChatService.addPinLink.mockResolvedValue(link);
      mockReq.params = { pinId: 'pin-1' };
      mockReq.body = { linkType: 'invoice', documentId: 'inv-1' };
      mockReq.userRole = 'admin';

      await controller.addPinLink(mockReq, mockRes, mockNext);

      expect(mockChatService.addPinLink).toHaveBeenCalledWith('pin-1', 'invoice', 'inv-1', 'user-1');
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'chat.pin.link.added' })
      );
      expect(mockApiResponse.created).toHaveBeenCalledWith(mockRes, { link }, 'Document linked successfully');
    });

    it('should return forbidden for non-admin/manager', async () => {
      mockReq.userRole = 'accountant';
      mockReq.params = { pinId: 'pin-1' };

      await controller.addPinLink(mockReq, mockRes, mockNext);

      expect(mockApiResponse.forbidden).toHaveBeenCalledWith(mockRes, 'Only Admin and Manager can add pin links');
    });

    it('should call next on error', async () => {
      mockReq.params = { pinId: 'pin-1' };
      mockChatService.addPinLink.mockRejectedValue(new Error('err'));
      await controller.addPinLink(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('removePinLink', () => {
    it('should remove a pin link for admin', async () => {
      mockChatService.removePinLink.mockResolvedValue();
      mockReq.params = { pinId: 'pin-1', linkId: 'link-1' };
      mockReq.userRole = 'admin';

      await controller.removePinLink(mockReq, mockRes, mockNext);

      expect(mockChatService.removePinLink).toHaveBeenCalledWith('link-1');
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'chat.pin.link.removed' })
      );
      expect(mockApiResponse.success).toHaveBeenCalledWith(mockRes, null, 'Document link removed successfully');
    });

    it('should return forbidden for non-admin/manager', async () => {
      mockReq.userRole = 'accountant';
      mockReq.params = { pinId: 'pin-1', linkId: 'link-1' };

      await controller.removePinLink(mockReq, mockRes, mockNext);

      expect(mockApiResponse.forbidden).toHaveBeenCalledWith(mockRes, 'Only Admin and Manager can remove pin links');
    });

    it('should call next on error', async () => {
      mockReq.params = { pinId: 'pin-1', linkId: 'link-1' };
      mockChatService.removePinLink.mockRejectedValue(new Error('err'));
      await controller.removePinLink(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation for staff and broadcast', async () => {
      mockChatService.deleteConversation.mockResolvedValue();
      const conversation = {
        participants: [{ userId: 'user-2' }, { userId: 'user-3' }],
      };
      mockChatConversation.findByPk.mockResolvedValue(conversation);
      mockReq.params = { id: 'conv-1' };

      await controller.deleteConversation(mockReq, mockRes, mockNext);

      expect(mockChatService.deleteConversation).toHaveBeenCalledWith('conv-1', 'user-1', null);
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'chat.conversation.deleted' })
      );
      expect(mockIo.to).toHaveBeenCalledWith('user:user-2');
      expect(mockIo.to).toHaveBeenCalledWith('user:user-3');
      expect(mockApiResponse.success).toHaveBeenCalledWith(mockRes, null, 'Conversation deleted successfully');
    });

    it('should delete conversation for customer', async () => {
      mockChatService.deleteConversation.mockResolvedValue();
      mockChatConversation.findByPk.mockResolvedValue({ participants: [] });
      mockReq.actorType = 'customer';
      mockReq.customerId = 'cust-1';
      mockReq.userId = null;
      mockReq.params = { id: 'conv-1' };

      await controller.deleteConversation(mockReq, mockRes, mockNext);

      expect(mockChatService.deleteConversation).toHaveBeenCalledWith('conv-1', null, 'cust-1');
    });

    it('should handle null io gracefully', async () => {
      mockChatService.deleteConversation.mockResolvedValue();
      mockChatConversation.findByPk.mockResolvedValue({ participants: [{ userId: 'user-2' }] });
      mockReq.app.get = jest.fn().mockReturnValue(null);
      mockReq.params = { id: 'conv-1' };

      await controller.deleteConversation(mockReq, mockRes, mockNext);

      expect(mockApiResponse.success).toHaveBeenCalledWith(mockRes, null, 'Conversation deleted successfully');
    });

    it('should call next on error', async () => {
      mockChatConversation.findByPk.mockRejectedValue(new Error('DB error'));
      mockReq.params = { id: 'conv-1' };
      await controller.deleteConversation(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
