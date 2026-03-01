import type { Repository } from 'typeorm';
import { Subscription } from '../domain/entities/subscription.entity';
import type {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  SubscriptionDomainService,
} from '../domain/services/subscription.service';

export interface SubscriptionRepository {
  findById(id: string): Promise<Subscription | null>;
  findAll(): Promise<Subscription[]>;
  create(
    dto: CreateSubscriptionDto,
    domainService: SubscriptionDomainService
  ): Promise<Subscription>;
  update(
    id: string,
    dto: UpdateSubscriptionDto,
    domainService: SubscriptionDomainService
  ): Promise<Subscription | null>;
  delete(id: string): Promise<boolean>;
}

export class SubscriptionRepositoryImpl implements SubscriptionRepository {
  constructor(private readonly repo: Repository<Subscription>) {}

  async findById(id: string): Promise<Subscription | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findAll(): Promise<Subscription[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async create(
    dto: CreateSubscriptionDto,
    domainService: SubscriptionDomainService
  ): Promise<Subscription> {
    const subscription = domainService.createSubscription(dto);
    return this.repo.save(subscription);
  }

  async update(
    id: string,
    dto: UpdateSubscriptionDto,
    domainService: SubscriptionDomainService
  ): Promise<Subscription | null> {
    const subscription = await this.findById(id);
    if (!subscription) return null;

    domainService.validateUpdate(dto);

    if (dto.plan !== undefined) subscription.plan = dto.plan.trim();
    if (dto.status !== undefined) subscription.status = dto.status;
    if (dto.expiresAt !== undefined) subscription.expiresAt = dto.expiresAt;

    return this.repo.save(subscription);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
