import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './shared/config';
import { chatController } from './modules/chat/controllers/chat.controller';
import { chatMessageController } from './modules/chat/controllers/chat-message.controller';
import { subscriptionBundleController } from './modules/subscriptions/controllers/subscription-bundle.controller';
import {
  errorHandler,
  notFoundHandler,
  requestId,
  requireJsonContentType,
  requestTimeout,
  haltOnTimedout,
  auth0Jwt,
  requestTimestamp,
  requireUser,
  requireAdmin,
  authRateLimiter,
  chatRateLimiterByIp,
  chatRateLimiterByUser,
  subscriptionsRateLimiter,
  requestTiming,
} from './shared/middleware';
import { ForbiddenError } from './shared/errors';
import { AppDataSource } from './shared/config/typeorm-data-source';

const app = express();

app.use(requestId);
app.use(requestTiming);
app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      const whitelist = config.security.corsWhitelist;
      if (whitelist.length === 0) return cb(null, true);
      if (origin === undefined || whitelist.includes(origin))
        return cb(null, true);
      cb(new ForbiddenError('Not allowed by CORS'));
    },
    optionsSuccessStatus: 200,
  })
);
app.use(express.json({ limit: config.security.bodyLimit }));
app.use(requireJsonContentType);
app.use(requestTimeout);
app.use(haltOnTimedout);

app.get('/health', async (_req, res) => {
  const startTime = Date.now();
  const uptime = process.uptime();
  
  let dbStatus = 'disconnected';
  let dbResponseTime = 0;
  
  try {
    const dbStart = Date.now();
    if (AppDataSource.isInitialized) {
      await AppDataSource.query('SELECT 1');
      dbStatus = 'connected';
      dbResponseTime = Date.now() - dbStart;
    }
  } catch (error) {
    dbStatus = 'error';
  }
  
  const status = dbStatus === 'connected' ? 'healthy' : 'unhealthy';
  
  res.json({
    status,
    db: {
      status: dbStatus,
      responseTime: `${dbResponseTime}ms`
    },
    uptime: `${Math.floor(uptime)}s`,
    timestamp: new Date().toISOString(),
    responseTime: `${Date.now() - startTime}ms`
  });
});

const protectedApi = [auth0Jwt, requestTimestamp, requireUser];

app.use(
  '/api/chats',
  chatRateLimiterByIp,
  ...protectedApi,
  chatRateLimiterByUser,
  chatController
);
app.use(
  '/api/chats',
  chatRateLimiterByIp,
  ...protectedApi,
  chatRateLimiterByUser,
  chatMessageController
);

app.use(
  '/api/subscriptions',
  subscriptionsRateLimiter,
  ...protectedApi,
  subscriptionBundleController
);

const adminApi = [auth0Jwt, requestTimestamp, requireAdmin];
app.get(
  '/api/admin/dashboard',
  authRateLimiter,
  ...adminApi,
  (req, res) => {
    res.json({
      message: 'Admin only',
      userId: req.auth?.sub,
    });
  }
);

app.get(
  '/api/admin/metrics',
  authRateLimiter,
  ...adminApi,
  async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Get total users
      const totalUsersQuery = `SELECT COUNT(*) as count FROM users`;
      const totalUsersResult = await AppDataSource.query(totalUsersQuery);
      const totalUsers = parseInt(totalUsersResult[0]?.count || '0');
      
      // Get total chats
      const totalChatsQuery = `SELECT COUNT(*) as count FROM chats`;
      const totalChatsResult = await AppDataSource.query(totalChatsQuery);
      const totalChats = parseInt(totalChatsResult[0]?.count || '0');
      
      // Get active subscriptions
      const activeSubscriptionsQuery = `SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active' AND expires_at > NOW()`;
      const activeSubscriptionsResult = await AppDataSource.query(activeSubscriptionsQuery);
      const activeSubscriptions = parseInt(activeSubscriptionsResult[0]?.count || '0');
      
      // Get monthly usage stats for the last 12 months
      const monthlyUsageStatsQuery = `
        SELECT 
          year,
          month,
          SUM(free_messages_used) as total_messages_used,
          COUNT(DISTINCT user_id) as active_users
        FROM monthly_usages 
        WHERE (year > EXTRACT(YEAR FROM NOW()) - 2) OR (year = EXTRACT(YEAR FROM NOW()) - 2 AND month >= EXTRACT(MONTH FROM NOW()))
        GROUP BY year, month
        ORDER BY year DESC, month DESC
        LIMIT 12
      `;
      const monthlyUsageStatsResult = await AppDataSource.query(monthlyUsageStatsQuery);
      const monthlyUsageStats = monthlyUsageStatsResult.map((row: any) => ({
        year: row.year,
        month: row.month,
        totalMessagesUsed: parseInt(row.total_messages_used || '0'),
        activeUsers: parseInt(row.active_users || '0')
      }));
      
      const metrics = {
        totalUsers,
        totalChats,
        activeSubscriptions,
        monthlyUsageStats,
        generatedAt: new Date().toISOString(),
        responseTime: `${Date.now() - startTime}ms`
      };
      
      res.json(metrics);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
