const { sequelize } = require('./connection');
const { Invoice, Receipt } = require('./models');

const initSequences = async () => {
  try {
    console.log('Initializing database sequences...');
    
    // Get current max invoice number
    const maxInvoice = await Invoice.findOne({
      order: [['createdAt', 'DESC']],
      attributes: ['invoiceNumber'],
    });
    
    const invoiceStart = maxInvoice && maxInvoice.invoiceNumber 
      ? parseInt(maxInvoice.invoiceNumber.replace('INV-', '')) + 1 
      : 1;
    
    // Get current max receipt number
    const maxReceipt = await Receipt.findOne({
      order: [['createdAt', 'DESC']],
      attributes: ['receiptNumber'],
    });
    
    const receiptStart = maxReceipt && maxReceipt.receiptNumber 
      ? parseInt(maxReceipt.receiptNumber.replace('REC-', '')) + 1 
      : 1;
    
    // Create or reset sequences
    await sequelize.query(`
      DROP SEQUENCE IF EXISTS invoice_number_seq;
      CREATE SEQUENCE invoice_number_seq START ${invoiceStart};
    `);
    
    await sequelize.query(`
      DROP SEQUENCE IF EXISTS receipt_number_seq;
      CREATE SEQUENCE receipt_number_seq START ${receiptStart};
    `);
    
    console.log(`✓ Invoice sequence initialized starting at ${invoiceStart}`);
    console.log(`✓ Receipt sequence initialized starting at ${receiptStart}`);
    console.log('✓ Database sequences initialized successfully.');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Sequence initialization failed:', error);
    process.exit(1);
  }
};

initSequences();
