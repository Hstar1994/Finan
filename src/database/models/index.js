const { sequelize } = require('../connection');

// Import models
const User = require('./User');
const Customer = require('./Customer');
const Item = require('./Item');
const Invoice = require('./Invoice');
const InvoiceItem = require('./InvoiceItem');
const Quote = require('./Quote');
const QuoteItem = require('./QuoteItem');
const Receipt = require('./Receipt');
const CreditNote = require('./CreditNote');
const CreditNoteItem = require('./CreditNoteItem');
const AuditLog = require('./AuditLog');

// Define relationships

// Customer relationships
Customer.hasMany(Invoice, { foreignKey: 'customerId', as: 'invoices' });
Invoice.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Customer.hasMany(Quote, { foreignKey: 'customerId', as: 'quotes' });
Quote.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Customer.hasMany(Receipt, { foreignKey: 'customerId', as: 'receipts' });
Receipt.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Customer.hasMany(CreditNote, { foreignKey: 'customerId', as: 'creditNotes' });
CreditNote.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// Invoice relationships
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId', as: 'items', onDelete: 'CASCADE' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

Invoice.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Invoice.hasMany(Receipt, { foreignKey: 'invoiceId', as: 'receipts' });
Receipt.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

Invoice.hasMany(CreditNote, { foreignKey: 'invoiceId', as: 'creditNotes' });
CreditNote.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

// Quote relationships
Quote.hasMany(QuoteItem, { foreignKey: 'quoteId', as: 'items', onDelete: 'CASCADE' });
QuoteItem.belongsTo(Quote, { foreignKey: 'quoteId', as: 'quote' });

Quote.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Credit Note relationships
CreditNote.hasMany(CreditNoteItem, { foreignKey: 'creditNoteId', as: 'items', onDelete: 'CASCADE' });
CreditNoteItem.belongsTo(CreditNote, { foreignKey: 'creditNoteId', as: 'creditNote' });

CreditNote.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Receipt relationships
Receipt.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Item relationships
Item.hasMany(InvoiceItem, { foreignKey: 'itemId', as: 'invoiceItems' });
InvoiceItem.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

Item.hasMany(QuoteItem, { foreignKey: 'itemId', as: 'quoteItems' });
QuoteItem.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

Item.hasMany(CreditNoteItem, { foreignKey: 'itemId', as: 'creditNoteItems' });
CreditNoteItem.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

// Audit Log relationships
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Export models
module.exports = {
  sequelize,
  User,
  Customer,
  Item,
  Invoice,
  InvoiceItem,
  Quote,
  QuoteItem,
  Receipt,
  CreditNote,
  CreditNoteItem,
  AuditLog
};
