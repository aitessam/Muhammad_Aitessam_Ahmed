import type { EntityManager } from 'typeorm';
import { MonthlyUsage } from '../../usage/domain/entities/monthly-usage.entity';
import { SubscriptionBundle } from '../../subscriptions/domain/entities/subscription-bundle.entity';
import { QuotaExhaustedError } from '../../../shared/errors';

const FREE_MESSAGES_PER_MONTH = 3;

export type QuotaSource = 'free' | 'bundle';

export interface QuotaRepository {
  consumeQuota(manager: EntityManager, userId: string): Promise<QuotaSource>;
}

export class QuotaRepositoryImpl implements QuotaRepository {
  async consumeQuota(
    manager: EntityManager,
    userId: string
  ): Promise<QuotaSource> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    await manager.query(
      `INSERT INTO monthly_usages (id, user_id, year, month, free_messages_used)
       VALUES (uuid_generate_v4(), $1, $2, $3, 0)
       ON CONFLICT (user_id, year, month) DO NOTHING`,
      [userId, year, month]
    );

    const [monthlyUsage] = await manager
      .createQueryBuilder(MonthlyUsage, 'mu')
      .setLock('pessimistic_write')
      .where('mu.user_id = :userId', { userId })
      .andWhere('mu.year = :year', { year })
      .andWhere('mu.month = :month', { month })
      .getMany();

    if (!monthlyUsage) {
      throw new QuotaExhaustedError();
    }

    if (monthlyUsage.freeMessagesUsed < FREE_MESSAGES_PER_MONTH) {
      monthlyUsage.freeMessagesUsed += 1;
      await manager.save(monthlyUsage);
      return 'free';
    }

    const bundle = await manager
      .createQueryBuilder(SubscriptionBundle, 'sb')
      .setLock('pessimistic_write')
      .where('sb.user_id = :userId', { userId })
      .andWhere('sb.active = true')
      .andWhere('sb.remaining_messages > 0')
      .andWhere('sb.end_date >= :today', { today: now })
      .orderBy('sb.remaining_messages', 'DESC')
      .addOrderBy('sb.end_date', 'DESC')
      .getOne();

    if (!bundle) {
      throw new QuotaExhaustedError();
    }

    bundle.remainingMessages -= 1;
    await manager.save(bundle);
    return 'bundle';
  }
}
