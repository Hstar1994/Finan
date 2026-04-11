/**
 * Invoices Controller Tests
 * Tests for invoice CRUD operations
 */

const {
  getAll,
  getById,
  create,
  update,
  remove,
} = require('../../../src/modules/invoices/controller');

// Mock dependencies
jest.mock('../../../src/database/models', () => ({
  Invoice: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  InvoiceItem: {
    create: jest.fn(),
    destroy: jest.fn(),
  },
  Customer: {
    findByPk: jest.fn(),
  },
  Item: {},
}));

jest.mock('../../../src/database/connection', () => ({
  sequelize: {
    transaction: jest.fn(),
  },
}));

jest.mock('../../../src/utils/numberGenerator', () => ({
  generateInvoiceNumber: jest.fn(),
}));

const { Invoice, InvoiceItem, Customer } = require('../../../src/database/models');
const { sequelize } = require('../../../src/database/connection');
const { generateInvoiceNumber } = require('../../../src/utils/numberGenerator');

describe('Invoices Controller', () => {
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
    it('should return paginated invoices', async () => {
      const mockInvoices = [
        { id: 1, invoiceNumber: 'INV-001' },
        { id: 2, invoiceNumber: 'INV-002' },
      ];
      
      Invoice.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockInvoices,
      });
      
      mockReq.query = { page: '1', limit: '10' };
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(Invoice.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
          include: expect.any(Array),
          order: [['createdAt', 'DESC']],
        })
      );
      
      expect(mockRes.json).toHaveBeenCalledWith({
        invoices: mockInvoices,
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });

    it('should filter by status', async () => {
      Invoice.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      
      mockReq.query = { status: 'paid' };
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(Invoice.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'paid' },
        })
      );
    });

    it('should filter by customerId', async () => {
      Invoice.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      
      mockReq.query = { customerId: '5' };
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(Invoice.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { customerId: '5' },
        })
      );
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      Invoice.findAndCountAll.mockRejectedValue(error);
      
      await getAll(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getById', () => {
    it('should return invoice with customer and items', async () => {
      const mockInvoice = {
        id: 1,
        invoiceNumber: 'INV-001',
        customer: { id: 1, name: 'Test Customer' },
        items: [{ id: 1, description: 'Item 1' }],
      };
      
      Invoice.findByPk.mockResolvedValue(mockInvoice);
      mockReq.params.id = '1';
      
      await getById(mockReq, mockRes, mockNext);
      
      expect(Invoice.findByPk).toHaveBeenCalledWith('1', expect.objectContaining({
        include: expect.any(Array),
      }));
      expect(mockRes.json).toHaveBeenCalledWith({ invoice: mockInvoice });
    });

    it('should return 404 if invoice not found', async () => {
      Invoice.findByPk.mockResolvedValue(null);
      mockReq.params.id = '999';
      
      await getById(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invoice not found' });
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      Invoice.findByPk.mockRejectedValue(error);
      mockReq.params.id = '1';
      
      await getById(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('create', () => {
    it('should create invoice successfully', async () => {
      const mockCustomer = {
        id: 1,
        balance: 0,
        creditLimit: 10000,
        canPurchase: jest.fn().mockReturnValue(true),
        getAvailableCredit: jest.fn().mockReturnValue(10000),
        save: jest.fn().mockResolvedValue(true),
      };
      
      const mockInvoice = {
        id: 1,
        invoiceNumber: 'INV-001',
        toJSON: () => ({
          id: 1,
          invoiceNumber: 'INV-001',
          totalAmount: 110,
        }),
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      generateInvoiceNumber.mockResolvedValue('INV-001');
      Invoice.create.mockResolvedValue(mockInvoice);
      InvoiceItem.create.mockResolvedValue({ id: 1 });
      
      mockReq.body = {
        customerId: 1,
        dueDate: '2026-02-01',
        items: [
          { itemId: 1, description: 'Test Item', quantity: 2, unitPrice: 50, taxRate: 10 },
        ],
        notes: 'Test notes',
      };
      
      await create(mockReq, mockRes, mockNext);
      
      expect(Customer.findByPk).toHaveBeenCalledWith(1, { transaction: mockTransaction });
      expect(mockCustomer.canPurchase).toHaveBeenCalledWith(110); // 2*50 + 10% tax = 110
      expect(generateInvoiceNumber).toHaveBeenCalledWith(mockTransaction);
      expect(Invoice.create).toHaveBeenCalled();
      expect(InvoiceItem.create).toHaveBeenCalled();
      expect(mockCustomer.save).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if customerId is missing', async () => {
      mockReq.body = {
        dueDate: '2026-02-01',
        items: [{ quantity: 1, unitPrice: 100 }],
      };
      
      await create(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if items are missing', async () => {
      mockReq.body = {
        customerId: 1,
        dueDate: '2026-02-01',
        items: [],
      };
      
      await create(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if customer not found', async () => {
      Customer.findByPk.mockResolvedValue(null);
      
      mockReq.body = {
        customerId: 999,
        dueDate: '2026-02-01',
        items: [{ quantity: 1, unitPrice: 100 }],
      };
      
      await create(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if exceeds credit limit', async () => {
      const mockCustomer = {
        id: 1,
        balance: 9500,
        creditLimit: 10000,
        canPurchase: jest.fn().mockReturnValue(false),
        getAvailableCredit: jest.fn().mockReturnValue(500),
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      
      mockReq.body = {
        customerId: 1,
        dueDate: '2026-02-01',
        items: [{ quantity: 10, unitPrice: 100 }], // 1000 exceeds 500 available
      };
      
      await create(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invoice amount exceeds customer credit limit',
        })
      );
    });

    it('should rollback and call next on error', async () => {
      const error = new Error('Database error');
      
      const mockCustomer = {
        id: 1,
        canPurchase: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue(true),
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      generateInvoiceNumber.mockResolvedValue('INV-001');
      Invoice.create.mockRejectedValue(error);
      
      mockReq.body = {
        customerId: 1,
        dueDate: '2026-02-01',
        items: [{ quantity: 1, unitPrice: 100 }],
      };
      
      await create(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('update', () => {
    it('should update invoice fields', async () => {
      const mockInvoice = {
        id: 1,
        status: 'draft',
        totalAmount: 100,
        save: jest.fn().mockResolvedValue(true),
      };
      
      Invoice.findByPk.mockResolvedValue(mockInvoice);
      mockReq.params.id = '1';
      mockReq.body = { status: 'sent', notes: 'Updated notes' };
      
      await update(mockReq, mockRes, mockNext);
      
      expect(mockInvoice.status).toBe('sent');
      expect(mockInvoice.notes).toBe('Updated notes');
      expect(mockInvoice.save).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invoice updated successfully',
        invoice: mockInvoice,
      });
    });

    it('should update invoice items and recalculate totals', async () => {
      const mockInvoice = {
        id: 1,
        customerId: 1,
        totalAmount: 100,
        save: jest.fn().mockResolvedValue(true),
      };
      
      const mockCustomer = {
        id: 1,
        balance: 100,
        save: jest.fn().mockResolvedValue(true),
      };
      
      Invoice.findByPk.mockResolvedValue(mockInvoice);
      Customer.findByPk.mockResolvedValue(mockCustomer);
      InvoiceItem.destroy.mockResolvedValue(1);
      InvoiceItem.create.mockResolvedValue({ id: 1 });
      
      mockReq.params.id = '1';
      mockReq.body = {
        items: [
          { itemId: 1, description: 'New Item', quantity: 2, unitPrice: 100, taxRate: 10 },
        ],
      };
      
      await update(mockReq, mockRes, mockNext);
      
      expect(InvoiceItem.destroy).toHaveBeenCalledWith({
        where: { invoiceId: 1 },
        transaction: mockTransaction,
      });
      expect(mockInvoice.subtotal).toBe(200); // 2 * 100
      expect(mockInvoice.taxAmount).toBe(20); // 10% of 200
      expect(mockInvoice.totalAmount).toBe(220);
      expect(mockCustomer.balance).toBe(220); // 100 + (220-100)
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should return 404 if invoice not found', async () => {
      Invoice.findByPk.mockResolvedValue(null);
      mockReq.params.id = '999';
      
      await update(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should rollback and call next on error', async () => {
      const error = new Error('Database error');
      Invoice.findByPk.mockRejectedValue(error);
      mockReq.params.id = '1';
      
      await update(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('remove', () => {
    it('should delete invoice and update customer balance', async () => {
      const mockInvoice = {
        id: 1,
        customerId: 1,
        amountPaid: 0,
        totalAmount: 100,
        destroy: jest.fn().mockResolvedValue(true),
      };
      
      const mockCustomer = {
        id: 1,
        balance: 500,
        save: jest.fn().mockResolvedValue(true),
      };
      
      Invoice.findByPk.mockResolvedValue(mockInvoice);
      Customer.findByPk.mockResolvedValue(mockCustomer);
      mockReq.params.id = '1';
      
      await remove(mockReq, mockRes, mockNext);
      
      expect(mockCustomer.balance).toBe(400); // 500 - 100
      expect(mockCustomer.save).toHaveBeenCalled();
      expect(mockInvoice.destroy).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invoice deleted successfully' });
    });

    it('should return 404 if invoice not found', async () => {
      Invoice.findByPk.mockResolvedValue(null);
      mockReq.params.id = '999';
      
      await remove(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if invoice has payments', async () => {
      const mockInvoice = {
        id: 1,
        amountPaid: 50, // Has payments
        totalAmount: 100,
      };
      
      Invoice.findByPk.mockResolvedValue(mockInvoice);
      mockReq.params.id = '1';
      
      await remove(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Cannot delete invoice with payments. Please delete associated receipts first.',
      });
    });

    it('should rollback and call next on error', async () => {
      const error = new Error('Database error');
      Invoice.findByPk.mockRejectedValue(error);
      mockReq.params.id = '1';
      
      await remove(mockReq, mockRes, mockNext);
      
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
