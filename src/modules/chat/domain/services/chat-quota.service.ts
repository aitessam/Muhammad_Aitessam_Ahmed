import type { EntityManager } from 'typeorm';
import type { QuotaRepository, QuotaSource } from '../../repositories/quota.repository';

export interface ChatQuotaDomainService {
  checkAndConsumeQuota(manager: EntityManager, userId: string): Promise<QuotaSource>;
}

export class ChatQuotaDomainServiceImpl implements ChatQuotaDomainService {
  constructor(private readonly quotaRepo: QuotaRepository) {}

  async checkAndConsumeQuota(
    manager: EntityManager,
    userId: string
  ): Promise<QuotaSource> {
    return this.quotaRepo.consumeQuota(manager, userId);
  }
}
