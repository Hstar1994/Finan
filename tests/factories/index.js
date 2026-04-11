/**
 * Test Data Factories
 * Provides factory functions for creating test data
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique ID
 */
function generateId() {
  return uuidv4();
}

/**
 * Create a user factory
 */
function createUser(overrides = {}) {
  const id = overrides.id || generateId();
  return {
    id,
    email: overrides.email || `user-${id.slice(0, 8)}@test.com`,
    password: overrides.password || '$2b$10$hashedpassword', // bcrypt hash placeholder
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'User',
    role: overrides.role || 'employee',
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides
  };
}

/**
 * Create a customer factory
 */
function createCustomer(overrides = {}) {
  const id = overrides.id || generateId();
  return {
    id,
    name: overrides.name || `Test Customer ${id.slice(0, 8)}`,
    email: overrides.email || `customer-${id.slice(0, 8)}@test.com`,
    phone: overrides.phone || '+1234567890',
    address: overrides.address || '123 Test Street',
    city: overrides.city || 'Test City',
    country: overrides.country || 'Test Country',
    notes: overrides.notes || null,
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides
  };
}

/**
 * Create an item factory
 */
function createItem(overrides = {}) {
  const id = overrides.id || generateId();
  return {
    id,
    name: overrides.name || `Test Item ${id.slice(0, 8)}`,
    description: overrides.description || 'Test item description',
    price: overrides.price || 99.99,
    unit: overrides.unit || 'piece',
    sku: overrides.sku || `SKU-${id.slice(0, 8)}`,
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides
  };
}

/**
 * Create an invoice factory
 */
function createInvoice(overrides = {}) {
  const id = overrides.id || generateId();
  return {
    id,
    invoiceNumber: overrides.invoiceNumber || `INV-${Date.now()}`,
    customerId: overrides.customerId || generateId(),
    status: overrides.status || 'draft',
    issueDate: overrides.issueDate || new Date(),
    dueDate: overrides.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    subtotal: overrides.subtotal || 100.00,
    tax: overrides.tax || 10.00,
    total: overrides.total || 110.00,
    notes: overrides.notes || null,
    createdBy: overrides.createdBy || generateId(),
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides
  };
}

/**
 * Create an invoice item factory
 */
function createInvoiceItem(overrides = {}) {
  const id = overrides.id || generateId();
  return {
    id,
    invoiceId: overrides.invoiceId || generateId(),
    itemId: overrides.itemId || generateId(),
    description: overrides.description || 'Invoice item description',
    quantity: overrides.quantity || 1,
    unitPrice: overrides.unitPrice || 99.99,
    total: overrides.total || 99.99,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides
  };
}

/**
 * Create a quote factory
 */
function createQuote(overrides = {}) {
  const id = overrides.id || generateId();
  return {
    id,
    quoteNumber: overrides.quoteNumber || `QT-${Date.now()}`,
    customerId: overrides.customerId || generateId(),
    status: overrides.status || 'draft',
    issueDate: overrides.issueDate || new Date(),
    expiryDate: overrides.expiryDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    subtotal: overrides.subtotal || 100.00,
    tax: overrides.tax || 10.00,
    total: overrides.total || 110.00,
    notes: overrides.notes || null,
    createdBy: overrides.createdBy || generateId(),
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides
  };
}

/**
 * Create a receipt factory
 */
function createReceipt(overrides = {}) {
  const id = overrides.id || generateId();
  return {
    id,
    receiptNumber: overrides.receiptNumber || `RCP-${Date.now()}`,
    invoiceId: overrides.invoiceId || generateId(),
    customerId: overrides.customerId || generateId(),
    amount: overrides.amount || 110.00,
    paymentMethod: overrides.paymentMethod || 'cash',
    paymentDate: overrides.paymentDate || new Date(),
    notes: overrides.notes || null,
    createdBy: overrides.createdBy || generateId(),
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides
  };
}

/**
 * Create a conversation factory (for chat)
 */
function createConversation(overrides = {}) {
  const id = overrides.id || generateId();
  return {
    id,
    title: overrides.title || `Test Conversation ${id.slice(0, 8)}`,
    type: overrides.type || 'STAFF_GROUP',
    customerId: overrides.customerId || null,
    createdBy: overrides.createdBy || generateId(),
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides
  };
}

/**
 * Create a message factory (for chat)
 */
function createMessage(overrides = {}) {
  const id = overrides.id || generateId();
  return {
    id,
    conversationId: overrides.conversationId || generateId(),
    senderId: overrides.senderId || generateId(),
    content: overrides.content || 'Test message content',
    isEdited: overrides.isEdited || false,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides
  };
}

/**
 * Create a participant factory (for chat)
 */
function createParticipant(overrides = {}) {
  const id = overrides.id || generateId();
  return {
    id,
    conversationId: overrides.conversationId || generateId(),
    userId: overrides.userId || generateId(),
    role: overrides.role || 'member',
    joinedAt: overrides.joinedAt || new Date(),
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides
  };
}

/**
 * Create multiple items using a factory
 * @param {Function} factory - Factory function
 * @param {number} count - Number of items to create
 * @param {Object|Function} overrides - Overrides for each item (or function returning overrides)
 * @returns {Array} Array of created items
 */
function createMany(factory, count, overrides = {}) {
  return Array.from({ length: count }, (_, index) => {
    const itemOverrides = typeof overrides === 'function' 
      ? overrides(index) 
      : overrides;
    return factory(itemOverrides);
  });
}

module.exports = {
  generateId,
  createUser,
  createCustomer,
  createItem,
  createInvoice,
  createInvoiceItem,
  createQuote,
  createReceipt,
  createConversation,
  createMessage,
  createParticipant,
  createMany
};
