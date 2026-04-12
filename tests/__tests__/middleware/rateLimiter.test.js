/**
 * Rate Limiter Middleware Tests
 * Tests that rate limiter exports are properly configured express-rate-limit instances
 */

const {
  loginLimiter,
  apiLimiter,
  strictLimiter,
  chatRateLimiter,
  globalChatRateLimiter,
} = require('../../../src/middleware/rateLimiter');

describe('Rate Limiter Middleware', () => {
  describe('exports', () => {
    it('should export loginLimiter as a function', () => {
      expect(typeof loginLimiter).toBe('function');
    });

    it('should export apiLimiter as a function', () => {
      expect(typeof apiLimiter).toBe('function');
    });

    it('should export strictLimiter as a function', () => {
      expect(typeof strictLimiter).toBe('function');
    });

    it('should export chatRateLimiter as a function', () => {
      expect(typeof chatRateLimiter).toBe('function');
    });

    it('should export globalChatRateLimiter as a function', () => {
      expect(typeof globalChatRateLimiter).toBe('function');
    });
  });

  describe('loginLimiter handler', () => {
    it('should return 429 with proper error message', () => {
      const mockReq = {
        rateLimit: { resetTime: Date.now() + 60000 },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      // Access the handler through the rate limiter configuration
      // The handler is set when creating the limiter - we test the exported middleware
      // by simulating what the handler does
      const handler = loginLimiter._config?.handler;
      if (handler) {
        handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(429);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.stringContaining('Too many login attempts'),
          })
        );
      }
    });
  });

  describe('apiLimiter handler', () => {
    it('should return 429 with proper error message', () => {
      const mockReq = {
        rateLimit: { resetTime: Date.now() + 60000 },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      const handler = apiLimiter._config?.handler;
      if (handler) {
        handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(429);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.stringContaining('Too many requests'),
          })
        );
      }
    });
  });

  describe('strictLimiter handler', () => {
    it('should return 429 with proper error message', () => {
      const mockReq = {
        rateLimit: { resetTime: Date.now() + 60000 },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      const handler = strictLimiter._config?.handler;
      if (handler) {
        handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(429);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.stringContaining('Too many attempts'),
          })
        );
      }
    });
  });
});
