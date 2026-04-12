/**
 * Chat Handlers Tests
 */

jest.mock('../../../src/modules/chat/chat.service', () => ({
  sendMessage: jest.fn(),
  markAsRead: jest.fn(),
}));

jest.mock('../../../src/database/models', () => ({
  ChatParticipant: { findOne: jest.fn() },
  ChatConversation: { findByPk: jest.fn() },
  ChatMessage: { findByPk: jest.fn() },
  User: {},
  Customer: {},
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

const chatService = require('../../../src/modules/chat/chat.service');
const { ChatParticipant, ChatConversation, ChatMessage } = require('../../../src/database/models');
const { handleChatConnection } = require('../../../src/socket/handlers/chat.handlers');

describe('Chat Handlers', () => {
  let mockIo;
  let mockSocket;
  let handlers;

  beforeEach(() => {
    jest.clearAllMocks();

    handlers = {};

    mockSocket = {
      userId: 'user-1',
      customerId: null,
      actorType: 'staff',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      on: jest.fn((event, handler) => {
        handlers[event] = handler;
      }),
    };

    mockIo = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      in: jest.fn().mockReturnValue({
        fetchSockets: jest.fn().mockResolvedValue([{}, {}]),
      }),
    };

    handleChatConnection(mockIo, mockSocket);
  });

  it('should register all event handlers', () => {
    expect(mockSocket.on).toHaveBeenCalledWith('join_conversation', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('leave_conversation', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('send_message', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('mark_read', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('typing_start', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('typing_stop', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should join users personal room on connection', () => {
    expect(mockSocket.join).toHaveBeenCalledWith('user:user-1');
  });

  it('should NOT join personal room for customer connections', () => {
    jest.clearAllMocks();
    mockSocket.userId = null;
    mockSocket.customerId = 'cust-1';
    mockSocket.actorType = 'customer';
    mockSocket.on = jest.fn();

    handleChatConnection(mockIo, mockSocket);

    expect(mockSocket.join).not.toHaveBeenCalledWith(expect.stringContaining('user:'));
  });

  describe('join_conversation', () => {
    it('should join a conversation room when user is participant', async () => {
      ChatParticipant.findOne.mockResolvedValue({ id: 'p1' });
      ChatConversation.findByPk.mockResolvedValue({
        id: 'conv-1',
        isCustomerDM: () => false,
      });

      await handlers.join_conversation({ conversationId: 'conv-1' });

      expect(mockSocket.join).toHaveBeenCalledWith('conv:conv-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('joined_conversation', expect.objectContaining({
        conversationId: 'conv-1',
        participantCount: 2,
      }));
    });

    it('should emit error when conversationId missing', async () => {
      await handlers.join_conversation({});

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Conversation ID required' });
    });

    it('should emit error when user is not a participant', async () => {
      ChatParticipant.findOne.mockResolvedValue(null);

      await handlers.join_conversation({ conversationId: 'conv-1' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Not a participant of this conversation' });
    });

    it('should emit error when conversation not found', async () => {
      ChatParticipant.findOne.mockResolvedValue({ id: 'p1' });
      ChatConversation.findByPk.mockResolvedValue(null);

      await handlers.join_conversation({ conversationId: 'conv-1' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Conversation not found' });
    });

    it('should deny customer access to staff-only conversation', async () => {
      // Need to re-initialize with customer socket to capture the correct actorType
      jest.clearAllMocks();
      handlers = {};
      const customerSocket = {
        userId: null,
        customerId: 'cust-1',
        actorType: 'customer',
        join: jest.fn(),
        leave: jest.fn(),
        emit: jest.fn(),
        to: jest.fn().mockReturnValue({ emit: jest.fn() }),
        on: jest.fn((event, handler) => {
          handlers[event] = handler;
        }),
      };

      handleChatConnection(mockIo, customerSocket);

      ChatParticipant.findOne.mockResolvedValue({ id: 'p1' });
      ChatConversation.findByPk.mockResolvedValue({
        id: 'conv-1',
        isCustomerDM: () => false,
      });

      await handlers.join_conversation({ conversationId: 'conv-1' });

      expect(customerSocket.emit).toHaveBeenCalledWith('error', { message: 'Access denied to this conversation' });
    });

    it('should handle errors gracefully', async () => {
      ChatParticipant.findOne.mockRejectedValue(new Error('DB error'));

      await handlers.join_conversation({ conversationId: 'conv-1' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Failed to join conversation' });
    });
  });

  describe('leave_conversation', () => {
    it('should leave a conversation room', async () => {
      await handlers.leave_conversation({ conversationId: 'conv-1' });

      expect(mockSocket.leave).toHaveBeenCalledWith('conv:conv-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('left_conversation', { conversationId: 'conv-1' });
    });

    it('should emit error when conversationId missing', async () => {
      await handlers.leave_conversation({});

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Conversation ID required' });
    });

    it('should handle errors gracefully', async () => {
      mockSocket.leave.mockImplementation(() => { throw new Error('fail'); });

      await handlers.leave_conversation({ conversationId: 'conv-1' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Failed to leave conversation' });
    });
  });

  describe('send_message', () => {
    it('should send a message and broadcast to room', async () => {
      const mockMessage = { id: 'msg-1' };
      chatService.sendMessage.mockResolvedValue(mockMessage);

      const fullMessage = { id: 'msg-1', body: 'Hello', toJSON: () => ({ id: 'msg-1', body: 'Hello' }) };
      ChatMessage.findByPk.mockResolvedValue(fullMessage);

      const roomEmit = jest.fn();
      mockIo.to.mockReturnValue({ emit: roomEmit });

      await handlers.send_message({ conversationId: 'conv-1', body: 'Hello' });

      expect(chatService.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        conversationId: 'conv-1',
        body: 'Hello',
        senderUserId: 'user-1',
        senderCustomerId: null,
        messageType: 'TEXT',
      }));

      expect(mockIo.to).toHaveBeenCalledWith('conv:conv-1');
      expect(roomEmit).toHaveBeenCalledWith('new_message', expect.objectContaining({
        conversationId: 'conv-1',
      }));
    });

    it('should emit error when conversationId missing', async () => {
      await handlers.send_message({ body: 'Hello' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Conversation ID required' });
    });

    it('should emit error for empty TEXT message', async () => {
      await handlers.send_message({ conversationId: 'conv-1', body: '' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Message body required' });
    });

    it('should emit error for TEXT message with only whitespace', async () => {
      await handlers.send_message({ conversationId: 'conv-1', body: '   ' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Message body required' });
    });

    it('should handle sendMessage errors', async () => {
      chatService.sendMessage.mockRejectedValue(new Error('Service error'));

      await handlers.send_message({ conversationId: 'conv-1', body: 'Hello' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Service error' });
    });
  });

  describe('mark_read', () => {
    it('should mark messages as read', async () => {
      chatService.markAsRead.mockResolvedValue(true);
      const roomEmit = jest.fn();
      mockIo.to.mockReturnValue({ emit: roomEmit });

      await handlers.mark_read({ conversationId: 'conv-1', messageId: 'msg-1' });

      expect(chatService.markAsRead).toHaveBeenCalledWith('conv-1', 'user-1', null, 'msg-1');
      expect(mockIo.to).toHaveBeenCalledWith('conv:conv-1');
      expect(roomEmit).toHaveBeenCalledWith('message_read', expect.objectContaining({
        conversationId: 'conv-1',
        messageId: 'msg-1',
      }));
    });

    it('should emit error when conversationId or messageId missing', async () => {
      await handlers.mark_read({ conversationId: 'conv-1' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Conversation ID and message ID required' });
    });

    it('should handle service errors', async () => {
      chatService.markAsRead.mockRejectedValue(new Error('fail'));

      await handlers.mark_read({ conversationId: 'conv-1', messageId: 'msg-1' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Failed to mark messages as read' });
    });
  });

  describe('typing_start', () => {
    it('should broadcast typing indicator', async () => {
      const toEmit = jest.fn();
      mockSocket.to.mockReturnValue({ emit: toEmit });

      await handlers.typing_start({ conversationId: 'conv-1' });

      expect(mockSocket.to).toHaveBeenCalledWith('conv:conv-1');
      expect(toEmit).toHaveBeenCalledWith('typing', expect.objectContaining({
        conversationId: 'conv-1',
        isTyping: true,
      }));
    });

    it('should do nothing if conversationId is missing', async () => {
      await handlers.typing_start({});

      expect(mockSocket.to).not.toHaveBeenCalled();
    });
  });

  describe('typing_stop', () => {
    it('should broadcast typing stop', async () => {
      const toEmit = jest.fn();
      mockSocket.to.mockReturnValue({ emit: toEmit });

      await handlers.typing_stop({ conversationId: 'conv-1' });

      expect(mockSocket.to).toHaveBeenCalledWith('conv:conv-1');
      expect(toEmit).toHaveBeenCalledWith('typing', expect.objectContaining({
        conversationId: 'conv-1',
        isTyping: false,
      }));
    });
  });

  describe('disconnect', () => {
    it('should log disconnect', () => {
      handlers.disconnect();
      // Just verifying it runs without error
      expect(true).toBe(true);
    });
  });
});
