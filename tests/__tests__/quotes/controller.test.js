/**
 * Quotes Controller Tests
 * Tests for quote CRUD operations
 */

const {
  getAll,
  getById,
  create,
  update,
  remove,
} = require('../../../src/modules/quotes/controller');

// Mock dependencies
jest.mock('../../../src/database/models', () => ({
  Quote: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  QuoteItem: {
    create: jest.fn(),
  },
  Customer: {},
  Item: {},
}));

const { Quote, QuoteItem } = require('../../../src/database/models');

describe('Quotes Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      query: {},
      params: {},
      body: {},
      user: { id: 'user-uuid-1', role: 'admin' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getAll', () => {
    it('should return paginated quotes', async () => {
      const mockQuotes = [
        { id: '1', quoteNumber: 'QUO-000001', status: 'draft' },
        { id: '2', quoteNumber: 'QUO-000002', status: 'sent' },
      ];

      Quote.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockQuotes,
      });

      mockReq.query = { page: '1', limit: '10' };

      await getAll(mockReq, mockRes, mockNext);

      expect(Quote.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
          order: [['createdAt', 'DESC']],
        })
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        quotes: mockQuotes,
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });

    it('should filter by status', async () => {
      Quote.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      mockReq.query = { status: 'draft' };

      await getAll(mockReq, mockRes, mockNext);

      expect(Quote.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'draft' }),
        })
      );
    });

    it('should filter by customerId', async () => {
      Quote.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      mockReq.query = { customerId: 'customer-uuid' };

      await getAll(mockReq, mockRes, mockNext);

      expect(Quote.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ customerId: 'customer-uuid' }),
        })
      );
    });

    it('should apply default pagination', async () => {
      Quote.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await getAll(mockReq, mockRes, mockNext);

      expect(Quote.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
        })
      );
    });

    it('should call next on error', async () => {
      const error = new Error('DB error');
      Quote.findAndCountAll.mockRejectedValue(error);

      await getAll(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getById', () => {
    it('should return a quote by id', async () => {
      const mockQuote = { id: '1', quoteNumber: 'QUO-000001' };
      Quote.findByPk.mockResolvedValue(mockQuote);
      mockReq.params.id = '1';

      await getById(mockReq, mockRes, mockNext);

      expect(Quote.findByPk).toHaveBeenCalledWith('1', expect.any(Object));
      expect(mockRes.json).toHaveBeenCalledWith({ quote: mockQuote });
    });

    it('should return 404 if quote not found', async () => {
      Quote.findByPk.mockResolvedValue(null);
      mockReq.params.id = 'non-existent';

      await getById(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Quote not found' });
    });

    it('should call next on error', async () => {
      const error = new Error('DB error');
      Quote.findByPk.mockRejectedValue(error);
      mockReq.params.id = '1';

      await getById(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('create', () => {
    const validBody = {
      customerId: 'customer-uuid',
      expiryDate: '2026-12-31',
      items: [
        { itemId: 'item-1', quantity: 2, unitPrice: 100, taxRate: 10, description: 'Test item' },
      ],
      notes: 'Test notes',
      terms: 'Net 30',
    };

    it('should create a quote with valid data', async () => {
      Quote.count.mockResolvedValue(5);
      const mockQuote = {
        id: 'quote-uuid',
        quoteNumber: 'QUO-000006',
        toJSON: () => ({ id: 'quote-uuid', quoteNumber: 'QUO-000006' }),
      };
      Quote.create.mockResolvedValue(mockQuote);

      const mockQuoteItem = { id: 'qi-1', quoteId: 'quote-uuid' };
      QuoteItem.create.mockResolvedValue(mockQuoteItem);

      mockReq.body = { ...validBody };

      await create(mockReq, mockRes, mockNext);

      expect(Quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          quoteNumber: 'QUO-000006',
          customerId: 'customer-uuid',
          createdBy: 'user-uuid-1',
        })
      );

      expect(QuoteItem.create).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Quote created successfully',
        })
      );
    });

    it('should calculate subtotal and tax correctly', async () => {
      Quote.count.mockResolvedValue(0);
      const mockQuote = {
        id: 'quote-uuid',
        toJSON: () => ({ id: 'quote-uuid' }),
      };
      Quote.create.mockResolvedValue(mockQuote);
      QuoteItem.create.mockResolvedValue({});

      mockReq.body = {
        customerId: 'c1',
        expiryDate: '2026-12-31',
        items: [
          { itemId: 'i1', quantity: 3, unitPrice: 100, taxRate: 10 },
          { itemId: 'i2', quantity: 1, unitPrice: 50, taxRate: 0 },
        ],
      };

      await create(mockReq, mockRes, mockNext);

      // subtotal: 300 + 50 = 350; tax: 30 + 0 = 30; total: 380
      expect(Quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: 350,
          taxAmount: 30,
          totalAmount: 380,
        })
      );
    });

    it('should return 400 if customerId missing', async () => {
      mockReq.body = { expiryDate: '2026-12-31', items: [{ quantity: 1 }] };

      await create(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should return 400 if expiryDate missing', async () => {
      mockReq.body = { customerId: 'c1', items: [{ quantity: 1 }] };

      await create(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if items empty', async () => {
      mockReq.body = { customerId: 'c1', expiryDate: '2026-12-31', items: [] };

      await create(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if items missing', async () => {
      mockReq.body = { customerId: 'c1', expiryDate: '2026-12-31' };

      await create(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle items with no taxRate (default 0)', async () => {
      Quote.count.mockResolvedValue(0);
      const mockQuote = {
        id: 'q1',
        toJSON: () => ({ id: 'q1' }),
      };
      Quote.create.mockResolvedValue(mockQuote);
      QuoteItem.create.mockResolvedValue({});

      mockReq.body = {
        customerId: 'c1',
        expiryDate: '2026-12-31',
        items: [{ itemId: 'i1', quantity: 2, unitPrice: 50 }],
      };

      await create(mockReq, mockRes, mockNext);

      expect(Quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: 100,
          taxAmount: 0,
          totalAmount: 100,
        })
      );
    });

    it('should call next on error', async () => {
      Quote.count.mockRejectedValue(new Error('DB error'));
      mockReq.body = { ...validBody };

      await create(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('update', () => {
    it('should update an existing quote', async () => {
      const mockQuote = {
        id: '1',
        update: jest.fn().mockResolvedValue(true),
      };
      Quote.findByPk.mockResolvedValue(mockQuote);
      mockReq.params.id = '1';
      mockReq.body = { status: 'sent' };

      await update(mockReq, mockRes, mockNext);

      expect(mockQuote.update).toHaveBeenCalledWith({ status: 'sent' });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Quote updated successfully' })
      );
    });

    it('should return 404 if quote not found', async () => {
      Quote.findByPk.mockResolvedValue(null);
      mockReq.params.id = 'non-existent';

      await update(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Quote not found' });
    });

    it('should call next on error', async () => {
      Quote.findByPk.mockRejectedValue(new Error('DB error'));
      mockReq.params.id = '1';

      await update(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('remove', () => {
    it('should delete an existing quote', async () => {
      const mockQuote = {
        id: '1',
        destroy: jest.fn().mockResolvedValue(true),
      };
      Quote.findByPk.mockResolvedValue(mockQuote);
      mockReq.params.id = '1';

      await remove(mockReq, mockRes, mockNext);

      expect(mockQuote.destroy).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Quote deleted successfully' });
    });

    it('should return 404 if quote not found', async () => {
      Quote.findByPk.mockResolvedValue(null);
      mockReq.params.id = 'non-existent';

      await remove(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Quote not found' });
    });

    it('should call next on error', async () => {
      Quote.findByPk.mockRejectedValue(new Error('DB error'));
      mockReq.params.id = '1';

      await remove(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
