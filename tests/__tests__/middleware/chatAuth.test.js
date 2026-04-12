/**
 * Chat Auth Middleware Tests
 */

const jwt = require('jsonwebtoken');

jest.mock('../../../src/config', () => ({
  jwt: { secret: 'test-secret-key' },
}));

jest.mock('../../../src/database/models', () => ({
  User: { findByPk: jest.fn() },
  Customer: { findByPk: jest.fn() },
  ChatConversation: { findByPk: jest.fn() },
  ChatParticipant: { findOne: jest.fn() },
}));

jest.mock('../../../src/utils/apiResponse', () => ({
  unauthorized: jest.fn((res, msg) => res.status(401).json({ success: false, message: msg })),
  forbidden: jest.fn((res, msg) => res.status(403).json({ success: false, message: msg })),
  notFound: jest.fn((res, msg) => res.status(404).json({ success: false, message: msg })),
}));

const { User, Customer, ChatConversation, ChatParticipant } = require('../../../src/database/models');
const ApiResponse = require('../../../src/utils/apiResponse');
const {
  authenticateChatUser,
  canAccessConversation,
  enforceConversationType,
  adminOrManagerOnly,
  staffOnly,
} = require('../../../src/middleware/chatAuth');

describe('Chat Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      headers: {},
      params: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('authenticateChatUser', () => {
    it('should reject requests without auth header', async () => {
      mockReq.headers = {};

      await authenticateChatUser(mockReq, mockRes, mockNext);

      expect(ApiResponse.unauthorized).toHaveBeenCalledWith(mockRes, 'No authentication token provided');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject non-Bearer tokens', async () => {
      mockReq.headers.authorization = 'Basic abc123';

      await authenticateChatUser(mockReq, mockRes, mockNext);

      expect(ApiResponse.unauthorized).toHaveBeenCalledWith(mockRes, 'No authentication token provided');
    });

    it('should authenticate staff users', async () => {
      const token = jwt.sign({ id: 'user-1', type: 'staff' }, 'test-secret-key');
      mockReq.headers.authorization = `Bearer ${token}`;
      User.findByPk.mockResolvedValue({ id: 'user-1', role: 'admin', isActive: true });

      await authenticateChatUser(mockReq, mockRes, mockNext);

      expect(mockReq.actorType).toBe('staff');
      expect(mockReq.userId).toBe('user-1');
      expect(mockReq.userRole).toBe('admin');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should authenticate customer users', async () => {
      const token = jwt.sign({ customerId: 'cust-1', type: 'customer' }, 'test-secret-key');
      mockReq.headers.authorization = `Bearer ${token}`;
      Customer.findByPk.mockResolvedValue({
        id: 'cust-1',
        isActive: true,
        authEnabled: true,
      });

      await authenticateChatUser(mockReq, mockRes, mockNext);

      expect(mockReq.actorType).toBe('customer');
      expect(mockReq.customerId).toBe('cust-1');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject inactive staff', async () => {
      const token = jwt.sign({ id: 'user-1' }, 'test-secret-key');
      mockReq.headers.authorization = `Bearer ${token}`;
      User.findByPk.mockResolvedValue({ id: 'user-1', isActive: false });

      await authenticateChatUser(mockReq, mockRes, mockNext);

      expect(ApiResponse.unauthorized).toHaveBeenCalledWith(mockRes, 'Invalid or inactive user account');
    });

    it('should reject non-existent staff', async () => {
      const token = jwt.sign({ id: 'user-1' }, 'test-secret-key');
      mockReq.headers.authorization = `Bearer ${token}`;
      User.findByPk.mockResolvedValue(null);

      await authenticateChatUser(mockReq, mockRes, mockNext);

      expect(ApiResponse.unauthorized).toHaveBeenCalledWith(mockRes, 'Invalid or inactive user account');
    });

    it('should reject inactive customer', async () => {
      const token = jwt.sign({ customerId: 'cust-1', type: 'customer' }, 'test-secret-key');
      mockReq.headers.authorization = `Bearer ${token}`;
      Customer.findByPk.mockResolvedValue({ id: 'cust-1', isActive: false, authEnabled: true });

      await authenticateChatUser(mockReq, mockRes, mockNext);

      expect(ApiResponse.unauthorized).toHaveBeenCalledWith(mockRes, 'Invalid or inactive customer account');
    });

    it('should reject customer without auth enabled', async () => {
      const token = jwt.sign({ customerId: 'cust-1', type: 'customer' }, 'test-secret-key');
      mockReq.headers.authorization = `Bearer ${token}`;
      Customer.findByPk.mockResolvedValue({ id: 'cust-1', isActive: true, authEnabled: false });

      await authenticateChatUser(mockReq, mockRes, mockNext);

      expect(ApiResponse.unauthorized).toHaveBeenCalledWith(mockRes, 'Invalid or inactive customer account');
    });

    it('should reject invalid JWT', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';

      await authenticateChatUser(mockReq, mockRes, mockNext);

      expect(ApiResponse.unauthorized).toHaveBeenCalledWith(mockRes, 'Invalid authentication token');
    });

    it('should reject expired JWT', async () => {
      const token = jwt.sign({ id: 'user-1' }, 'test-secret-key', { expiresIn: '-1s' });
      mockReq.headers.authorization = `Bearer ${token}`;

      await authenticateChatUser(mockReq, mockRes, mockNext);

      expect(ApiResponse.unauthorized).toHaveBeenCalledWith(mockRes, 'Authentication token has expired');
    });

    it('should handle DB errors gracefully', async () => {
      const token = jwt.sign({ id: 'user-1' }, 'test-secret-key');
      mockReq.headers.authorization = `Bearer ${token}`;
      User.findByPk.mockRejectedValue(new Error('DB error'));

      await authenticateChatUser(mockReq, mockRes, mockNext);

      expect(ApiResponse.unauthorized).toHaveBeenCalledWith(mockRes, 'Authentication failed');
    });
  });

  describe('canAccessConversation', () => {
    it('should allow staff participant', async () => {
      mockReq.actorType = 'staff';
      mockReq.userId = 'user-1';
      mockReq.params.id = 'conv-1';
      ChatParticipant.findOne.mockResolvedValue({ id: 'participant-1' });

      await canAccessConversation(mockReq, mockRes, mockNext);

      expect(ChatParticipant.findOne).toHaveBeenCalledWith({
        where: { conversationId: 'conv-1', leftAt: null, userId: 'user-1' },
      });
      expect(mockReq.participant).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow customer participant', async () => {
      mockReq.actorType = 'customer';
      mockReq.customerId = 'cust-1';
      mockReq.params.id = 'conv-1';
      ChatParticipant.findOne.mockResolvedValue({ id: 'participant-2' });

      await canAccessConversation(mockReq, mockRes, mockNext);

      expect(ChatParticipant.findOne).toHaveBeenCalledWith({
        where: { conversationId: 'conv-1', leftAt: null, customerId: 'cust-1' },
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject non-participant', async () => {
      mockReq.actorType = 'staff';
      mockReq.userId = 'user-1';
      mockReq.params.id = 'conv-1';
      ChatParticipant.findOne.mockResolvedValue(null);

      await canAccessConversation(mockReq, mockRes, mockNext);

      expect(ApiResponse.forbidden).toHaveBeenCalledWith(
        mockRes,
        'You are not a participant in this conversation'
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next(error) on DB failure', async () => {
      mockReq.actorType = 'staff';
      mockReq.userId = 'user-1';
      mockReq.params.id = 'conv-1';
      const error = new Error('DB error');
      ChatParticipant.findOne.mockRejectedValue(error);

      await canAccessConversation(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('enforceConversationType', () => {
    it('should allow staff to access any conversation type', async () => {
      mockReq.actorType = 'staff';
      mockReq.params.id = 'conv-1';
      ChatConversation.findByPk.mockResolvedValue({ type: 'STAFF_GROUP' });

      await enforceConversationType(mockReq, mockRes, mockNext);

      expect(mockReq.conversation).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow customer to access their CUSTOMER_DM', async () => {
      mockReq.actorType = 'customer';
      mockReq.customerId = 'cust-1';
      mockReq.params.id = 'conv-1';
      ChatConversation.findByPk.mockResolvedValue({
        type: 'CUSTOMER_DM',
        customerId: 'cust-1',
      });

      await enforceConversationType(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject customer accessing STAFF_GROUP', async () => {
      mockReq.actorType = 'customer';
      mockReq.customerId = 'cust-1';
      mockReq.params.id = 'conv-1';
      ChatConversation.findByPk.mockResolvedValue({ type: 'STAFF_GROUP' });

      await enforceConversationType(mockReq, mockRes, mockNext);

      expect(ApiResponse.forbidden).toHaveBeenCalledWith(
        mockRes,
        'Customers cannot access staff conversations'
      );
    });

    it('should reject customer accessing another customer DM', async () => {
      mockReq.actorType = 'customer';
      mockReq.customerId = 'cust-1';
      mockReq.params.id = 'conv-1';
      ChatConversation.findByPk.mockResolvedValue({
        type: 'CUSTOMER_DM',
        customerId: 'cust-2', // different customer
      });

      await enforceConversationType(mockReq, mockRes, mockNext);

      expect(ApiResponse.forbidden).toHaveBeenCalledWith(
        mockRes,
        "Cannot access another customer's conversation"
      );
    });

    it('should return 404 for non-existent conversation', async () => {
      mockReq.params.id = 'non-existent';
      ChatConversation.findByPk.mockResolvedValue(null);

      await enforceConversationType(mockReq, mockRes, mockNext);

      expect(ApiResponse.notFound).toHaveBeenCalledWith(mockRes, 'Conversation not found');
    });

    it('should call next(error) on DB failure', async () => {
      mockReq.params.id = 'conv-1';
      const error = new Error('DB error');
      ChatConversation.findByPk.mockRejectedValue(error);

      await enforceConversationType(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('adminOrManagerOnly', () => {
    it('should allow admin staff', () => {
      mockReq.actorType = 'staff';
      mockReq.userRole = 'admin';

      adminOrManagerOnly(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow manager staff', () => {
      mockReq.actorType = 'staff';
      mockReq.userRole = 'manager';

      adminOrManagerOnly(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject regular user staff', () => {
      mockReq.actorType = 'staff';
      mockReq.userRole = 'user';

      adminOrManagerOnly(mockReq, mockRes, mockNext);

      expect(ApiResponse.forbidden).toHaveBeenCalledWith(
        mockRes,
        'Only Admin and Manager can perform this action'
      );
    });

    it('should reject customers', () => {
      mockReq.actorType = 'customer';

      adminOrManagerOnly(mockReq, mockRes, mockNext);

      expect(ApiResponse.forbidden).toHaveBeenCalledWith(mockRes, 'Staff access only');
    });
  });

  describe('staffOnly', () => {
    it('should allow staff', () => {
      mockReq.actorType = 'staff';

      staffOnly(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject customers', () => {
      mockReq.actorType = 'customer';

      staffOnly(mockReq, mockRes, mockNext);

      expect(ApiResponse.forbidden).toHaveBeenCalledWith(mockRes, 'Staff access only');
    });
  });
});
