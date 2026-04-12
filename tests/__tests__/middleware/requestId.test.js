/**
 * Request ID Middleware Tests
 */

const {
  requestIdMiddleware,
  generateRequestId,
  getRequestContext,
  REQUEST_ID_HEADER,
} = require('../../../src/middleware/requestId');

describe('Request ID Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      get: jest.fn(),
      method: 'GET',
      path: '/api/v1/test',
      ip: '127.0.0.1',
      user: { id: 'user-1' },
      connection: { remoteAddress: '127.0.0.1' },
    };

    mockRes = {
      setHeader: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('REQUEST_ID_HEADER', () => {
    it('should be X-Request-ID', () => {
      expect(REQUEST_ID_HEADER).toBe('X-Request-ID');
    });
  });

  describe('generateRequestId', () => {
    it('should return a string', () => {
      const id = generateRequestId();
      expect(typeof id).toBe('string');
    });

    it('should return a UUID format', () => {
      const id = generateRequestId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });

    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('requestIdMiddleware', () => {
    it('should generate a new request ID when none provided', () => {
      mockReq.get.mockReturnValue(undefined);

      requestIdMiddleware(mockReq, mockRes, mockNext);

      expect(mockReq.requestId).toBeDefined();
      expect(typeof mockReq.requestId).toBe('string');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use existing X-Request-ID header if present', () => {
      const existingId = 'existing-request-id-123';
      mockReq.get.mockReturnValue(existingId);

      requestIdMiddleware(mockReq, mockRes, mockNext);

      expect(mockReq.requestId).toBe(existingId);
    });

    it('should set request ID on response headers', () => {
      mockReq.get.mockReturnValue(undefined);

      requestIdMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', mockReq.requestId);
    });

    it('should set startTime on request', () => {
      mockReq.get.mockReturnValue(undefined);
      const before = Date.now();

      requestIdMiddleware(mockReq, mockRes, mockNext);

      const after = Date.now();
      expect(mockReq.startTime).toBeGreaterThanOrEqual(before);
      expect(mockReq.startTime).toBeLessThanOrEqual(after);
    });

    it('should call next()', () => {
      mockReq.get.mockReturnValue(undefined);

      requestIdMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('getRequestContext', () => {
    it('should return request context object', () => {
      mockReq.requestId = 'test-id-123';
      mockReq.startTime = Date.now() - 50;
      mockReq.get = jest.fn().mockReturnValue('Mozilla/5.0');

      const ctx = getRequestContext(mockReq);

      expect(ctx).toEqual(
        expect.objectContaining({
          requestId: 'test-id-123',
          method: 'GET',
          path: '/api/v1/test',
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          userId: 'user-1',
        })
      );
      expect(ctx.duration).toBeDefined();
      expect(ctx.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing user', () => {
      mockReq.user = undefined;
      mockReq.requestId = 'test-id';
      mockReq.get = jest.fn().mockReturnValue(undefined);

      const ctx = getRequestContext(mockReq);

      expect(ctx.userId).toBeUndefined();
    });

    it('should return undefined duration when startTime not set', () => {
      mockReq.requestId = 'test-id';
      mockReq.startTime = undefined;
      mockReq.get = jest.fn().mockReturnValue(undefined);

      const ctx = getRequestContext(mockReq);

      expect(ctx.duration).toBeUndefined();
    });

    it('should use connection.remoteAddress as IP fallback', () => {
      mockReq.requestId = 'test-id';
      mockReq.ip = undefined;
      mockReq.connection = { remoteAddress: '10.0.0.1' };
      mockReq.get = jest.fn().mockReturnValue(undefined);

      const ctx = getRequestContext(mockReq);

      expect(ctx.ip).toBe('10.0.0.1');
    });
  });
});
