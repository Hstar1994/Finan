/**
 * Items Controller Tests
 * Tests for item CRUD operations
 */

const {
  getAll,
  getById,
  create,
  update,
  remove,
} = require('../../../src/modules/items/controller');

// Mock dependencies
jest.mock('../../../src/database/models', () => ({
  Item: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
}));

const { Item } = require('../../../src/database/models');

describe('Items Controller', () => {
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
    it('should return paginated items', async () => {
      const mockItems = [
        { id: 1, name: 'Item 1', sku: 'SKU001' },
        { id: 2, name: 'Item 2', sku: 'SKU002' },
      ];
      
      Item.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockItems,
      });
      
      mockReq.query = { page: '1', limit: '10' };
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(Item.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
          order: [['createdAt', 'DESC']],
        })
      );
      
      expect(mockRes.json).toHaveBeenCalledWith({
        items: mockItems,
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });

    it('should filter by search query', async () => {
      Item.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: [],
      });
      
      mockReq.query = { search: 'test' };
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(Item.findAndCountAll).toHaveBeenCalled();
      const callArgs = Item.findAndCountAll.mock.calls[0][0];
      expect(callArgs.where).toBeDefined();
      const symbolKeys = Object.getOwnPropertySymbols(callArgs.where);
      expect(symbolKeys.length).toBeGreaterThan(0);
    });

    it('should filter by category', async () => {
      Item.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: [],
      });
      
      mockReq.query = { category: 'Electronics' };
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(Item.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: 'Electronics' },
        })
      );
    });

    it('should filter by isActive', async () => {
      Item.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: [],
      });
      
      mockReq.query = { isActive: 'true' };
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(Item.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        })
      );
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      Item.findAndCountAll.mockRejectedValue(error);
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getById', () => {
    it('should return item by id', async () => {
      const mockItem = {
        id: 1,
        name: 'Test Item',
        sku: 'SKU001',
      };
      
      Item.findByPk.mockResolvedValue(mockItem);
      mockReq.params.id = '1';
      
      await getById(mockReq, mockRes, mockNext);
      
      expect(Item.findByPk).toHaveBeenCalledWith('1');
      expect(mockRes.json).toHaveBeenCalledWith({ item: mockItem });
    });

    it('should return 404 if item not found', async () => {
      Item.findByPk.mockResolvedValue(null);
      mockReq.params.id = '999';
      
      await getById(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Item not found' });
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      Item.findByPk.mockRejectedValue(error);
      mockReq.params.id = '1';
      
      await getById(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('create', () => {
    it('should create item successfully', async () => {
      const itemData = {
        name: 'New Item',
        sku: 'SKU003',
        price: 99.99,
      };
      
      const mockItem = { id: 1, ...itemData };
      
      Item.create.mockResolvedValue(mockItem);
      mockReq.body = itemData;
      
      await create(mockReq, mockRes, mockNext);
      
      expect(Item.create).toHaveBeenCalledWith(itemData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Item created successfully',
        item: mockItem,
      });
    });

    it('should call next on error', async () => {
      const error = new Error('Validation error');
      Item.create.mockRejectedValue(error);
      mockReq.body = { name: 'Test' };
      
      await create(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('update', () => {
    it('should update item successfully', async () => {
      const mockItem = {
        id: 1,
        name: 'Old Name',
        update: jest.fn().mockResolvedValue(true),
      };
      
      Item.findByPk.mockResolvedValue(mockItem);
      mockReq.params.id = '1';
      mockReq.body = { name: 'New Name' };
      
      await update(mockReq, mockRes, mockNext);
      
      expect(mockItem.update).toHaveBeenCalledWith({ name: 'New Name' });
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Item updated successfully',
        item: mockItem,
      });
    });

    it('should return 404 if item not found', async () => {
      Item.findByPk.mockResolvedValue(null);
      mockReq.params.id = '999';
      mockReq.body = { name: 'New Name' };
      
      await update(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Item not found' });
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      Item.findByPk.mockRejectedValue(error);
      mockReq.params.id = '1';
      
      await update(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('remove', () => {
    it('should delete item successfully', async () => {
      const mockItem = {
        id: 1,
        destroy: jest.fn().mockResolvedValue(true),
      };
      
      Item.findByPk.mockResolvedValue(mockItem);
      mockReq.params.id = '1';
      
      await remove(mockReq, mockRes, mockNext);
      
      expect(mockItem.destroy).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Item deleted successfully' });
    });

    it('should return 404 if item not found', async () => {
      Item.findByPk.mockResolvedValue(null);
      mockReq.params.id = '999';
      
      await remove(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Item not found' });
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      Item.findByPk.mockRejectedValue(error);
      mockReq.params.id = '1';
      
      await remove(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
