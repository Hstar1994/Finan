/**
 * Credit Notes Controller Tests
 */

jest.mock('../../../src/modules/creditNotes/service');

const creditNoteService = require('../../../src/modules/creditNotes/service');
const {
  getAll,
  getById,
  create,
  update,
  applyCreditToInvoice,
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
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getAll', () => {
    it('should fetch all credit notes with pagination', async () => {
      const result = {
        crediteNotes: [{ id: '1', creditNoteNumber: 'CN-000001' }],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 }
      };
      creditNoteService.getAllCreditNotes.mockResolvedValue(result);

      await getAll(mockReq, mockRes, mockNext);

      expect(creditNoteService.getAllCreditNotes).toHaveBeenCalledWith(1, 10, {});
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      creditNoteService.getAllCreditNotes.mockResolvedValue({ crediteNotes: [], pagination: {} });
      mockReq.query = { status: 'draft', page: 1, limit: 10 };

      await getAll(mockReq, mockRes, mockNext);

      expect(creditNoteService.getAllCreditNotes).toHaveBeenCalledWith(
        1,
        10,
        { status: 'draft' }
      );
    });

    it('should call next on error', async () => {
      creditNoteService.getAllCreditNotes.mockRejectedValue(new Error('Service error'));
      await getAll(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getById', () => {
    it('should fetch a credit note by id', async () => {
      const cn = { id: '1', creditNoteNumber: 'CN-000001' };
      creditNoteService.getCreditNoteById.mockResolvedValue(cn);
      mockReq.params.id = '1';

      await getById(mockReq, mockRes, mockNext);

      expect(creditNoteService.getCreditNoteById).toHaveBeenCalledWith('1');
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should handle not found error', async () => {
      creditNoteService.getCreditNoteById.mockRejectedValue(new Error('not found'));
      mockReq.params.id = 'bad-id';

      await getById(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const validBody = {
      customerId: 'c1',
      items: [{ quantity: 2, unitPrice: 50, taxRate: 10 }],
      reason: 'Return',
    };

    it('should create a credit note', async () => {
      const cn = { id: 'cn-1', creditNoteNumber: 'CN-000001' };
      creditNoteService.createCreditNote.mockResolvedValue(cn);
      mockReq.body = validBody;

      await create(mockReq, mockRes, mockNext);

      expect(creditNoteService.createCreditNote).toHaveBeenCalledWith(
        'c1',
        undefined,
        validBody.items,
        'Return',
        undefined,
        'user-1'
      );
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should call next on service error', async () => {
      creditNoteService.createCreditNote.mockRejectedValue(new Error('Service error'));
      mockReq.body = validBody;

      await create(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('update', () => {
    it('should update a credit note', async () => {
      const cn = { id: '1', status: 'issued' };
      creditNoteService.updateCreditNote.mockResolvedValue(cn);
      mockReq.params.id = '1';
      mockReq.body = { status: 'issued' };

      await update(mockReq, mockRes, mockNext);

      expect(creditNoteService.updateCreditNote).toHaveBeenCalledWith('1', { status: 'issued' });
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should handle not found error during update', async () => {
      creditNoteService.updateCreditNote.mockRejectedValue(new Error('not found'));
      mockReq.params.id = 'bad-id';

      await update(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('applyCreditToInvoice', () => {
    it('should apply credit note to invoice', async () => {
      const result = {
        creditNote: { id: 'cn-1', status: 'applied' },
        invoice: { id: 'inv-1', status: 'paid' }
      };
      creditNoteService.applyCreditNote.mockResolvedValue(result);
      mockReq.params.id = 'cn-1';
      mockReq.body = { invoiceId: 'inv-1' };

      await applyCreditToInvoice(mockReq, mockRes, mockNext);

      expect(creditNoteService.applyCreditNote).toHaveBeenCalledWith('cn-1', 'inv-1');
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should handle service error when applying credit', async () => {
      creditNoteService.applyCreditNote.mockRejectedValue(new Error('status error'));
      mockReq.params.id = 'cn-1';
      mockReq.body = { invoiceId: 'inv-1' };

      await applyCreditToInvoice(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a credit note', async () => {
      creditNoteService.deleteCreditNote.mockResolvedValue({ message: 'Credit note deleted' });
      mockReq.params.id = '1';

      await remove(mockReq, mockRes, mockNext);

      expect(creditNoteService.deleteCreditNote).toHaveBeenCalledWith('1');
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should handle cannot delete error', async () => {
      creditNoteService.deleteCreditNote.mockRejectedValue(new Error('Cannot delete'));
      mockReq.params.id = '1';

      await remove(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalled();
    });
  });
});
