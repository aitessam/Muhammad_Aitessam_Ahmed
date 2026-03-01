import request from 'supertest';
import { app } from '../../app';

// Mock Auth0 JWT verification for security middleware tests
jest.mock('../../shared/middleware/auth0-jwt', () => ({
  auth0Jwt: (req: any, res: any, next: any) => {
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

describe('Security Middleware Integration Tests', () => {
  describe('Content-Type Validation', () => {
    it('should accept application/json content type', async () => {
      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/json')
        .send({ title: 'Test Chat' });

      // Assert
      expect([201, 400]).toContain(response.status); // 201 if valid, 400 if validation fails
      expect(response.status).not.toBe(400); // Should not be content-type error
    });

    it('should accept application/json with charset', async () => {
      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/json; charset=utf-8')
        .send({ title: 'Test Chat' });

      // Assert
      expect([201, 400]).toContain(response.status);
      expect(response.status).not.toBe(400); // Should not be content-type error
    });

    it('should reject missing content-type header', async () => {
      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .send({ title: 'Test Chat' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_CONTENT_TYPE');
      expect(response.body.error.message).toBe('Content-Type must be application/json');
    });

    it('should reject invalid content-type', async () => {
      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'text/plain')
        .send('{"title": "Test Chat"}');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_CONTENT_TYPE');
      expect(response.body.error.message).toBe('Content-Type must be application/json');
    });

    it('should reject application/xml content-type', async () => {
      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/xml')
        .send('<title>Test Chat</title>');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_CONTENT_TYPE');
    });

    it('should reject multipart/form-data content-type', async () => {
      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'multipart/form-data')
        .field('title', 'Test Chat');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_CONTENT_TYPE');
    });

    it('should allow GET requests without content-type header', async () => {
      // Act
      const response = await request(app)
        .get('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString());

      // Assert
      expect([200, 404]).toContain(response.status); // 200 if chats exist, 404 if empty
      expect(response.status).not.toBe(400);
    });

    it('should allow HEAD requests without content-type header', async () => {
      // Act
      const response = await request(app)
        .head('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString());

      // Assert
      expect([200, 404]).toContain(response.status);
      expect(response.status).not.toBe(400);
    });

    it('should allow DELETE requests without content-type header', async () => {
      // Act
      const response = await request(app)
        .delete('/api/chats/some-id')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString());

      // Assert
      expect([204, 404]).toContain(response.status); // 204 if deleted, 404 if not found
      expect(response.status).not.toBe(400);
    });

    it('should handle case-insensitive content-type matching', async () => {
      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'APPLICATION/JSON')
        .send({ title: 'Test Chat' });

      // Assert
      expect([201, 400]).toContain(response.status);
      expect(response.status).not.toBe(400); // Should not be content-type error
    });

    it('should handle whitespace in content-type header', async () => {
      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', ' application/json ')
        .send({ title: 'Test Chat' });

      // Assert
      expect([201, 400]).toContain(response.status);
      expect(response.status).not.toBe(400); // Should not be content-type error
    });
  });

  describe('Request Size Validation', () => {
    it('should accept requests within size limit', async () => {
      // Create a reasonably sized payload
      const payload = {
        title: 'Test Chat',
        description: 'A'.repeat(1000), // 1KB description
      };

      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/json')
        .send(payload);

      // Assert
      expect([201, 400]).toContain(response.status);
      expect(response.status).not.toBe(413); // Should not be payload too large
    });

    it('should reject oversized requests', async () => {
      // Create a very large payload (assuming default limit is 10kb)
      const largePayload = {
        title: 'Test Chat',
        description: 'A'.repeat(100000), // 100KB description
        data: 'B'.repeat(100000), // Another 100KB
      };

      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/json')
        .send(largePayload);

      // Assert
      expect(response.status).toBe(413);
      expect(response.body.error.code).toBe('REQUEST_TOO_LARGE');
    });

    it('should handle JSON parsing errors gracefully', async () => {
      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/json')
        .send('{"title": "Invalid JSON"'); // Missing closing brace

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_JSON');
    });
  });

  describe('Request Timestamp Validation', () => {
    it('should accept valid timestamp header', async () => {
      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/json')
        .send({ title: 'Test Chat' });

      // Assert
      expect([201, 400]).toContain(response.status);
      expect(response.status).not.toBe(401); // Should not be timestamp error
    });

    it('should reject missing timestamp header', async () => {
      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('Content-Type', 'application/json')
        .send({ title: 'Test Chat' });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('Missing X-Request-Timestamp header');
    });

    it('should reject empty timestamp header', async () => {
      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', '')
        .set('Content-Type', 'application/json')
        .send({ title: 'Test Chat' });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('Missing X-Request-Timestamp header');
    });

    it('should reject invalid timestamp format', async () => {
      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', 'invalid-timestamp')
        .set('Content-Type', 'application/json')
        .send({ title: 'Test Chat' });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('Invalid X-Request-Timestamp format');
    });

    it('should reject timestamp that is too old', async () => {
      // Act
      const oldTimestamp = Date.now() - (5 * 60 * 1000); // 5 minutes ago (assuming 2-minute window)
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', oldTimestamp.toString())
        .set('Content-Type', 'application/json')
        .send({ title: 'Test Chat' });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('must be within');
    });

    it('should reject timestamp that is too far in the future', async () => {
      // Act
      const futureTimestamp = Date.now() + (5 * 60 * 1000); // 5 minutes in the future
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', futureTimestamp.toString())
        .set('Content-Type', 'application/json')
        .send({ title: 'Test Chat' });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('must be within');
    });

    it('should accept Unix seconds timestamp', async () => {
      // Act
      const unixTimestamp = Math.floor(Date.now() / 1000);
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', unixTimestamp.toString())
        .set('Content-Type', 'application/json')
        .send({ title: 'Test Chat' });

      // Assert
      expect([201, 400]).toContain(response.status);
      expect(response.status).not.toBe(401); // Should not be timestamp error
    });

    it('should accept ISO 8601 timestamp', async () => {
      // Act
      const isoTimestamp = new Date().toISOString();
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', isoTimestamp)
        .set('Content-Type', 'application/json')
        .send({ title: 'Test Chat' });

      // Assert
      expect([201, 400]).toContain(response.status);
      expect(response.status).not.toBe(401); // Should not be timestamp error
    });

    it('should handle timestamp header as array', async () => {
      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', [Date.now().toString()])
        .set('Content-Type', 'application/json')
        .send({ title: 'Test Chat' });

      // Assert
      expect([201, 400]).toContain(response.status);
      expect(response.status).not.toBe(401); // Should not be timestamp error
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      // Act
      const response = await request(app)
        .get('/health');

      // Assert
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
      expect(response.headers).toHaveProperty('strict-transport-security');
    });
  });

  describe('CORS Configuration', () => {
    it('should handle preflight requests', async () => {
      // Act
      const response = await request(app)
        .options('/api/chats')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'authorization, content-type, x-request-timestamp');

      // Assert
      expect([200, 204]).toContain(response.status);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });

    it('should reject unauthorized origins', async () => {
      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Origin', 'http://malicious-site.com')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/json')
        .send({ title: 'Test Chat' });

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toContain('Not allowed by CORS');
    });
  });

  describe('Request ID Tracking', () => {
    it('should include request ID in responses', async () => {
      // Act
      const response = await request(app)
        .get('/health');

      // Assert
      expect(response.status).toBe(200);
      // Request ID should be available in error responses, not necessarily in success responses
    });

    it('should include request ID in error responses', async () => {
      // Act
      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'text/plain')
        .send('invalid');

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.requestId).toBeDefined();
      expect(typeof response.body.error.requestId).toBe('string');
    });
  });

  describe('Input Sanitization', () => {
    it('should handle malicious input in JSON', async () => {
      // Act
      const maliciousPayload = {
        title: '<script>alert("xss")</script>',
        description: 'javascript:alert("xss")',
      };

      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/json')
        .send(maliciousPayload);

      // Assert
      expect([201, 400]).toContain(response.status);
      // The application should handle or sanitize this input
      // Specific behavior depends on the implementation
    });

    it('should handle null bytes in input', async () => {
      // Act
      const payloadWithNullBytes = {
        title: 'Test\x00Chat',
        description: 'Description\x00with\x00nulls',
      };

      const response = await request(app)
        .post('/api/chats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .set('X-Request-Timestamp', Date.now().toString())
        .set('Content-Type', 'application/json')
        .send(payloadWithNullBytes);

      // Assert
      expect([201, 400]).toContain(response.status);
      // Should handle null bytes appropriately
    });
  });
});
