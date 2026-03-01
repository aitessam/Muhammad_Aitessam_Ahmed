# TypeScript Backend (Express + TypeORM + DDD)

Production-grade TypeScript backend with Express, PostgreSQL via TypeORM, and Domain-Driven Design structure.

## Architecture Decisions

### Domain-Driven Design (DDD) Structure

This project follows DDD principles to maintain clear separation of concerns and improve maintainability:

#### **Why DDD?**
- **Business Logic Isolation**: Domain rules are isolated from infrastructure concerns
- **Testability**: Pure domain logic can be unit tested without external dependencies
- **Scalability**: Clear boundaries make it easier to scale and evolve the system
- **Team Collaboration**: Different teams can work on different domains independently

#### **Layer Breakdown**

```
src/
├── modules/                    # Bounded Contexts
│   ├── chat/                   # Chat Management Domain
│   │   ├── domain/             # Core Business Logic
│   │   │   ├── entities/       # Domain Entities (Chat, ChatMessage)
│   │   │   ├── services/       # Domain Services (ChatQuotaService)
│   │   │   └── errors/         # Domain-Specific Errors
│   │   ├── repositories/       # Data Access Layer
│   │   │   └── chat.repository.ts
│   │   └── controllers/        # API Layer
│   │       └── chat.controller.ts
│   ├── subscriptions/          # Subscription Management Domain
│   │   ├── domain/             # Core Business Logic
│   │   │   ├── entities/       # Domain Entities (Subscription, SubscriptionBundle)
│   │   │   ├── services/       # Domain Services (SubscriptionService)
│   │   │   └── errors/         # Domain-Specific Errors
│   │   ├── repositories/       # Data Access Layer
│   │   └── controllers/        # API Layer
│   ├── users/                  # User Management Domain
│   └── usage/                  # Usage Tracking Domain
├── shared/                     # Cross-Cutting Concerns
│   ├── config/                 # Configuration Management
│   ├── middleware/             # Express Middleware
│   ├── errors/                 # Shared Error Types
│   ├── logger/                 # Structured Logging
│   └── types/                  # Shared Type Definitions
└── app.ts                      # Application Composition
```

#### **Key Architectural Patterns**

1. **Repository Pattern**: Abstracts data access, enables testing with mocks
2. **Domain Services**: Encapsulates business logic that doesn't naturally fit in entities
3. **CQRS-like Separation**: Clear separation between read (controllers) and write (services) operations
4. **Dependency Injection**: Services depend on abstractions, not concrete implementations

### Technology Choices

| Technology | Reason for Choice |
|------------|-------------------|
| **Express** | Mature, flexible, extensive middleware ecosystem |
| **TypeScript** | Type safety, better IDE support, catch errors at compile time |
| **TypeORM** | Excellent TypeScript support, migrations, active development |
| **PostgreSQL** | ACID compliance, JSON support, scalable |
| **Winston** | Structured logging, multiple transports, production-ready |
| **Auth0** | Enterprise-grade auth, JWT handling, RBAC support |

## Security Model

### Token Validation Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Auth0
    
    Client->>API: Request + JWT + Timestamp
    API->>API: 1. Validate Request Timestamp
    API->>Auth0: 2. Fetch JWKS
    API->>API: 3. Verify JWT Signature
    API->>API: 4. Validate Claims (iss, aud, exp)
    API->>API: 5. Extract User Info & Roles
    API->>Client: Response (or 401/403)
```

#### **1. Request Timestamp Validation**
- **Purpose**: Prevent replay attacks
- **Header**: `X-Request-Timestamp`
- **Format**: Unix seconds or ISO 8601
- **Window**: ±5 minutes (configurable)
- **Implementation**: `requestTimestamp` middleware

#### **2. JWT Verification**
- **Algorithm**: RS256 (Public/Private key)
- **Validation Steps**:
  - Fetch JWKS from Auth0
  - Verify signature using public key
  - Check issuer (`iss`) matches configured domain
  - Check audience (`aud`) matches configured API identifier
  - Check token expiration (`exp`)
- **Implementation**: `auth0Jwt` middleware

#### **3. Role-Based Access Control (RBAC)**
- **Source**: Auth0 token claims (namespaced custom claim)
- **Roles**: `user`, `admin`
- **Middleware**:
  - `requireUser`: Allows `user` or `admin`
  - `requireAdmin`: Allows `admin` only
  - `requireRoles(['role1', 'role2'])`: Custom role validation

### Additional Security Mechanisms

#### **Rate Limiting Strategy**
| Limiter | Scope | Limit | Window | Purpose |
|---------|-------|-------|--------|---------|
| `authRateLimiter` | IP | 10 requests | 15 minutes | Prevent auth endpoint abuse |
| `chatRateLimiterByIp` | IP | 100 requests | 1 minute | Basic chat protection |
| `chatRateLimiterByUser` | User | 30 requests | 1 minute | Per-user chat limits |
| `subscriptionsRateLimiter` | User/IP | 20 requests | 1 minute | Subscription operations |

#### **Input Validation & Sanitization**
- **Content-Type**: Enforce `application/json` for POST/PATCH
- **Request Size**: Limit payload size (configurable)
- **XSS Protection**: Built-in Express security headers
- **SQL Injection**: Prevented by TypeORM parameterized queries

#### **Security Headers**
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

#### **CORS Configuration**
- **Whitelist**: Configurable allowed origins
- **Methods**: Restrict HTTP methods per endpoint
- **Headers**: Validate preflight requests

### Authentication Flow Example

```bash
# 1. Client obtains JWT from Auth0 (not shown)
# 2. Client makes authenticated request
curl -X POST http://localhost:3000/api/chats \
  -H "Authorization: Bearer <jwt_token>" \
  -H "X-Request-Timestamp: $(date +%s)" \
  -H "Content-Type: application/json" \
  -d '{"title": "New Chat"}'
```

## Local Setup Instructions

### Prerequisites

- **Node.js** >= 18.0.0
- **PostgreSQL** (or use Neon/Supabase)
- **Auth0 Account** (free tier available)

### 1. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/dbname?sslmode=require

# Server Configuration
PORT=3000
NODE_ENV=development

# Logging Configuration
LOG_LEVEL=info

# Auth0 Configuration
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=https://your-domain.auth0.com/api/v2/
AUTH0_ISSUER=https://your-domain.auth0.com/

# Security Configuration
AUTH_REQUEST_TIMESTAMP_WINDOW_SECONDS=300
CORS_WHITELIST=http://localhost:3000,http://localhost:3001
MAX_BODY_SIZE=10kb

# Rate Limiting Configuration
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX_REQUESTS=10
RATE_LIMIT_CHAT_WINDOW_MS=60000
RATE_LIMIT_CHAT_MAX_REQUESTS_IP=100
RATE_LIMIT_CHAT_MAX_REQUESTS_USER=30
```

### 2. Auth0 Setup

#### Step 1: Create Auth0 Application
1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Create **Machine to Machine** application
3. Note down **Domain**, **Client ID**, and **Client Secret**

#### Step 2: Configure API Settings
1. Go to **Applications → APIs** in Auth0 Dashboard
2. Create API with identifier: `https://your-domain.auth0.com/api/v2/`
3. Enable **RBAC** and **Add Permissions in the Access Token**

#### Step 3: Add Roles to Tokens
Create an **Auth0 Action** to add roles to tokens:

```javascript
exports.onExecutePostLogin = async (event) => {
  const namespace = 'https://api.yourapp.com';
  const roles = event.authorization.roles;
  
  if (event.authorization) {
    api.idToken.setCustomClaim(`${namespace}/roles`, roles);
    api.accessToken.setCustomClaim(`${namespace}/roles`, roles);
  }
};
```

#### Step 4: Test Token Acquisition
```bash
# Get access token
curl -X POST https://your-domain.auth0.com/oauth/token \
  -H 'content-type: application/json' \
  -d '{
    "client_id":"YOUR_CLIENT_ID",
    "client_secret":"YOUR_CLIENT_SECRET",
    "audience":"https://your-domain.auth0.com/api/v2/",
    "grant_type":"client_credentials"
  }'
```

### 3. Database Setup

#### Option A: Local PostgreSQL
```bash
# Create database
createdb your_db_name

# Run migrations
npm run migration:run
```

#### Option B: Neon (Recommended for Development)
1. Sign up at [Neon](https://neon.tech/)
2. Create new project
3. Copy connection string to `.env`
4. Run migrations:
```bash
npm run migration:run
```

### 4. Install Dependencies & Run

```bash
# Install all dependencies
npm install

# Run development server
npm run dev

# Or build and run production
npm run build
npm run start
```

### 5. Verify Setup

```bash
# Health check (no auth required)
curl http://localhost:3000/health

# Authenticated endpoint (requires valid JWT)
curl -X GET http://localhost:3000/api/chats \
  -H "Authorization: Bearer <your_jwt>" \
  -H "X-Request-Timestamp: $(date +%s)"
```

## Testing

### Test Structure
```
src/__tests__/
├── integration/              # Integration Tests
│   ├── chat-auth.test.ts     # Authenticated chat endpoints
│   ├── rate-limiting.test.ts # Rate limiting behavior
│   └── security-middleware.test.ts # Security validation
├── setup.ts                  # Global test configuration
└── modules/
    └── */domain/services/__tests__/ # Unit tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- chat-quota.service.test.ts
```

### Test Configuration

- **Framework**: Jest with ts-jest
- **HTTP Testing**: Supertest
- **Database**: In-memory SQLite for tests
- **Auth0 Mocking**: JWT verification mocked via `jest.mock`
- **Environment**: Test-specific environment variables

### Key Test Coverage Areas

1. **Unit Tests**
   - Domain service business logic
   - Quota calculation algorithms
   - Subscription lifecycle management
   - Error handling scenarios

2. **Integration Tests**
   - Full request/response cycle
   - Authentication middleware
   - Rate limiting behavior
   - Security validation
   - Database operations

## Monitoring & Observability

### Health Endpoints

#### `/health` - Basic Health Check
```json
{
  "status": "healthy",
  "db": {
    "status": "connected",
    "responseTime": "15ms"
  },
  "uptime": "120s",
  "timestamp": "2024-03-01T12:00:00.000Z",
  "responseTime": "25ms"
}
```

#### `/api/admin/metrics` - Application Metrics (Admin Only)
```json
{
  "totalUsers": 1250,
  "totalChats": 5420,
  "activeSubscriptions": 180,
  "monthlyUsageStats": [
    {
      "year": 2024,
      "month": 3,
      "totalMessagesUsed": 15420,
      "activeUsers": 234
    }
  ],
  "generatedAt": "2024-03-01T12:00:00.000Z",
  "responseTime": "45ms"
}
```

### Structured Logging

All requests are logged with structured data:
```json
{
  "level": "info",
  "message": "Request completed",
  "timestamp": "2024-03-01T12:00:00.000Z",
  "service": "ts-backend",
  "requestId": "req_123456",
  "userId": "auth0|user123",
  "method": "POST",
  "url": "/api/chats",
  "statusCode": 201,
  "responseTime": "125ms",
  "userAgent": "Mozilla/5.0...",
  "ip": "::1"
}
```

## API Documentation

### Authentication Required Headers
```http
Authorization: Bearer <jwt_token>
X-Request-Timestamp: <unix_seconds_or_iso8601>
Content-Type: application/json
```

### Core Endpoints

#### Chat Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/chats` | List all chats | User |
| GET | `/api/chats/:id` | Get chat by ID | User |
| POST | `/api/chats` | Create chat | User |
| PATCH | `/api/chats/:id` | Update chat | User |
| DELETE | `/api/chats/:id` | Delete chat | User |

#### Subscription Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/subscriptions` | List subscriptions | User |
| POST | `/api/subscriptions` | Create subscription | User |
| PATCH | `/api/subscriptions/:id` | Update subscription | User |

#### Admin Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/admin/dashboard` | Admin dashboard | Admin |
| GET | `/api/admin/metrics` | Application metrics | Admin |

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "requestId": "req_123456"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MISSING_OR_INVALID_AUTH` | 401 | Missing or invalid Authorization header |
| `UNAUTHORIZED` | 401 | Invalid token, timestamp, or permissions |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_CONTENT_TYPE` | 400 | Invalid Content-Type header |
| `REQUEST_TOO_LARGE` | 413 | Request payload exceeds limit |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `QUOTA_EXHAUSTED` | 429 | User quota exhausted |

## Development Workflow

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run start` | Run production build |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

### Database Migrations

```bash
# Generate new migration
npm run migration:generate -- src/shared/config/migrations/CreateNewTable

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Code Quality

- **ESLint**: Enforces coding standards
- **Prettier**: Consistent code formatting
- **TypeScript**: Strict type checking
- **Husky**: Pre-commit hooks (configured in package.json)

## Deployment Considerations

### Environment Variables
All sensitive data should be environment variables:
- Database credentials
- Auth0 secrets
- API keys
- JWT secrets

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure production database
- [ ] Set up SSL/TLS
- [ ] Configure reverse proxy (nginx)
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting for production load
- [ ] Set up database backups
- [ ] Review CORS whitelist for production domains

### Docker Support (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Standards
- Follow TypeScript strict mode
- Write tests for new features
- Update documentation
- Run linting and tests before committing
- Use semantic commit messages

## License

This project is licensed under the ISC License.
