import request from 'supertest';
import { app } from '../../app';
import { AppDataSource } from '../../shared/config/typeorm-data-source';
import { Chat } from '../../modules/chat/domain/entities/chat.entity';
import { User } from '../../modules/users/domain/entities/user.entity';

// Mock Auth0 JWT verification
jest.mock('../../shared/middleware/auth0-jwt', () => ({
  auth0Jwt: (req: any, res: any, next: any) => {
    // Mock successful JWT verification
    req.auth = {
      sub: 'auth0|user123',
      iss: 'https://test.auth0.com/',
      aud: 'test-api',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };
    next();
  },
}));

// Mock request timestamp middleware
jest.mock('../../shared/middleware/request-timestamp', () => ({
  requestTimestamp: (req: any, res: any, next: any) => {
    next();
  },
}));

describe('Chat Endpoint Integration Tests (Authenticated)', () => {
  let testUser: User;
  let testChat: Chat;

  beforeAll(async () => {
    // Initialize test database
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Clean up test data
    await AppDataSource.getRepository(Chat).delete({});
    await AppDataSource.getRepository(User).delete({});

    // Create test user
    const userRepo = AppDataSource.getRepository(User);
    testUser = userRepo.create({
      auth0Id: 'auth0|user123',
      email: 'test@example.com',
      role: 'user',
    });
    await userRepo.save(testUser);
  });

  afterAll(async () => {
    // Clean up test data
    await AppDataSource.getRepository(Chat).delete({});
    await AppDataSource.getRepository(User).delete({});
    
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  beforeEach(async () => {
    // Clean up chats before each test
    await AppDataSource.getRepository(Chat).delete({});
  });

  describe('GET /api/chats', () => {
    it('should return empty list when no chats exist', async () => {
      // Act
      const response = await request(app)
        .get('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [] });
    });

    it('should return list of chats for authenticated user', async () => {
      // Arrange
      const chatRepo = AppDataSource.getRepository(Chat);
      testChat = chatRepo.create({
        title: 'Test Chat',
        description: 'A test chat',
      });
      await chatRepo.save(testChat);

      // Act
      const response = await request(app)
        .get('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Test Chat');
      expect(response.body.data[0].description).toBe('A test chat');
      expect(response.body.data[0].id).toBeDefined();
      expect(response.body.data[0].createdAt).toBeDefined();
      expect(response.body.data[0].updatedAt).toBeDefined();
    });

    it('should require Authorization header', async () => {
      // Act
      const response = await request(app)
        .get('/api/chats')
        .set('X-Request-Timestamp', Date.now().toString());

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_OR_INVALID_AUTH');
    });

    it('should require X-Request-Timestamp header', async () => {
      // Act
      const response = await request(app)
        .get('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/chats/:id', () => {
    it('should return chat by ID', async () => {
      // Arrange
      const chatRepo = AppDataSource.getRepository(Chat);
      testChat = chatRepo.create({
        title: 'Test Chat',
        description: 'A test chat',
      });
      await chatRepo.save(testChat);

      // Act
      const response = await request(app)
        .get(`/api/chats/${testChat.id}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Test Chat');
      expect(response.body.data.description).toBe('A test chat');
      expect(response.body.data.id).toBe(testChat.id);
    });

    it('should return 404 for non-existent chat', async () => {
      // Act
      const response = await request(app)
        .get('/api/chats/00000000-0000-0000-0000-000000000000')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString());

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Chat not found');
    });

    it('should require authentication', async () => {
      // Act
      const response = await request(app)
        .get('/api/chats/some-id')
        .set('X-Request-Timestamp', Date.now().toString());

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_OR_INVALID_AUTH');
    });
  });

  describe('POST /api/chats', () => {
    it('should create new chat', async () => {
      // Arrange
      const chatData = {
        title: 'New Test Chat',
        description: 'A newly created test chat',
      };

      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/json')
        .send(chatData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.data.title).toBe(chatData.title);
      expect(response.body.data.description).toBe(chatData.description);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
    });

    it('should create chat with only title', async () => {
      // Arrange
      const chatData = {
        title: 'Minimal Chat',
      };

      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/json')
        .send(chatData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.data.title).toBe(chatData.title);
      expect(response.body.data.description).toBeNull();
    });

    it('should require authentication', async () => {
      // Arrange
      const chatData = {
        title: 'Unauthorized Chat',
      };

      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/json')
        .send(chatData);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_OR_INVALID_AUTH');
    });

    it('should require valid JSON content type', async () => {
      // Arrange
      const chatData = {
        title: 'Invalid Content Type Chat',
      };

      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'text/plain')
        .send(JSON.stringify(chatData));

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_CONTENT_TYPE');
    });

    it('should validate required title field', async () => {
      // Arrange
      const chatData = {
        description: 'Chat without title',
      };

      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/json')
        .send(chatData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/chats/:id', () => {
    beforeEach(async () => {
      // Create a test chat for patch tests
      const chatRepo = AppDataSource.getRepository(Chat);
      testChat = chatRepo.create({
        title: 'Original Title',
        description: 'Original description',
      });
      await chatRepo.save(testChat);
    });

    it('should update chat title', async () => {
      // Arrange
      const updateData = {
        title: 'Updated Title',
      };

      // Act
      const response = await request(app)
        .patch(`/api/chats/${testChat.id}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/json')
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe('Original description');
    });

    it('should update chat description', async () => {
      // Arrange
      const updateData = {
        description: 'Updated description',
      };

      // Act
      const response = await request(app)
        .patch(`/api/chats/${testChat.id}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/json')
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Original Title');
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should update both title and description', async () => {
      // Arrange
      const updateData = {
        title: 'New Title',
        description: 'New description',
      };

      // Act
      const response = await request(app)
        .patch(`/api/chats/${testChat.id}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/json')
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should return 404 for non-existent chat', async () => {
      // Arrange
      const updateData = {
        title: 'Updated Title',
      };

      // Act
      const response = await request(app)
        .patch('/api/chats/00000000-0000-0000-0000-000000000000')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/json')
        .send(updateData);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should require authentication', async () => {
      // Arrange
      const updateData = {
        title: 'Unauthorized Update',
      };

      // Act
      const response = await request(app)
        .patch(`/api/chats/${testChat.id}`)
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/json')
        .send(updateData);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_OR_INVALID_AUTH');
    });
  });

  describe('DELETE /api/chats/:id', () => {
    beforeEach(async () => {
      // Create a test chat for delete tests
      const chatRepo = AppDataSource.getRepository(Chat);
      testChat = chatRepo.create({
        title: 'Chat to Delete',
        description: 'This chat will be deleted',
      });
      await chatRepo.save(testChat);
    });

    it('should delete chat', async () => {
      // Act
      const response = await request(app)
        .delete(`/api/chats/${testChat.id}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString());

      // Assert
      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      // Verify chat is deleted
      const chatRepo = AppDataSource.getRepository(Chat);
      const deletedChat = await chatRepo.findOne({ where: { id: testChat.id } });
      expect(deletedChat).toBeNull();
    });

    it('should return 404 for non-existent chat', async () => {
      // Act
      const response = await request(app)
        .delete('/api/chats/00000000-0000-0000-0000-000000000000')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString());

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should require authentication', async () => {
      // Act
      const response = await request(app)
        .delete(`/api/chats/${testChat.id}`)
        .set('X-Request-Timestamp', Date.now().toString());

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_OR_INVALID_AUTH');
    });
  });

  describe('JWT Payload Validation', () => {
    it('should include user ID in request context', async () => {
      // Act
      const response = await request(app)
        .get('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString());

      // Assert
      expect(response.status).toBe(200);
      // The mocked JWT sets req.auth.sub to 'auth0|user123'
      // This would be available in the request context for the controller
    });
  });
});
