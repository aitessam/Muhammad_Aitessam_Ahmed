import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from './index';
import { Chat } from '../../modules/chat/domain/entities/chat.entity';
import { Subscription } from '../../modules/subscriptions/domain/entities/subscription.entity';
import { User } from '../../modules/users/domain/entities/user.entity';
import { ChatMessage } from '../../modules/chat/domain/entities/chat-message.entity';
import { MonthlyUsage } from '../../modules/usage/domain/entities/monthly-usage.entity';
import { SubscriptionBundle } from '../../modules/subscriptions/domain/entities/subscription-bundle.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  synchronize: config.db.synchronize,
  logging: config.db.logging,
  entities: [
    Chat,
    Subscription,
    User,
    ChatMessage,
    MonthlyUsage,
    SubscriptionBundle,
  ],
  migrations: ['src/shared/config/migrations/*.ts'],
  migrationsTableName: 'migrations',
  migrationsRun: false,
});
