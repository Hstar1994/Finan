/**
 * Credit Notes Controller Tests
 */

jest.mock('../../../src/database/models', () => ({
  CreditNote: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  CreditNoteItem: {
    create: jest.fn(),
  },
  Customer: {},
  Invoice: {},
  Item: {},
}));

const { CreditNote, CreditNoteItem } = require('../../../src/database/models');
const {
  getAll,
  getById,
  create,
  update,
  remove,
} = require('../../../src/modules/creditNotes/controller');

describe('Credit Notes Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      query: {},
      params: {},
      body: {},
      user: { id: 'user-1' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getAll', () => {
    it('should return paginated credit notes', async () => {
      const rows = [{ id: '1', creditNoteNumber: 'CN-000001' }];
      CreditNote.findAndCountAll.mockResolvedValue({ count: 1, rows });

      await getAll(mockReq, mockRes, mockNext);

      expect(CreditNote.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 0 })
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        creditNotes: rows,
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
    });

    it('should filter by status', async () => {
      CreditNote.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      mockReq.query = { status: 'draft' };

      await getAll(mockReq, mockRes, mockNext);

      expect(CreditNote.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'draft' }) })
      );
    });

    it('should filter by customerId', async () => {
      CreditNote.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      mockReq.query = { customerId: 'c1' };

      await getAll(mockReq, mockRes, mockNext);

      expect(CreditNote.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ customerId: 'c1' }) })
      );
    });

    it('should call next on error', async () => {
      CreditNote.findAndCountAll.mockRejectedValue(new Error('DB error'));
      await getAll(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getById', () => {
    it('should return a credit note by id', async () => {
      const cn = { id: '1', creditNoteNumber: 'CN-000001' };
      CreditNote.findByPk.mockResolvedValue(cn);
      mockReq.params.id = '1';

      await getById(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ creditNote: cn });
    });

    it('should return 404 when not found', async () => {
      CreditNote.findByPk.mockResolvedValue(null);
      mockReq.params.id = 'bad-id';

      await getById(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Credit note not found' });
    });

    it('should call next on error', async () => {
      CreditNote.findByPk.mockRejectedValue(new Error('DB error'));
      mockReq.params.id = '1';
      await getById(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('create', () => {
    const validBody = {
      customerId: 'c1',
      items: [{ itemId: 'i1', quantity: 2, unitPrice: 50, taxRate: 10 }],
      reason: 'Return',
    };

    it('should create a credit note', async () => {
      CreditNote.count.mockResolvedValue(0);
      const mockCN = {
        id: 'cn-1',
        toJSON: () => ({ id: 'cn-1' }),
      };
      CreditNote.create.mockResolvedValue(mockCN);
      CreditNoteItem.create.mockResolvedValue({});
      mockReq.body = { ...validBody };

      await create(mockReq, mockRes, mockNext);

      expect(CreditNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          creditNoteNumber: 'CN-000001',
          customerId: 'c1',
          subtotal: 100,
          taxAmount: 10,
          totalAmount: 110,
          createdBy: 'user-1',
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when customerId missing', async () => {
      mockReq.body = { items: [{ quantity: 1 }] };
      await create(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when items empty', async () => {
      mockReq.body = { customerId: 'c1', items: [] };
      await create(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when items missing', async () => {
      mockReq.body = { customerId: 'c1' };
      await create(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should default taxRate to 0', async () => {
      CreditNote.count.mockResolvedValue(0);
      const mockCN = { id: 'cn-1', toJSON: () => ({ id: 'cn-1' }) };
      CreditNote.create.mockResolvedValue(mockCN);
      CreditNoteItem.create.mockResolvedValue({});
      mockReq.body = { customerId: 'c1', items: [{ itemId: 'i1', quantity: 1, unitPrice: 100 }] };

      await create(mockReq, mockRes, mockNext);

      expect(CreditNote.create).toHaveBeenCalledWith(
        expect.objectContaining({ taxAmount: 0, totalAmount: 100 })
      );
    });

    it('should call next on error', async () => {
      CreditNote.count.mockRejectedValue(new Error('DB error'));
      mockReq.body = { ...validBody };
      await create(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('update', () => {
    it('should update an existing credit note', async () => {
      const cn = { id: '1', update: jest.fn().mockResolvedValue(true) };
      CreditNote.findByPk.mockResolvedValue(cn);
      mockReq.params.id = '1';
      mockReq.body = { status: 'issued' };

      await update(mockReq, mockRes, mockNext);

      expect(cn.update).toHaveBeenCalledWith({ status: 'issued' });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Credit note updated successfully' })
      );
    });

    it('should return 404 when not found', async () => {
      CreditNote.findByPk.mockResolvedValue(null);
      mockReq.params.id = 'bad';

      await update(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should call next on error', async () => {
      CreditNote.findByPk.mockRejectedValue(new Error('DB error'));
      mockReq.params.id = '1';
      await update(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('remove', () => {
    it('should delete an existing credit note', async () => {
      const cn = { id: '1', destroy: jest.fn().mockResolvedValue(true) };
      CreditNote.findByPk.mockResolvedValue(cn);
      mockReq.params.id = '1';

      await remove(mockReq, mockRes, mockNext);

      expect(cn.destroy).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Credit note deleted successfully' });
    });

    it('should return 404 when not found', async () => {
      CreditNote.findByPk.mockResolvedValue(null);
      mockReq.params.id = 'bad';

      await remove(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Credit note not found' });
    });

    it('should call next on error', async () => {
      CreditNote.findByPk.mockRejectedValue(new Error('DB error'));
      mockReq.params.id = '1';
      await remove(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
