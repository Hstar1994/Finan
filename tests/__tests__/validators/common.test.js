/**
 * Common Validators Tests
 */

// We need to mock express-validator's validationResult before requiring the module
const mockValidationResult = jest.fn();

jest.mock('express-validator', () => {
  const actual = jest.requireActual('express-validator');
  return {
    ...actual,
    validationResult: mockValidationResult,
  };
});

jest.mock('../../../src/utils/apiResponse', () => ({
  validationError: jest.fn((res, errors, msg) =>
    res.status(400).json({ success: false, message: msg, errors })
  ),
}));

const { handleValidationErrors, commonValidations } = require('../../../src/validators/common');
const ApiResponse = require('../../../src/utils/apiResponse');

describe('Common Validators', () => {
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('handleValidationErrors', () => {
    it('should call next() when there are no validation errors', () => {
      mockValidationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });

      handleValidationErrors({}, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(ApiResponse.validationError).not.toHaveBeenCalled();
    });

    it('should return validation errors when present', () => {
      const errors = [
        { path: 'email', msg: 'Invalid email', value: 'notanemail' },
      ];
      mockValidationResult.mockReturnValue({ isEmpty: () => false, array: () => errors });

      handleValidationErrors({}, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(ApiResponse.validationError).toHaveBeenCalledWith(
        mockRes,
        expect.arrayContaining([
          expect.objectContaining({ field: 'email', message: 'Invalid email' }),
        ]),
        'Validation failed'
      );
    });

    it('should map error fields correctly', () => {
      const errors = [
        { path: 'name', msg: 'Name is required', value: '' },
        { path: 'amount', msg: 'Must be positive', value: -5 },
      ];
      mockValidationResult.mockReturnValue({ isEmpty: () => false, array: () => errors });

      handleValidationErrors({}, mockRes, mockNext);

      expect(ApiResponse.validationError).toHaveBeenCalledWith(
        mockRes,
        expect.arrayContaining([
          { field: 'name', message: 'Name is required', value: '' },
          { field: 'amount', message: 'Must be positive', value: -5 },
        ]),
        'Validation failed'
      );
    });
  });

  describe('commonValidations', () => {
    describe('uuid', () => {
      it('should return a validator chain', () => {
        const chain = commonValidations.uuid('id');
        expect(chain).toBeDefined();
        expect(typeof chain.run).toBe('function');
      });
    });

    describe('pagination', () => {
      it('should return an array of validators', () => {
        const chains = commonValidations.pagination();
        expect(Array.isArray(chains)).toBe(true);
        expect(chains.length).toBe(2);
      });
    });

    describe('date', () => {
      it('should return a validator chain', () => {
        const chain = commonValidations.date('startDate');
        expect(chain).toBeDefined();
        expect(typeof chain.run).toBe('function');
      });

      it('should support optional flag', () => {
        const chain = commonValidations.date('endDate', true);
        expect(chain).toBeDefined();
      });
    });

    describe('positiveNumber', () => {
      it('should return a validator chain', () => {
        const chain = commonValidations.positiveNumber('amount');
        expect(chain).toBeDefined();
      });

      it('should support optional flag', () => {
        const chain = commonValidations.positiveNumber('discount', true);
        expect(chain).toBeDefined();
      });
    });

    describe('nonNegativeNumber', () => {
      it('should return a validator chain', () => {
        const chain = commonValidations.nonNegativeNumber('tax');
        expect(chain).toBeDefined();
      });
    });

    describe('string', () => {
      it('should return a validator chain', () => {
        const chain = commonValidations.string('name');
        expect(chain).toBeDefined();
      });

      it('should accept custom min/max length', () => {
        const chain = commonValidations.string('description', 5, 500);
        expect(chain).toBeDefined();
      });

      it('should support optional flag', () => {
        const chain = commonValidations.string('notes', 1, 1000, true);
        expect(chain).toBeDefined();
      });
    });

    describe('email', () => {
      it('should return a validator chain', () => {
        const chain = commonValidations.email('email');
        expect(chain).toBeDefined();
      });
    });

    describe('password', () => {
      it('should return a validator chain', () => {
        const chain = commonValidations.password('password');
        expect(chain).toBeDefined();
      });
    });
  });
});
