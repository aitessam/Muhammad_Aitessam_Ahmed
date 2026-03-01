import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'app_db',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },
  auth0: {
    domain: process.env.AUTH0_DOMAIN ?? '',
    audience: process.env.AUTH0_AUDIENCE ?? '',
    issuer: process.env.AUTH0_ISSUER ?? '',
    jwksUri: process.env.AUTH0_JWKS_URI ?? '',
    rolesClaim: process.env.AUTH0_ROLES_CLAIM ?? 'https://api.example.com/roles',
    requestTimestampWindowSeconds: parseInt(
      process.env.AUTH_REQUEST_TIMESTAMP_WINDOW ?? '300',
      10
    ),
  },
  security: {
    corsWhitelist: (process.env.CORS_WHITELIST ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    requestTimeoutMs: parseInt(
      process.env.REQUEST_TIMEOUT_MS ?? '30000',
      10
    ),
    bodyLimit: process.env.BODY_LIMIT ?? '10kb',
  },
} as const;
