import cron from 'node-cron';
import type { DataSource } from 'typeorm';
import { SubscriptionBundleRepositoryImpl } from '../repositories/subscription-bundle.repository';
import { SubscriptionBundleDomainServiceImpl } from '../domain/services/subscription-bundle.service';
import { MonthlyUsage } from '../../usage/domain/entities/monthly-usage.entity';
import { logger } from '../../../shared/logger';

const PAYMENT_FAILURE_RATE = 0.3;

function simulatePayment(): boolean {
  return Math.random() >= PAYMENT_FAILURE_RATE;
}

export function startSubscriptionCron(dataSource: DataSource): void {
  const bundleRepo = new SubscriptionBundleRepositoryImpl(dataSource);
  const domainService = new SubscriptionBundleDomainServiceImpl();

  cron.schedule('0 0 * * *', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isFirstOfMonth = today.getDate() === 1;
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    try {
      await dataSource.transaction(async (manager) => {
        const due = await bundleRepo.findDueForAutoRenewal(manager);

        for (const bundle of due) {
          const paid = simulatePayment();
          if (paid) {
            const { endDate, renewalDate } = domainService.computeNextPeriod(
              bundle.endDate,
              bundle.billingCycle
            );
            await bundleRepo.renew(
              manager,
              bundle.id,
              endDate,
              renewalDate,
              bundle.maxMessages
            );
            logger.info('Subscription auto-renewed', {
              bundleId: bundle.id,
              userId: bundle.userId,
            });
          } else {
            bundle.active = false;
            await manager.save(bundle);
            logger.warn('Subscription auto-renew failed (payment simulation), marked inactive', {
              bundleId: bundle.id,
              userId: bundle.userId,
            });
          }
        }

        if (isFirstOfMonth) {
          const result = await manager
            .createQueryBuilder()
            .update(MonthlyUsage)
            .set({ freeMessagesUsed: 0 })
            .where('year = :year', { year })
            .andWhere('month = :month', { month })
            .execute();
          logger.info('Free quota reset for new month', {
            year,
            month,
            rowsAffected: result.affected ?? 0,
          });
        }
      });
    } catch (error) {
      logger.error('Subscription cron failed', { error });
    }
  });

  logger.info('Subscription cron scheduled (daily at 00:00)');
}
