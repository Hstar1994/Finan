const { sequelize } = require('./connection');

const addIndexes = async () => {
  try {
    console.log('Adding database indexes...');
    
    // Invoices indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON "Invoices" ("customerId");
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON "Invoices" ("status");
      CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON "Invoices" ("dueDate");
      CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON "Invoices" ("createdAt" DESC);
    `);
    console.log('✓ Invoices indexes created');
    
    // Receipts indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_receipts_customer_id ON "Receipts" ("customerId");
      CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON "Receipts" ("invoiceId");
      CREATE INDEX IF NOT EXISTS idx_receipts_payment_date ON "Receipts" ("paymentDate");
      CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON "Receipts" ("createdAt" DESC);
    `);
    console.log('✓ Receipts indexes created');
    
    // Customers indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_email ON "Customers" ("email");
      CREATE INDEX IF NOT EXISTS idx_customers_is_active ON "Customers" ("isActive");
      CREATE INDEX IF NOT EXISTS idx_customers_created_at ON "Customers" ("createdAt" DESC);
    `);
    console.log('✓ Customers indexes created');
    
    // Users indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON "Users" ("email");
      CREATE INDEX IF NOT EXISTS idx_users_role ON "Users" ("role");
      CREATE INDEX IF NOT EXISTS idx_users_is_active ON "Users" ("isActive");
    `);
    console.log('✓ Users indexes created');
    
    // Invoice Items indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON "InvoiceItems" ("invoiceId");
      CREATE INDEX IF NOT EXISTS idx_invoice_items_item_id ON "InvoiceItems" ("itemId");
    `);
    console.log('✓ Invoice Items indexes created');
    
    // Quote Items indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON "QuoteItems" ("quoteId");
      CREATE INDEX IF NOT EXISTS idx_quote_items_item_id ON "QuoteItems" ("itemId");
    `);
    console.log('✓ Quote Items indexes created');
    
    // Quotes indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON "Quotes" ("customerId");
      CREATE INDEX IF NOT EXISTS idx_quotes_status ON "Quotes" ("status");
      CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON "Quotes" ("validUntil");
    `);
    console.log('✓ Quotes indexes created');
    
    // Audit Logs indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON "AuditLogs" ("userId");
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON "AuditLogs" ("action");
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON "AuditLogs" ("resourceType");
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON "AuditLogs" ("createdAt" DESC);
    `);
    console.log('✓ Audit Logs indexes created');
    
    console.log('✓ All database indexes created successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to create indexes:', error);
    process.exit(1);
  }
};

addIndexes();
