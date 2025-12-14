const request = require('supertest');
const express = require('express');
const ApiResponse = require('../../../src/utils/apiResponse');

describe('ApiResponse Utility', () => {
  let app;
  let res;

  beforeEach(() => {
    app = express();
    
    // Test endpoint that uses ApiResponse
    app.get('/test/success', (req, res) => {
      return ApiResponse.success(res, { test: 'data' }, 'Success message');
    });

    app.get('/test/error', (req, res) => {
      return ApiResponse.error(res, 'Error message', null, 400);
    });

    app.get('/test/paginated', (req, res) => {
      const items = [{ id: 1 }, { id: 2 }];
      return ApiResponse.paginated(res, items, 1, 10, 50);
    });

    app.get('/test/unauthorized', (req, res) => {
      return ApiResponse.unauthorized(res);
    });

    app.get('/test/not-found', (req, res) => {
      return ApiResponse.notFound(res, 'Resource not found');
    });
  });

  test('should return success response with correct structure', async () => {
    const response = await request(app).get('/test/success');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message', 'Success message');
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toEqual({ test: 'data' });
    expect(response.body).toHaveProperty('timestamp');
  });

  test('should return error response with correct structure', async () => {
    const response = await request(app).get('/test/error');
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('message', 'Error message');
    expect(response.body).toHaveProperty('timestamp');
  });

  test('should return paginated response with meta', async () => {
    const response = await request(app).get('/test/paginated');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveLength(2);
    expect(response.body).toHaveProperty('meta');
    expect(response.body.meta.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 50,
      totalPages: 5,
      hasNext: true,
      hasPrev: false
    });
  });

  test('should return 401 for unauthorized', async () => {
    const response = await request(app).get('/test/unauthorized');
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test('should return 404 for not found', async () => {
    const response = await request(app).get('/test/not-found');
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Resource not found');
  });
});
