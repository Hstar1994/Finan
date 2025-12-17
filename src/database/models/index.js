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

// Chat models
const ChatConversation = require('./ChatConversation');
const ChatParticipant = require('./ChatParticipant');
const ChatMessage = require('./ChatMessage');
const ChatReviewPin = require('./ChatReviewPin');
const ChatReviewPinLink = require('./ChatReviewPinLink');

// Define relationships

// Customer relationships (RESTRICT deletion if related records exist)
Customer.hasMany(Invoice, { 
  foreignKey: 'customerId', 
  as: 'invoices',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
Invoice.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Customer.hasMany(Quote, { 
  foreignKey: 'customerId', 
  as: 'quotes',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
Quote.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Customer.hasMany(Receipt, { 
  foreignKey: 'customerId', 
  as: 'receipts',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
Receipt.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Customer.hasMany(CreditNote, { 
  foreignKey: 'customerId', 
  as: 'creditNotes',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
CreditNote.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// Invoice relationships
Invoice.hasMany(InvoiceItem, { 
  foreignKey: 'invoiceId', 
  as: 'items', 
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

Invoice.belongsTo(User, { 
  foreignKey: 'createdBy', 
  as: 'creator',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

Invoice.hasMany(Receipt, { 
  foreignKey: 'invoiceId', 
  as: 'receipts',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
Receipt.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

Invoice.hasMany(CreditNote, { 
  foreignKey: 'invoiceId', 
  as: 'creditNotes',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
CreditNote.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

// Quote relationships
Quote.hasMany(QuoteItem, { 
  foreignKey: 'quoteId', 
  as: 'items', 
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
QuoteItem.belongsTo(Quote, { foreignKey: 'quoteId', as: 'quote' });

Quote.belongsTo(User, { 
  foreignKey: 'createdBy', 
  as: 'creator',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

// Credit Note relationships
CreditNote.hasMany(CreditNoteItem, { 
  foreignKey: 'creditNoteId', 
  as: 'items', 
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
CreditNoteItem.belongsTo(CreditNote, { foreignKey: 'creditNoteId', as: 'creditNote' });

CreditNote.belongsTo(User, { 
  foreignKey: 'createdBy', 
  as: 'creator',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

// Receipt relationships
Receipt.belongsTo(User, { 
  foreignKey: 'createdBy', 
  as: 'creator',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

// Item relationships (RESTRICT deletion if used in documents)
Item.hasMany(InvoiceItem, { 
  foreignKey: 'itemId', 
  as: 'invoiceItems',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
InvoiceItem.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

Item.hasMany(QuoteItem, { 
  foreignKey: 'itemId', 
  as: 'quoteItems',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
QuoteItem.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

Item.hasMany(CreditNoteItem, { 
  foreignKey: 'itemId', 
  as: 'creditNoteItems',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
CreditNoteItem.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

// Audit Log relationships
AuditLog.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

// Chat relationships

// ChatConversation relationships
ChatConversation.belongsTo(Customer, {
  foreignKey: 'customerId',
  as: 'customer',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Customer.hasMany(ChatConversation, {
  foreignKey: 'customerId',
  as: 'chatConversations',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

ChatConversation.belongsTo(User, {
  foreignKey: 'createdByUserId',
  as: 'creator',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
User.hasMany(ChatConversation, {
  foreignKey: 'createdByUserId',
  as: 'createdConversations',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

ChatConversation.hasMany(ChatParticipant, {
  foreignKey: 'conversationId',
  as: 'participants',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

ChatConversation.hasMany(ChatMessage, {
  foreignKey: 'conversationId',
  as: 'messages',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

ChatConversation.hasMany(ChatReviewPin, {
  foreignKey: 'conversationId',
  as: 'reviewPins',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// ChatParticipant relationships
ChatParticipant.belongsTo(ChatConversation, {
  foreignKey: 'conversationId',
  as: 'conversation',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

ChatParticipant.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
User.hasMany(ChatParticipant, {
  foreignKey: 'userId',
  as: 'chatParticipations',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

ChatParticipant.belongsTo(Customer, {
  foreignKey: 'customerId',
  as: 'customer',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Customer.hasMany(ChatParticipant, {
  foreignKey: 'customerId',
  as: 'chatParticipations',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

ChatParticipant.belongsTo(ChatMessage, {
  foreignKey: 'lastReadMessageId',
  as: 'lastReadMessage',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

// ChatMessage relationships
ChatMessage.belongsTo(ChatConversation, {
  foreignKey: 'conversationId',
  as: 'conversation',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

ChatMessage.belongsTo(User, {
  foreignKey: 'senderUserId',
  as: 'senderUser',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
User.hasMany(ChatMessage, {
  foreignKey: 'senderUserId',
  as: 'sentMessages',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

ChatMessage.belongsTo(Customer, {
  foreignKey: 'senderCustomerId',
  as: 'senderCustomer',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
Customer.hasMany(ChatMessage, {
  foreignKey: 'senderCustomerId',
  as: 'sentMessages',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

ChatMessage.hasMany(ChatReviewPin, {
  foreignKey: 'sourceMessageId',
  as: 'reviewPins',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// ChatReviewPin relationships
ChatReviewPin.belongsTo(ChatConversation, {
  foreignKey: 'conversationId',
  as: 'conversation',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

ChatReviewPin.belongsTo(ChatMessage, {
  foreignKey: 'sourceMessageId',
  as: 'sourceMessage',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

ChatReviewPin.belongsTo(User, {
  foreignKey: 'createdByUserId',
  as: 'creator',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

ChatReviewPin.belongsTo(User, {
  foreignKey: 'resolvedByUserId',
  as: 'resolver',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

ChatReviewPin.hasMany(ChatReviewPinLink, {
  foreignKey: 'pinId',
  as: 'links',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// ChatReviewPinLink relationships
ChatReviewPinLink.belongsTo(ChatReviewPin, {
  foreignKey: 'pinId',
  as: 'pin',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

ChatReviewPinLink.belongsTo(User, {
  foreignKey: 'addedByUserId',
  as: 'addedBy',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

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
  AuditLog,
  ChatConversation,
  ChatParticipant,
  ChatMessage,
  ChatReviewPin,
  ChatReviewPinLink
};
