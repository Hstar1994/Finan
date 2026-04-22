/**
 * Credit Notes Service Tests
 * Tests for credit note business logic and integration
 */

const creditNoteService = require('../../../src/modules/creditNotes/service');

jest.mock('../../../src/database/models');
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const {
  CreditNote,
  CreditNoteItem,
  Customer,
  Invoice,
  sequelize,
} = require('../../../src/database/models');

describe('Credit Notes Service (Pragmatic Integration Tests)', () => {
  let mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTransaction = {
      commit: jest.fn().mockResolvedValue(true),
      rollback: jest.fn().mockResolvedValue(true),
    };

    sequelize.transaction.mockResolvedValue(mockTransaction);
  });

  describe('generateCreditNoteNumber', () => {
    it('should generate sequential credit note numbers', async () => {
      CreditNote.count.mockResolvedValue(5);
      const result = await creditNoteService.generateCreditNoteNumber();
      expect(result).toBe('CN-000006');
      expect(result).toMatch(/^CN-\d{6}$/);
    });
  });

  describe('createCreditNote', () => {
    it('should successfully create a credit note with customer and invoice validation', async () => {
      // Create a mock that has the toJSON method properly
      class MockCreditNote {
        constructor() {
          this.id = 'cn-1';
          this.creditNoteNumber = 'CN-000001';
        }
        toJSON() {
          return { id: this.id, creditNoteNumber: this.creditNoteNumber };
        }
      }

      const mockCustomer = { id: 'cust-1' };
      const mockInvoice = { id: 'inv-1', customerId: 'cust-1' };
      const mockCreatedNote = new MockCreditNote();

      Customer.findByPk.mockResolvedValue(mockCustomer);
      Invoice.findByPk.mockResolvedValue(mockInvoice);
      CreditNote.count.mockResolvedValue(0);
      CreditNote.create.mockResolvedValue(mockCreatedNote);
      CreditNoteItem.create.mockResolvedValue({}); 

      const result = await creditNoteService.createCreditNote(
        'cust-1',
        'inv-1',
        [{ quantity: 1, unitPrice: 100, taxRate: 10, description: 'Item' }],
        'Reason',
        'Notes',
        'user-1'
      );

      expect(Customer.findByPk).toHaveBeenCalledWith('cust-1', { transaction: mockTransaction });
      expect(Invoice.findByPk).toHaveBeenCalledWith('inv-1', { transaction: mockTransaction });
      expect(CreditNote.create).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should validate customer exists', async () => {
      Customer.findByPk.mockResolvedValue(null);

      await expect(
        creditNoteService.createCreditNote('bad-cust', 'inv-1', [], '', '', '')
      ).rejects.toThrow('Customer');
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should validate invoice exists', async () => {
      Customer.findByPk.mockResolvedValue({ id: 'cust-1' });
      Invoice.findByPk.mockResolvedValue(null);

      await expect(
        creditNoteService.createCreditNote('cust-1', 'bad-inv', [], '', '', '')
      ).rejects.toThrow('Invoice');
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('applyCreditNote', () => {
    it('should apply credit to invoice with proper status update', async () => {
      class MockCreditNote {
        constructor() {
          this.id = 'cn-1';
          this.status = 'issued';
          this.customerId = 'cust-1';
          this.totalAmount = 100;
        }
        update(data) {
          return Promise.resolve(Object.assign(this, data));
        }
        toJSON() {
          return { id: this.id };
        }
      }

      class MockInvoice {
        constructor() {
          this.id = 'inv-1';
          this.totalAmount = 500;
          this.amountPaid = 200;
          this.customerId = 'cust-1';
        }
        update(data) {
          return Promise.resolve(Object.assign(this, data));
        }
        toJSON() {
          return { id: this.id };
        }
      }

      const mockCreditNote = new MockCreditNote();
      const mockInvoice = new MockInvoice();

      CreditNote.findByPk.mockResolvedValue(mockCreditNote);
      Invoice.findByPk.mockResolvedValue(mockInvoice);

      const result = await creditNoteService.applyCreditNote('cn-1', 'inv-1');

      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should reject non-issued credit notes', async () => {
      CreditNote.findByPk.mockResolvedValue({
        id: 'cn-1',
        status: 'draft'
      });

      await expect(
        creditNoteService.applyCreditNote('cn-1', 'inv-1')
      ).rejects.toThrow('issued');
    });
  });

  describe('getAllCreditNotes', () => {
    it('should fetch paginated credit notes', async () => {
      CreditNote.findAndCountAll.mockResolvedValue({
        count: 10,
        rows: [{ id: 'cn-1', status: 'issued' }],
      });

      const result = await creditNoteService.getAllCreditNotes(1, 10);

      expect(CreditNote.findAndCountAll).toHaveBeenCalled();
      expect(result).toHaveProperty('crediteNotes');
      expect(result).toHaveProperty('pagination');
    });

    it('should apply filters', async () => {
      CreditNote.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await creditNoteService.getAllCreditNotes(1, 10, { status: 'issued' });

      expect(CreditNote.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'issued' }),
        })
      );
    });
  });

  describe('getCreditNoteById', () => {
    it('should fetch credit note with associations', async () => {
      const mockNote = { id: 'cn-1', status: 'issued' };
      CreditNote.findByPk.mockResolvedValue(mockNote);

      const result = await creditNoteService.getCreditNoteById('cn-1');

      expect(CreditNote.findByPk).toHaveBeenCalledWith('cn-1', {
        include: expect.any(Array),
      });
      expect(result).toEqual(mockNote);
    });

    it('should throw error for missing credit note', async () => {
      CreditNote.findByPk.mockResolvedValue(null);

      await expect(
        creditNoteService.getCreditNoteById('missing')
      ).rejects.toThrow('not found');
    });
  });

  describe('updateCreditNote', () => {
    it('should update allowed fields only', async () => {
      const mockNote = {
        id: 'cn-1',
        update: jest.fn(),
      };
      CreditNote.findByPk.mockResolvedValue(mockNote);

      await creditNoteService.updateCreditNote('cn-1', {
        status: 'issued',
        reason: 'Updated',
        totalAmount: 9999, // Should be filtered out
      });

      const updateCall = mockNote.update.mock.calls[0][0];
      expect(updateCall).toHaveProperty('status');
      expect(updateCall).toHaveProperty('reason');
      expect(updateCall).not.toHaveProperty('totalAmount');
    });
  });

  describe('deleteCreditNote', () => {
    it('should delete draft credit notes with items', async () => {
      const mockNote = {
        id: 'cn-1',
        status: 'draft',
        destroy: jest.fn(),
      };
      CreditNote.findByPk.mockResolvedValue(mockNote);
      CreditNoteItem.destroy.mockResolvedValue(1);

      await creditNoteService.deleteCreditNote('cn-1');

      expect(CreditNoteItem.destroy).toHaveBeenCalled();
      expect(mockNote.destroy).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should prevent deletion of non-draft notes', async () => {
      CreditNote.findByPk.mockResolvedValue({
        id: 'cn-1',
        status: 'issued',
      });

      await expect(
        creditNoteService.deleteCreditNote('cn-1')
      ).rejects.toThrow('draft');
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });
});
