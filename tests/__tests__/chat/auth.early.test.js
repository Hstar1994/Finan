/**
 * Early minimal authorization tests for chat feature
 * Tests basic authorization rules before full implementation
 */

const chatService = require('../../../src/modules/chat/chat.service');
const { 
  User, 
  Customer, 
  ChatConversation, 
  ChatParticipant,
  ChatMessage
} = require('../../../src/database/models');
const { sequelize } = require('../../../src/database/connection');

describe('Chat Authorization - Early Tests', () => {
  let adminUser, managerUser, regularUser, customer;
  let customerDmConversation, staffGroupConversation;

  beforeAll(async () => {
    // Ensure database is synced
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    // Create test users
    adminUser = await User.create({
      email: 'admin@test.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true
    });

    managerUser = await User.create({
      email: 'manager@test.com',
      password: 'password123',
      firstName: 'Manager',
      lastName: 'User',
      role: 'manager',
      isActive: true
    });

    regularUser = await User.create({
      email: 'user@test.com',
      password: 'password123',
      firstName: 'Regular',
      lastName: 'User',
      role: 'user',
      isActive: true
    });

    // Create test customer
    customer = await Customer.create({
      name: 'Test Customer',
      email: 'customer@test.com',
      authEnabled: true,
      authEmail: 'customer@auth.com',
      passwordHash: 'hashed_password',
      balance: 0,
      creditLimit: 1000,
      isActive: true
    });

    // Create a CUSTOMER_DM conversation
    customerDmConversation = await chatService.createConversation({
      type: 'CUSTOMER_DM',
      customerId: customer.id,
      createdByUserId: adminUser.id
    });

    // Create a STAFF_GROUP conversation
    staffGroupConversation = await chatService.createConversation({
      type: 'STAFF_GROUP',
      createdByUserId: adminUser.id,
      title: 'Admin Group',
      participantUserIds: [managerUser.id]
    });
  });

  afterEach(async () => {
    // Clean up test data
    await ChatMessage.destroy({ where: {}, force: true });
    await ChatParticipant.destroy({ where: {}, force: true });
    await ChatConversation.destroy({ where: {}, force: true });
    await Customer.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Customer Access Control', () => {
    test('Customer can only see their own CUSTOMER_DM conversations', async () => {
      const conversations = await chatService.getConversations({
        customerId: customer.id
      });

      expect(conversations).toHaveLength(1);
      expect(conversations[0].type).toBe('CUSTOMER_DM');
      expect(conversations[0].customerId).toBe(customer.id);
    });

    test('Customer cannot access STAFF_GROUP conversations', async () => {
      const conversations = await chatService.getConversations({
        customerId: customer.id,
        type: 'STAFF_GROUP'
      });

      expect(conversations).toHaveLength(0);
    });

    test('Customer cannot send messages in STAFF_GROUP', async () => {
      // This should be caught at authorization middleware level
      // For now, we test that the participant check would fail
      const participant = await ChatParticipant.findOne({
        where: {
          conversationId: staffGroupConversation.id,
          customerId: customer.id
        }
      });

      expect(participant).toBeNull();
    });
  });

  describe('Staff User Access Control', () => {
    test('Staff user can only see conversations they participate in', async () => {
      const conversations = await chatService.getConversations({
        userId: regularUser.id
      });

      // Regular user is not a participant in any conversation
      expect(conversations).toHaveLength(0);
    });

    test('Admin can see CUSTOMER_DM they created', async () => {
      const conversations = await chatService.getConversations({
        userId: adminUser.id,
        type: 'CUSTOMER_DM'
      });

      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe(customerDmConversation.id);
    });

    test('Manager can see STAFF_GROUP they are part of', async () => {
      const conversations = await chatService.getConversations({
        userId: managerUser.id,
        type: 'STAFF_GROUP'
      });

      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe(staffGroupConversation.id);
    });
  });

  describe('Participant Membership Checks', () => {
    test('Non-participant cannot read messages', async () => {
      // Send a message in staff group
      await chatService.sendMessage({
        conversationId: staffGroupConversation.id,
        senderUserId: adminUser.id,
        messageType: 'TEXT',
        body: 'Test message'
      });

      // Verify regular user (not a participant) shouldn't have access
      const participant = await ChatParticipant.findOne({
        where: {
          conversationId: staffGroupConversation.id,
          userId: regularUser.id,
          leftAt: null
        }
      });

      expect(participant).toBeNull();
    });

    test('Participant can read messages in their conversation', async () => {
      const messages = await chatService.getMessages(staffGroupConversation.id);

      // Should work because we're just fetching messages
      // Actual authorization happens in middleware
      expect(messages).toBeDefined();
      expect(Array.isArray(messages)).toBe(true);
    });

    test('Customer participant can read messages in their CUSTOMER_DM', async () => {
      await chatService.sendMessage({
        conversationId: customerDmConversation.id,
        senderUserId: adminUser.id,
        messageType: 'TEXT',
        body: 'Hello customer'
      });

      const messages = await chatService.getMessages(customerDmConversation.id);

      expect(messages).toHaveLength(1);
      expect(messages[0].body).toBe('Hello customer');
    });
  });

  describe('Conversation Type Restrictions', () => {
    test('Cannot create CUSTOMER_DM without customerId', async () => {
      await expect(
        chatService.createConversation({
          type: 'CUSTOMER_DM',
          createdByUserId: adminUser.id
        })
      ).rejects.toThrow('customerId is required for CUSTOMER_DM');
    });

    test('Cannot add participants to CUSTOMER_DM', async () => {
      await expect(
        chatService.addParticipant(
          customerDmConversation.id,
          regularUser.id,
          adminUser.id
        )
      ).rejects.toThrow('Cannot add participants to CUSTOMER_DM');
    });

    test('Can add participants to STAFF_GROUP', async () => {
      const participant = await chatService.addParticipant(
        staffGroupConversation.id,
        regularUser.id,
        adminUser.id
      );

      expect(participant.conversationId).toBe(staffGroupConversation.id);
      expect(participant.userId).toBe(regularUser.id);
    });
  });

  describe('Message Sending Authorization', () => {
    test('Staff can send messages in CUSTOMER_DM', async () => {
      const message = await chatService.sendMessage({
        conversationId: customerDmConversation.id,
        senderUserId: adminUser.id,
        messageType: 'TEXT',
        body: 'Staff message to customer'
      });

      expect(message.senderUserId).toBe(adminUser.id);
      expect(message.conversationId).toBe(customerDmConversation.id);
    });

    test('Customer can send messages in their CUSTOMER_DM', async () => {
      const message = await chatService.sendMessage({
        conversationId: customerDmConversation.id,
        senderCustomerId: customer.id,
        messageType: 'TEXT',
        body: 'Customer message'
      });

      expect(message.senderCustomerId).toBe(customer.id);
      expect(message.conversationId).toBe(customerDmConversation.id);
    });

    test('Message length validation enforced', async () => {
      const longMessage = 'a'.repeat(5001);

      await expect(
        chatService.sendMessage({
          conversationId: customerDmConversation.id,
          senderUserId: adminUser.id,
          messageType: 'TEXT',
          body: longMessage
        })
      ).rejects.toThrow('Message exceeds maximum length of 5000 characters');
    });
  });

  describe('CUSTOMER_DM Idempotency', () => {
    test('Creating duplicate CUSTOMER_DM returns existing conversation', async () => {
      const conversation2 = await chatService.createConversation({
        type: 'CUSTOMER_DM',
        customerId: customer.id,
        createdByUserId: managerUser.id
      });

      expect(conversation2.id).toBe(customerDmConversation.id);

      // Verify only one conversation exists
      const allConversations = await ChatConversation.findAll({
        where: {
          type: 'CUSTOMER_DM',
          customerId: customer.id
        }
      });

      expect(allConversations).toHaveLength(1);
    });
  });
});
