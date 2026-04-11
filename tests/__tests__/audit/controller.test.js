/**
 * Audit Controller Tests
 */

jest.mock('../../../src/database/models', () => ({
  AuditLog: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
  User: {},
}));

// Mock sequelize Op
jest.mock('sequelize', () => ({
  Op: {
    gte: Symbol('gte'),
    lte: Symbol('lte'),
  },
}));

const { AuditLog } = require('../../../src/database/models');
const { getAll, getById, getByEntity } = require('../../../src/modules/audit/controller');

describe('Audit Controller', () => {
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
    it('should return paginated audit logs', async () => {
      const rows = [{ id: '1', action: 'CREATE', entity: 'Invoice' }];
      AuditLog.findAndCountAll.mockResolvedValue({ count: 1, rows });

      await getAll(mockReq, mockRes, mockNext);

      expect(AuditLog.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, offset: 0, order: [['createdAt', 'DESC']] })
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        logs: rows,
        pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
      });
    });

    it('should filter by entity', async () => {
      AuditLog.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      mockReq.query = { entity: 'Invoice' };

      await getAll(mockReq, mockRes, mockNext);

      expect(AuditLog.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ entity: 'Invoice' }) })
      );
    });

    it('should filter by action', async () => {
      AuditLog.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      mockReq.query = { action: 'DELETE' };

      await getAll(mockReq, mockRes, mockNext);

      expect(AuditLog.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ action: 'DELETE' }) })
      );
    });

    it('should filter by userId', async () => {
      AuditLog.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      mockReq.query = { userId: 'user-1' };

      await getAll(mockReq, mockRes, mockNext);

      expect(AuditLog.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) })
      );
    });

    it('should filter by startDate', async () => {
      AuditLog.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      mockReq.query = { startDate: '2026-01-01' };

      await getAll(mockReq, mockRes, mockNext);

      expect(AuditLog.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ createdAt: expect.any(Object) }),
        })
      );
    });

    it('should filter by endDate', async () => {
      AuditLog.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      mockReq.query = { endDate: '2026-12-31' };

      await getAll(mockReq, mockRes, mockNext);

      expect(AuditLog.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ createdAt: expect.any(Object) }),
        })
      );
    });

    it('should support both startDate and endDate', async () => {
      AuditLog.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      mockReq.query = { startDate: '2026-01-01', endDate: '2026-12-31' };

      await getAll(mockReq, mockRes, mockNext);

      expect(AuditLog.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ createdAt: expect.any(Object) }),
        })
      );
    });

    it('should apply custom pagination', async () => {
      AuditLog.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      mockReq.query = { page: '2', limit: '25' };

      await getAll(mockReq, mockRes, mockNext);

      expect(AuditLog.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25, offset: 25 })
      );
    });

    it('should call next on error', async () => {
      AuditLog.findAndCountAll.mockRejectedValue(new Error('DB error'));
      await getAll(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getById', () => {
    it('should return a log by id', async () => {
      const log = { id: '1', action: 'CREATE' };
      AuditLog.findByPk.mockResolvedValue(log);
      mockReq.params.id = '1';

      await getById(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ log });
    });

    it('should return 404 when not found', async () => {
      AuditLog.findByPk.mockResolvedValue(null);
      mockReq.params.id = 'bad-id';

      await getById(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Audit log not found' });
    });

    it('should call next on error', async () => {
      AuditLog.findByPk.mockRejectedValue(new Error('DB error'));
      mockReq.params.id = '1';
      await getById(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getByEntity', () => {
    it('should return logs for a given entity', async () => {
      const logs = [{ id: '1' }, { id: '2' }];
      AuditLog.findAll.mockResolvedValue(logs);
      mockReq.params = { entity: 'Invoice', entityId: 'inv-1' };

      await getByEntity(mockReq, mockRes, mockNext);

      expect(AuditLog.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entity: 'Invoice', entityId: 'inv-1' },
          order: [['createdAt', 'DESC']],
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith({ logs });
    });

    it('should call next on error', async () => {
      AuditLog.findAll.mockRejectedValue(new Error('DB error'));
      mockReq.params = { entity: 'Invoice', entityId: 'inv-1' };
      await getByEntity(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
