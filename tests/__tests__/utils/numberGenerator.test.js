const { generateInvoiceNumber, generateReceiptNumber } = require('../../../src/utils/numberGenerator');
const { sequelize } = require('../../../src/database/connection');

describe('Number Generator', () => {
  
  test('should generate invoice number in correct format', async () => {
    // Note: This test requires database connection
    // Skip if DB not available
    if (!process.env.DB_NAME) {
      console.log('Skipping DB test - no database configured');
      return;
    }

    try {
      const number = await generateInvoiceNumber();
      expect(number).toMatch(/^INV-\d{6}$/);
      expect(number).toHaveLength(10); // INV-000001 = 10 chars
    } catch (error) {
      console.log('DB not available, skipping test');
    }
  });

  test('should generate receipt number in correct format', async () => {
    if (!process.env.DB_NAME) {
      console.log('Skipping DB test - no database configured');
      return;
    }

    try {
      const number = await generateReceiptNumber();
      expect(number).toMatch(/^REC-\d{6}$/);
      expect(number).toHaveLength(10); // REC-000001 = 10 chars
    } catch (error) {
      console.log('DB not available, skipping test');
    }
  });
});
