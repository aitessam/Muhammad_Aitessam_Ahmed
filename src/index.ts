import 'reflect-metadata';
import { app } from './app';
import { config } from './shared/config';
import { AppDataSource } from './shared/config/typeorm-data-source';
import { logger } from './shared/logger';
import { startSubscriptionCron } from './modules/subscriptions/jobs/subscription-cron';

async function bootstrap(): Promise<void> {
  try {
    await AppDataSource.initialize();
    logger.info('Database connection established');

    startSubscriptionCron(AppDataSource);

    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start application', { error });
    process.exit(1);
  }
}

bootstrap();
