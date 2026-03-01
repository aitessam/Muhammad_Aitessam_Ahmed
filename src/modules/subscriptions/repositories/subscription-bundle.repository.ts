import type { DataSource, EntityManager } from 'typeorm';
import { SubscriptionBundle } from '../domain/entities/subscription-bundle.entity';
import type {
  SubscriptionTier,
  BillingCycle,
} from '../domain/entities/subscription-bundle.entity';

export interface CreateBundleDto {
  userId: string;
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  startDate: Date;
  endDate: Date;
  renewalDate: Date | null;
  maxMessages: number;
  remainingMessages: number;
  price: string;
}

export interface SubscriptionBundleRepository {
  findById(id: string): Promise<SubscriptionBundle | null>;
  findByUserId(userId: string): Promise<SubscriptionBundle[]>;
  create(manager: EntityManager, dto: CreateBundleDto): Promise<SubscriptionBundle>;
  cancel(manager: EntityManager, id: string): Promise<SubscriptionBundle | null>;
  renew(
    manager: EntityManager,
    id: string,
    newEndDate: Date,
    newRenewalDate: Date | null,
    resetRemainingMessages: number
  ): Promise<SubscriptionBundle | null>;
  findDueForAutoRenewal(manager: EntityManager): Promise<SubscriptionBundle[]>;
}

export class SubscriptionBundleRepositoryImpl
  implements SubscriptionBundleRepository
{
  constructor(private readonly dataSource: DataSource) {}

  private getRepo(manager?: EntityManager) {
    const m = manager ?? this.dataSource.manager;
    return m.getRepository(SubscriptionBundle);
  }

  async findById(id: string): Promise<SubscriptionBundle | null> {
    return this.getRepo().findOne({ where: { id } });
  }

  async findByUserId(userId: string): Promise<SubscriptionBundle[]> {
    return this.getRepo().find({
      where: { userId },
      order: { startDate: 'DESC' },
    });
  }

  async create(
    manager: EntityManager,
    dto: CreateBundleDto
  ): Promise<SubscriptionBundle> {
    const bundle = manager.create(SubscriptionBundle, {
      userId: dto.userId,
      tier: dto.tier,
      billingCycle: dto.billingCycle,
      startDate: dto.startDate,
      endDate: dto.endDate,
      renewalDate: dto.renewalDate,
      maxMessages: dto.maxMessages,
      remainingMessages: dto.remainingMessages,
      price: dto.price,
      autoRenew: true,
      active: true,
    });
    return manager.save(bundle);
  }

  async cancel(
    manager: EntityManager,
    id: string
  ): Promise<SubscriptionBundle | null> {
    const bundle = await manager.findOne(SubscriptionBundle, {
      where: { id },
    });
    if (!bundle || !bundle.active) return null;

    bundle.active = false;
    bundle.autoRenew = false;
    bundle.cancelledAt = new Date();
    return manager.save(bundle);
  }

  async renew(
    manager: EntityManager,
    id: string,
    newEndDate: Date,
    newRenewalDate: Date | null,
    resetRemainingMessages: number
  ): Promise<SubscriptionBundle | null> {
    const bundle = await manager.findOne(SubscriptionBundle, {
      where: { id },
    });
    if (!bundle) return null;

    bundle.endDate = newEndDate;
    bundle.renewalDate = newRenewalDate;
    bundle.remainingMessages = resetRemainingMessages;
    return manager.save(bundle);
  }

  async findDueForAutoRenewal(
    manager: EntityManager
  ): Promise<SubscriptionBundle[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return manager
      .createQueryBuilder(SubscriptionBundle, 'sb')
      .where('sb.auto_renew = :autoRenew', { autoRenew: true })
      .andWhere('sb.active = :active', { active: true })
      .andWhere('sb.end_date < :today', { today })
      .getMany();
  }
}
