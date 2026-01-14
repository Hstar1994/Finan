/**
 * Receipts Controller Tests
 * Tests for receipt/payment CRUD operations
 */

const {
  getAll,
  getById,
  create,
  update,
  remove,
} = require('../../../src/modules/receipts/controller');

// Mock dependencies
jest.mock('../../../src/database/models', () => ({
  Receipt: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  Customer: {
    findByPk: jest.fn(),
  },
  Invoice: {
    findByPk: jest.fn(),
  },
}));

jest.mock('../../../src/database/connection', () => ({
  sequelize: {
    transaction: jest.fn(),
  },
}));

jest.mock('../../../src/utils/numberGenerator', () => ({
  generateReceiptNumber: jest.fn(),
}));

const { Receipt, Customer, Invoice } = require('../../../src/database/models');
const { sequelize } = require('../../../src/database/connection');
const { generateReceiptNumber } = require('../../../src/utils/numberGenerator');

describe('Receipts Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(true),
      rollback: jest.fn().mockResolvedValue(true),
    };
    
    sequelize.transaction.mockResolvedValue(mockTransaction);
    
    mockReq = {
      query: {},
      params: {},
      body: {},
      user: { id: 1 },
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    
    mockNext = jest.fn();
  });

  describe('getAll', () => {
    it('should return paginated receipts', async () => {
      const mockReceipts = [
        { id: 1, receiptNumber: 'REC-001', amount: 100 },
        { id: 2, receiptNumber: 'REC-002', amount: 200 },
      ];
      
      Receipt.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockReceipts,
      });
      
      mockReq.query = { page: '1', limit: '10' };
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(Receipt.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
          include: expect.any(Array),
          order: [['createdAt', 'DESC']],
        })
      );
      
      expect(mockRes.json).toHaveBeenCalledWith({
        receipts: mockReceipts,
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });

    it('should filter by customerId', async () => {
      Receipt.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      
      mockReq.query = { customerId: '5' };
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(Receipt.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { customerId: '5' },
        })
      );
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      Receipt.findAndCountAll.mockRejectedValue(error);
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getById', () => {
    it('should return receipt with customer and invoice', async () => {
      const mockReceipt = {
        id: 1,
        receiptNumber: 'REC-001',
        customer: { id: 1, name: 'Test Customer' },
        invoice: { id: 1, invoiceNumber: 'INV-001' },
      };
      
      Receipt.findByPk.mockResolvedValue(mockReceipt);
      mockReq.params.id = '1';
      
      await getById(mockReq, mockRes, mockNext);
      
      expect(Receipt.findByPk).toHaveBeenCalledWith('1', expect.objectContaining({
        include: expect.any(Array),
      }));
      expect(mockRes.json).toHaveBeenCalledWith({ receipt: mockReceipt });
    });

    it('should return 404 if receipt not found', async () => {
      Receipt.findByPk.mockResolvedValue(null);
      mockReq.params.id = '999';
      
      await getById(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Receipt not found' });
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      Receipt.findByPk.mockRejectedValue(error);
      mockReq.params.id = '1';
      
      await getById(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('create', () => {
    it('should create receipt successfully without invoice', async () => {
      const mockCustomer = {
        id: 1,
        balance: 500,
        save: jest.fn().mockResolvedValue(true),
      };
      
      const mockReceipt = {
        id: 1,
        receiptNumber: 'REC-001',
        amount: 100,
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      generateReceiptNumber.mockResolvedValue('REC-001');
      Receipt.create.mockResolvedValue(mockReceipt);
      
      mockReq.body = {
        customerId: 1,
        amount: 100,
        paymentMethod: 'cash',
      };
      
      await create(mockReq, mockRes, mockNext);
      
      expect(generateReceiptNumber).toHaveBeenCalledWith(mockTransaction);
      expect(Receipt.create).toHaveBeenCalled();
      expect(mockCustomer.balance).toBe(400); // 500 - 100
      expect(mockCustomer.save).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should create receipt and update invoice', async () => {
      const mockCustomer = {
        id: 1,
        balance: 500,
        save: jest.fn().mockResolvedValue(true),
      };
      
      const mockInvoice = {
        id: 1,
        customerId: 1,
        totalAmount: 200,
        amountPaid: 0,
        status: 'sent',
        save: jest.fn().mockResolvedValue(true),
      };
      
      const mockReceipt = {
        id: 1,
        receiptNumber: 'REC-001',
        amount: 100,
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      Invoice.findByPk.mockResolvedValue(mockInvoice);
      generateReceiptNumber.mockResolvedValue('REC-001');
      Receipt.create.mockResolvedValue(mockReceipt);
      
      mockReq.body = {
        customerId: 1,
        invoiceId: 1,
        amount: 100,
      };
      
      await create(mockReq, mockRes, mockNext);
      
      expect(mockInvoice.amountPaid).toBe(100);
      expect(mockInvoice.status).toBe('partial');
      expect(mockInvoice.save).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should mark invoice as paid when fully paid', async () => {
      const mockCustomer = {
        id: 1,
        balance: 200,
        save: jest.fn().mockResolvedValue(true),
      };
      
      const mockInvoice = {
        id: 1,
        customerId: 1,
        totalAmount: 200,
        amountPaid: 0,
        status: 'sent',
        save: jest.fn().mockResolvedValue(true),
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      Invoice.findByPk.mockResolvedValue(mockInvoice);
      generateReceiptNumber.mockResolvedValue('REC-001');
      Receipt.create.mockResolvedValue({ id: 1 });
      
      mockReq.body = {
        customerId: 1,
        invoiceId: 1,
        amount: 200, // Full amount
      };
      
      await create(mockReq, mockRes, mockNext);
      
      expect(mockInvoice.status).toBe('paid');
    });

    it('should return 400 if customerId is missing', async () => {
      mockReq.body = { amount: 100 };
      
      await create(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if amount is zero or negative', async () => {
      mockReq.body = { customerId: 1, amount: -10 };
      
      await create(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Amount must be greater than zero',
      });
    });

    it('should return 400 if invoice belongs to different customer', async () => {
      const mockInvoice = {
        id: 1,
        customerId: 999, // Different customer
        totalAmount: 200,
        amountPaid: 0,
      };
      
      Invoice.findByPk.mockResolvedValue(mockInvoice);
      generateReceiptNumber.mockResolvedValue('REC-001');
      Receipt.create.mockResolvedValue({ id: 1 });
      
      mockReq.body = {
        customerId: 1,
        invoiceId: 1,
        amount: 100,
      };
      
      await create(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invoice does not belong to the selected customer',
      });
    });

    it('should return 400 if payment exceeds invoice balance', async () => {
      const mockInvoice = {
        id: 1,
        customerId: 1,
        totalAmount: 100,
        amountPaid: 50,
      };
      
      Invoice.findByPk.mockResolvedValue(mockInvoice);
      generateReceiptNumber.mockResolvedValue('REC-001');
      Receipt.create.mockResolvedValue({ id: 1 });
      
      mockReq.body = {
        customerId: 1,
        invoiceId: 1,
        amount: 100, // Would exceed balance
      };
      
      await create(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Payment amount exceeds invoice balance',
        })
      );
    });

    it('should rollback and call next on error', async () => {
      const error = new Error('Database error');
      
      generateReceiptNumber.mockResolvedValue('REC-001');
      Receipt.create.mockRejectedValue(error);
      
      mockReq.body = { customerId: 1, amount: 100 };
      
      await create(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('update', () => {
    it('should update receipt fields', async () => {
      const mockReceipt = {
        id: 1,
        amount: 100,
        paymentMethod: 'cash',
        save: jest.fn().mockResolvedValue(true),
      };
      
      Receipt.findByPk.mockResolvedValue(mockReceipt);
      mockReq.params.id = '1';
      mockReq.body = { paymentMethod: 'card', notes: 'Updated' };
      
      await update(mockReq, mockRes, mockNext);
      
      expect(mockReceipt.paymentMethod).toBe('card');
      expect(mockReceipt.notes).toBe('Updated');
      expect(mockReceipt.save).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should update amount and recalculate balances', async () => {
      const mockReceipt = {
        id: 1,
        amount: 100,
        customerId: 1,
        invoiceId: 1,
        save: jest.fn().mockResolvedValue(true),
      };
      
      const mockCustomer = {
        id: 1,
        balance: 400,
        save: jest.fn().mockResolvedValue(true),
      };
      
      const mockInvoice = {
        id: 1,
        totalAmount: 300,
        amountPaid: 100,
        status: 'partial',
        save: jest.fn().mockResolvedValue(true),
      };
      
      Receipt.findByPk.mockResolvedValue(mockReceipt);
      Customer.findByPk.mockResolvedValue(mockCustomer);
      Invoice.findByPk.mockResolvedValue(mockInvoice);
      
      mockReq.params.id = '1';
      mockReq.body = { amount: 150 }; // Increase by 50
      
      await update(mockReq, mockRes, mockNext);
      
      expect(mockReceipt.amount).toBe(150);
      expect(mockInvoice.amountPaid).toBe(150); // 100 + 50
      expect(mockCustomer.balance).toBe(350); // 400 - 50
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should return 404 if receipt not found', async () => {
      Receipt.findByPk.mockResolvedValue(null);
      mockReq.params.id = '999';
      
      await update(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should rollback and call next on error', async () => {
      const error = new Error('Database error');
      Receipt.findByPk.mockRejectedValue(error);
      mockReq.params.id = '1';
      
      await update(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('remove', () => {
    it('should delete receipt and reverse balances', async () => {
      const mockReceipt = {
        id: 1,
        amount: 100,
        customerId: 1,
        invoiceId: null,
        destroy: jest.fn().mockResolvedValue(true),
      };
      
      const mockCustomer = {
        id: 1,
        balance: 300,
        save: jest.fn().mockResolvedValue(true),
      };
      
      Receipt.findByPk.mockResolvedValue(mockReceipt);
      Customer.findByPk.mockResolvedValue(mockCustomer);
      
      mockReq.params.id = '1';
      
      await remove(mockReq, mockRes, mockNext);
      
      expect(mockCustomer.balance).toBe(400); // 300 + 100 reversed
      expect(mockReceipt.destroy).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Receipt deleted successfully',
      });
    });

    it('should reverse invoice payment when deleting', async () => {
      const mockReceipt = {
        id: 1,
        amount: 100,
        customerId: 1,
        invoiceId: 1,
        destroy: jest.fn().mockResolvedValue(true),
      };
      
      const mockCustomer = {
        id: 1,
        balance: 300,
        save: jest.fn().mockResolvedValue(true),
      };
      
      const mockInvoice = {
        id: 1,
        totalAmount: 200,
        amountPaid: 100,
        status: 'partial',
        save: jest.fn().mockResolvedValue(true),
      };
      
      Receipt.findByPk.mockResolvedValue(mockReceipt);
      Customer.findByPk.mockResolvedValue(mockCustomer);
      Invoice.findByPk.mockResolvedValue(mockInvoice);
      
      mockReq.params.id = '1';
      
      await remove(mockReq, mockRes, mockNext);
      
      expect(mockInvoice.amountPaid).toBe(0);
      expect(mockInvoice.status).toBe('sent');
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should return 404 if receipt not found', async () => {
      Receipt.findByPk.mockResolvedValue(null);
      mockReq.params.id = '999';
      
      await remove(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should rollback and call next on error', async () => {
      const error = new Error('Database error');
      Receipt.findByPk.mockRejectedValue(error);
      mockReq.params.id = '1';
      
      await remove(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
