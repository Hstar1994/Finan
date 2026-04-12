/**
 * Socket Authentication Middleware Tests
 */

const jwt = require('jsonwebtoken');

jest.mock('../../../src/config', () => ({
  jwt: { secret: 'test-socket-secret' },
}));

jest.mock('../../../src/database/models', () => ({
  User: { findByPk: jest.fn() },
  Customer: { findByPk: jest.fn() },
}));

jest.mock('../../../src/utils/logger', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

const { User, Customer } = require('../../../src/database/models');
const { authenticateSocket } = require('../../../src/socket/middleware/auth');

describe('Socket Auth Middleware', () => {
  let mockSocket;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSocket = {
      handshake: {
        auth: {},
        query: {},
      },
    };

    mockNext = jest.fn();
  });

  it('should reject connections without a token', async () => {
    await authenticateSocket(mockSocket, mockNext);

    expect(mockNext).toHaveBeenCalledWith(new Error('Authentication token required'));
  });

  it('should accept token from handshake.auth', async () => {
    const token = jwt.sign({ id: 'user-1' }, 'test-socket-secret');
    mockSocket.handshake.auth.token = token;
    User.findByPk.mockResolvedValue({ id: 'user-1', role: 'admin', isActive: true });

    await authenticateSocket(mockSocket, mockNext);

    expect(mockSocket.actorType).toBe('staff');
    expect(mockSocket.userId).toBe('user-1');
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should accept token from handshake.query', async () => {
    const token = jwt.sign({ id: 'user-2' }, 'test-socket-secret');
    mockSocket.handshake.query.token = token;
    User.findByPk.mockResolvedValue({ id: 'user-2', role: 'user', isActive: true });

    await authenticateSocket(mockSocket, mockNext);

    expect(mockSocket.userId).toBe('user-2');
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should authenticate staff with decoded.id', async () => {
    const token = jwt.sign({ id: 'user-1' }, 'test-socket-secret');
    mockSocket.handshake.auth.token = token;
    User.findByPk.mockResolvedValue({ id: 'user-1', role: 'manager', isActive: true });

    await authenticateSocket(mockSocket, mockNext);

    expect(mockSocket.actorType).toBe('staff');
    expect(mockSocket.userId).toBe('user-1');
    expect(mockSocket.userRole).toBe('manager');
    expect(mockSocket.customerId).toBeNull();
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should authenticate staff with decoded.userId', async () => {
    const token = jwt.sign({ userId: 'user-3' }, 'test-socket-secret');
    mockSocket.handshake.auth.token = token;
    User.findByPk.mockResolvedValue({ id: 'user-3', role: 'admin', isActive: true });

    await authenticateSocket(mockSocket, mockNext);

    expect(mockSocket.actorType).toBe('staff');
    expect(mockSocket.userId).toBe('user-3');
  });

  it('should authenticate customers', async () => {
    const token = jwt.sign({ customerId: 'cust-1', type: 'customer' }, 'test-socket-secret');
    mockSocket.handshake.auth.token = token;
    Customer.findByPk.mockResolvedValue({ id: 'cust-1', authEnabled: true });

    await authenticateSocket(mockSocket, mockNext);

    expect(mockSocket.actorType).toBe('customer');
    expect(mockSocket.customerId).toBe('cust-1');
    expect(mockSocket.userId).toBeNull();
    expect(mockSocket.userRole).toBeNull();
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should reject if user not found', async () => {
    const token = jwt.sign({ id: 'ghost-user' }, 'test-socket-secret');
    mockSocket.handshake.auth.token = token;
    User.findByPk.mockResolvedValue(null);

    await authenticateSocket(mockSocket, mockNext);

    expect(mockNext).toHaveBeenCalledWith(new Error('User not found'));
  });

  it('should reject inactive user', async () => {
    const token = jwt.sign({ id: 'user-1' }, 'test-socket-secret');
    mockSocket.handshake.auth.token = token;
    User.findByPk.mockResolvedValue({ id: 'user-1', isActive: false });

    await authenticateSocket(mockSocket, mockNext);

    expect(mockNext).toHaveBeenCalledWith(new Error('User account is not active'));
  });

  it('should reject if customer not found', async () => {
    const token = jwt.sign({ customerId: 'cust-ghost', type: 'customer' }, 'test-socket-secret');
    mockSocket.handshake.auth.token = token;
    Customer.findByPk.mockResolvedValue(null);

    await authenticateSocket(mockSocket, mockNext);

    expect(mockNext).toHaveBeenCalledWith(new Error('Customer not found'));
  });

  it('should reject customer with auth disabled', async () => {
    const token = jwt.sign({ customerId: 'cust-1', type: 'customer' }, 'test-socket-secret');
    mockSocket.handshake.auth.token = token;
    Customer.findByPk.mockResolvedValue({ id: 'cust-1', authEnabled: false });

    await authenticateSocket(mockSocket, mockNext);

    expect(mockNext).toHaveBeenCalledWith(new Error('Customer authentication disabled'));
  });

  it('should reject invalid JWT token', async () => {
    mockSocket.handshake.auth.token = 'invalid-token';

    await authenticateSocket(mockSocket, mockNext);

    expect(mockNext).toHaveBeenCalledWith(new Error('Invalid authentication token'));
  });

  it('should reject expired JWT token', async () => {
    const token = jwt.sign({ id: 'user-1' }, 'test-socket-secret', { expiresIn: '-1s' });
    mockSocket.handshake.auth.token = token;

    await authenticateSocket(mockSocket, mockNext);

    expect(mockNext).toHaveBeenCalledWith(new Error('Authentication token expired'));
  });

  it('should handle DB errors', async () => {
    const token = jwt.sign({ id: 'user-1' }, 'test-socket-secret');
    mockSocket.handshake.auth.token = token;
    User.findByPk.mockRejectedValue(new Error('Connection lost'));

    await authenticateSocket(mockSocket, mockNext);

    expect(mockNext).toHaveBeenCalledWith(new Error('Authentication failed'));
  });
});
