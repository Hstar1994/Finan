/**
 * Customers Controller Tests
 * Tests for customer CRUD operations
 */

const {
  getAll,
  getById,
  create,
  update,
  remove,
  updateBalance,
} = require('../../../src/modules/customers/controller');

// Mock dependencies
jest.mock('../../../src/database/models', () => ({
  Customer: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
}));

const { Customer } = require('../../../src/database/models');

describe('Customers Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      query: {},
      params: {},
      body: {},
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    
    mockNext = jest.fn();
  });

  describe('getAll', () => {
    it('should return paginated customers', async () => {
      const mockCustomers = [
        { id: 1, name: 'Customer 1', email: 'c1@test.com' },
        { id: 2, name: 'Customer 2', email: 'c2@test.com' },
      ];
      
      Customer.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockCustomers,
      });
      
      mockReq.query = { page: '1', limit: '10' };
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(Customer.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
          order: [['createdAt', 'DESC']],
        })
      );
      
      expect(mockRes.json).toHaveBeenCalledWith({
        customers: mockCustomers,
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });

    it('should use default pagination if not provided', async () => {
      Customer.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: [],
      });
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(Customer.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
        })
      );
    });

    it('should filter by search query', async () => {
      Customer.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: [],
      });
      
      mockReq.query = { search: 'test' };
      
      await getAll(mockReq, mockRes, mockNext);
      
      // Verify the call was made with a where clause containing Op.or (Symbol)
      expect(Customer.findAndCountAll).toHaveBeenCalled();
      const callArgs = Customer.findAndCountAll.mock.calls[0][0];
      expect(callArgs.where).toBeDefined();
      // Check that the where clause has a Symbol key (Op.or)
      const symbolKeys = Object.getOwnPropertySymbols(callArgs.where);
      expect(symbolKeys.length).toBeGreaterThan(0);
    });

    it('should filter by isActive status', async () => {
      Customer.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: [],
      });
      
      mockReq.query = { isActive: 'true' };
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(Customer.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should filter by isActive=false', async () => {
      Customer.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: [],
      });
      
      mockReq.query = { isActive: 'false' };
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(Customer.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: false,
          }),
        })
      );
    });

    it('should calculate correct offset for page 2', async () => {
      Customer.findAndCountAll.mockResolvedValue({
        count: 25,
        rows: [],
      });
      
      mockReq.query = { page: '2', limit: '10' };
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(Customer.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 10, // (2-1) * 10 = 10
        })
      );
    });

    it('should calculate correct totalPages', async () => {
      Customer.findAndCountAll.mockResolvedValue({
        count: 25,
        rows: [],
      });
      
      mockReq.query = { page: '1', limit: '10' };
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({
            totalPages: 3, // ceil(25/10) = 3
          }),
        })
      );
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      Customer.findAndCountAll.mockRejectedValue(error);
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getById', () => {
    it('should return customer by id', async () => {
      const mockCustomer = {
        id: 1,
        name: 'Test Customer',
        email: 'test@example.com',
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      mockReq.params.id = '1';
      
      await getById(mockReq, mockRes, mockNext);
      
      expect(Customer.findByPk).toHaveBeenCalledWith('1');
      expect(mockRes.json).toHaveBeenCalledWith({ customer: mockCustomer });
    });

    it('should return 404 if customer not found', async () => {
      Customer.findByPk.mockResolvedValue(null);
      mockReq.params.id = '999';
      
      await getById(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Customer not found' });
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      Customer.findByPk.mockRejectedValue(error);
      mockReq.params.id = '1';
      
      await getById(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('create', () => {
    it('should create customer successfully', async () => {
      const customerData = {
        name: 'New Customer',
        email: 'new@example.com',
        phone: '1234567890',
      };
      
      const mockCustomer = { id: 1, ...customerData };
      
      Customer.create.mockResolvedValue(mockCustomer);
      mockReq.body = customerData;
      
      await create(mockReq, mockRes, mockNext);
      
      expect(Customer.create).toHaveBeenCalledWith(customerData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Customer created successfully',
        customer: mockCustomer,
      });
    });

    it('should call next on error', async () => {
      const error = new Error('Validation error');
      Customer.create.mockRejectedValue(error);
      mockReq.body = { name: 'Test' };
      
      await create(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('update', () => {
    it('should update customer successfully', async () => {
      const mockCustomer = {
        id: 1,
        name: 'Old Name',
        update: jest.fn().mockResolvedValue(true),
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      mockReq.params.id = '1';
      mockReq.body = { name: 'New Name' };
      
      await update(mockReq, mockRes, mockNext);
      
      expect(mockCustomer.update).toHaveBeenCalledWith({ name: 'New Name' });
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Customer updated successfully',
        customer: mockCustomer,
      });
    });

    it('should return 404 if customer not found', async () => {
      Customer.findByPk.mockResolvedValue(null);
      mockReq.params.id = '999';
      mockReq.body = { name: 'New Name' };
      
      await update(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Customer not found' });
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      Customer.findByPk.mockRejectedValue(error);
      mockReq.params.id = '1';
      
      await update(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('remove', () => {
    it('should delete customer successfully', async () => {
      const mockCustomer = {
        id: 1,
        destroy: jest.fn().mockResolvedValue(true),
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      mockReq.params.id = '1';
      
      await remove(mockReq, mockRes, mockNext);
      
      expect(mockCustomer.destroy).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Customer deleted successfully' });
    });

    it('should return 404 if customer not found', async () => {
      Customer.findByPk.mockResolvedValue(null);
      mockReq.params.id = '999';
      
      await remove(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Customer not found' });
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      Customer.findByPk.mockRejectedValue(error);
      mockReq.params.id = '1';
      
      await remove(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateBalance', () => {
    it('should add to balance', async () => {
      const mockCustomer = {
        id: 1,
        balance: 100,
        save: jest.fn().mockResolvedValue(true),
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      mockReq.params.id = '1';
      mockReq.body = { amount: 50, operation: 'add' };
      
      await updateBalance(mockReq, mockRes, mockNext);
      
      expect(mockCustomer.balance).toBe(150);
      expect(mockCustomer.save).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Balance updated successfully',
        customer: mockCustomer,
      });
    });

    it('should subtract from balance', async () => {
      const mockCustomer = {
        id: 1,
        balance: 100,
        save: jest.fn().mockResolvedValue(true),
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      mockReq.params.id = '1';
      mockReq.body = { amount: 30, operation: 'subtract' };
      
      await updateBalance(mockReq, mockRes, mockNext);
      
      expect(mockCustomer.balance).toBe(70);
      expect(mockCustomer.save).toHaveBeenCalled();
    });

    it('should handle string balance correctly', async () => {
      const mockCustomer = {
        id: 1,
        balance: '100.50', // String from DB
        save: jest.fn().mockResolvedValue(true),
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      mockReq.params.id = '1';
      mockReq.body = { amount: '25.50', operation: 'add' };
      
      await updateBalance(mockReq, mockRes, mockNext);
      
      expect(mockCustomer.balance).toBe(126);
    });

    it('should return 400 for invalid operation', async () => {
      const mockCustomer = {
        id: 1,
        balance: 100,
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      mockReq.params.id = '1';
      mockReq.body = { amount: 50, operation: 'multiply' };
      
      await updateBalance(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid operation. Use "add" or "subtract"',
      });
    });

    it('should return 404 if customer not found', async () => {
      Customer.findByPk.mockResolvedValue(null);
      mockReq.params.id = '999';
      mockReq.body = { amount: 50, operation: 'add' };
      
      await updateBalance(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      Customer.findByPk.mockRejectedValue(error);
      mockReq.params.id = '1';
      mockReq.body = { amount: 50, operation: 'add' };
      
      await updateBalance(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
