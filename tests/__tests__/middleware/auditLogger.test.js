/**
 * Audit Logger Middleware Tests
 */

jest.mock('../../../src/database/models', () => ({
  AuditLog: {
    create: jest.fn(),
  },
}));

const { AuditLog } = require('../../../src/database/models');

// Import after mocking - the module uses module.exports = auditLogger (a function)
const auditLogger = require('../../../src/middleware/auditLogger');

describe('Audit Logger Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let originalJson;

  beforeEach(() => {
    jest.clearAllMocks();

    originalJson = jest.fn();

    mockReq = {
      method: 'POST',
      path: '/api/v1/invoices',
      body: { customerId: 'c1', amount: 100 },
      params: { id: 'entity-1' },
      query: {},
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest-test' },
      user: { id: 'user-1' },
      connection: { remoteAddress: '127.0.0.1' },
    };

    mockRes = {
      statusCode: 200,
      json: originalJson,
    };

    mockNext = jest.fn();
  });

  it('should be a function that returns middleware', () => {
    expect(typeof auditLogger).toBe('function');
    const middleware = auditLogger('CREATE', 'Invoice');
    expect(typeof middleware).toBe('function');
  });

  it('should call next() immediately', async () => {
    const middleware = auditLogger('CREATE', 'Invoice');
    await middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should wrap res.json', async () => {
    const middleware = auditLogger('CREATE', 'Invoice');
    await middleware(mockReq, mockRes, mockNext);

    // res.json should now be the wrapped version
    expect(mockRes.json).not.toBe(originalJson);
  });

  it('should log audit for successful 2xx responses', async () => {
    AuditLog.create.mockResolvedValue({});
    const middleware = auditLogger('CREATE', 'Invoice');
    await middleware(mockReq, mockRes, mockNext);

    // Now call res.json simulating a successful response
    mockRes.statusCode = 201;
    mockRes.json({ id: 'new-invoice-1' });

    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        action: 'CREATE',
        entity: 'Invoice',
        entityId: 'new-invoice-1',
        ipAddress: '127.0.0.1',
        userAgent: 'jest-test',
      })
    );
  });

  it('should NOT log audit for non-2xx responses', async () => {
    const middleware = auditLogger('CREATE', 'Invoice');
    await middleware(mockReq, mockRes, mockNext);

    mockRes.statusCode = 400;
    mockRes.json({ error: 'Bad request' });

    expect(AuditLog.create).not.toHaveBeenCalled();
  });

  it('should sanitize passwords from body', async () => {
    AuditLog.create.mockResolvedValue({});
    mockReq.body = { username: 'admin', password: 'secret123' };
    const middleware = auditLogger('LOGIN', 'Auth');
    await middleware(mockReq, mockRes, mockNext);

    mockRes.statusCode = 200;
    mockRes.json({ token: 'abc' });

    const logCall = AuditLog.create.mock.calls[0][0];
    expect(logCall.changes.body.password).toBe('[REDACTED]');
    expect(logCall.changes.body.username).toBe('admin');
  });

  it('should sanitize token fields', async () => {
    AuditLog.create.mockResolvedValue({});
    mockReq.body = { token: 'some-secret-token', data: 'ok' };
    const middleware = auditLogger('REFRESH', 'Auth');
    await middleware(mockReq, mockRes, mockNext);

    mockRes.statusCode = 200;
    mockRes.json({});

    const logCall = AuditLog.create.mock.calls[0][0];
    expect(logCall.changes.body.token).toBe('[REDACTED]');
    expect(logCall.changes.body.data).toBe('ok');
  });

  it('should handle nested sensitive fields', async () => {
    AuditLog.create.mockResolvedValue({});
    mockReq.body = { user: { email: 'a@b.com', password: 'secret' } };
    const middleware = auditLogger('UPDATE', 'User');
    await middleware(mockReq, mockRes, mockNext);

    mockRes.statusCode = 200;
    mockRes.json({});

    const logCall = AuditLog.create.mock.calls[0][0];
    expect(logCall.changes.body.user.password).toBe('[REDACTED]');
    expect(logCall.changes.body.user.email).toBe('a@b.com');
  });

  it('should use req.params.id as entityId fallback', async () => {
    AuditLog.create.mockResolvedValue({});
    const middleware = auditLogger('UPDATE', 'Invoice');
    await middleware(mockReq, mockRes, mockNext);

    mockRes.statusCode = 200;
    mockRes.json({ message: 'updated' }); // no .id in response

    const logCall = AuditLog.create.mock.calls[0][0];
    expect(logCall.entityId).toBe('entity-1');
  });

  it('should handle null user gracefully', async () => {
    AuditLog.create.mockResolvedValue({});
    mockReq.user = undefined;
    const middleware = auditLogger('VIEW', 'Public');
    await middleware(mockReq, mockRes, mockNext);

    mockRes.statusCode = 200;
    mockRes.json({});

    const logCall = AuditLog.create.mock.calls[0][0];
    expect(logCall.userId).toBeNull();
  });

  it('should not block response on audit log failure', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    AuditLog.create.mockRejectedValue(new Error('DB failure'));

    const middleware = auditLogger('CREATE', 'Invoice');
    await middleware(mockReq, mockRes, mockNext);

    mockRes.statusCode = 200;
    const result = mockRes.json({ id: 'x' });

    // Should still call original json
    expect(originalJson).toHaveBeenCalledWith({ id: 'x' });

    // Wait a tick for the rejected promise
    await new Promise(resolve => setImmediate(resolve));
    expect(consoleError).toHaveBeenCalledWith('Failed to create audit log:', expect.any(Error));
    consoleError.mockRestore();
  });

  it('should handle non-object data in sanitizeData', async () => {
    AuditLog.create.mockResolvedValue({});
    mockReq.body = 'plain-string';
    const middleware = auditLogger('TEST', 'Test');
    await middleware(mockReq, mockRes, mockNext);

    mockRes.statusCode = 200;
    mockRes.json({});

    const logCall = AuditLog.create.mock.calls[0][0];
    expect(logCall.changes.body).toBe('plain-string');
  });

  it('should handle null data in sanitizeData', async () => {
    AuditLog.create.mockResolvedValue({});
    mockReq.body = null;
    const middleware = auditLogger('TEST', 'Test');
    await middleware(mockReq, mockRes, mockNext);

    mockRes.statusCode = 200;
    mockRes.json({});

    const logCall = AuditLog.create.mock.calls[0][0];
    expect(logCall.changes.body).toBeNull();
  });
});
