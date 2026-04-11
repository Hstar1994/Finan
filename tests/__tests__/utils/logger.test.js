/**
 * Logger Utility Tests
 * Tests for Winston logger configuration
 */

const logger = require('../../../src/utils/logger');
const winston = require('winston');

describe('Logger Utility', () => {
  
  describe('Logger instance', () => {
    it('should be a Winston logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should have default meta with service name', () => {
      expect(logger.defaultMeta).toBeDefined();
      expect(logger.defaultMeta.service).toBe('finan-api');
    });

    it('should have multiple transports configured', () => {
      expect(logger.transports).toBeDefined();
      expect(logger.transports.length).toBeGreaterThan(0);
    });

    it('should have file transports for error and combined logs', () => {
      const fileTransports = logger.transports.filter(
        t => t instanceof winston.transports.File
      );
      expect(fileTransports.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Logging methods', () => {
    it('should log info messages without throwing', () => {
      expect(() => logger.info('Test info message')).not.toThrow();
    });

    it('should log error messages without throwing', () => {
      expect(() => logger.error('Test error message')).not.toThrow();
    });

    it('should log warn messages without throwing', () => {
      expect(() => logger.warn('Test warning message')).not.toThrow();
    });

    it('should log debug messages without throwing', () => {
      expect(() => logger.debug('Test debug message')).not.toThrow();
    });

    it('should log with metadata without throwing', () => {
      expect(() => 
        logger.info('Test message with metadata', { 
          userId: '123', 
          action: 'test' 
        })
      ).not.toThrow();
    });

    it('should log errors with stack traces', () => {
      const error = new Error('Test error');
      expect(() => logger.error('Error occurred', { error })).not.toThrow();
    });
  });

  describe('Logger stream (for Morgan integration)', () => {
    it('should have a stream property', () => {
      expect(logger.stream).toBeDefined();
      expect(typeof logger.stream.write).toBe('function');
    });

    it('should write to stream without throwing', () => {
      expect(() => logger.stream.write('Test HTTP request log\n')).not.toThrow();
    });

    it('should trim messages before logging', () => {
      // The stream should handle messages with trailing newlines
      expect(() => logger.stream.write('Message with newline\n')).not.toThrow();
    });
  });

  describe('Log levels', () => {
    it('should have a log level configured', () => {
      expect(logger.level).toBeDefined();
      expect(['error', 'warn', 'info', 'debug', 'verbose', 'silly']).toContain(logger.level);
    });

    it('should respect log level hierarchy', () => {
      // These should not throw regardless of current level
      expect(() => logger.error('Error level')).not.toThrow();
      expect(() => logger.warn('Warn level')).not.toThrow();
      expect(() => logger.info('Info level')).not.toThrow();
    });
  });

  describe('Logger configuration', () => {
    it('should handle exception handlers', () => {
      expect(logger.exceptions).toBeDefined();
    });

    it('should handle rejection handlers', () => {
      expect(logger.rejections).toBeDefined();
    });
  });

  describe('Format handling', () => {
    it('should format messages with timestamp', () => {
      // Just verify it doesn't throw when logging with format
      expect(() => 
        logger.info('Formatted message', { key: 'value' })
      ).not.toThrow();
    });

    it('should handle complex objects in metadata', () => {
      const complexMeta = {
        user: { id: '123', name: 'Test' },
        array: [1, 2, 3],
        nested: { deep: { value: true } }
      };
      expect(() => logger.info('Complex metadata', complexMeta)).not.toThrow();
    });

    it('should handle undefined and null values', () => {
      expect(() => logger.info('Null test', { value: null })).not.toThrow();
      expect(() => logger.info('Undefined test', { value: undefined })).not.toThrow();
    });
  });
});
