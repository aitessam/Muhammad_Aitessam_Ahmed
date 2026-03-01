import type {
  Subscription,
  SubscriptionStatus,
} from '../entities/subscription.entity';
import { DomainValidationError } from '../errors';

export interface CreateSubscriptionDto {
  plan: string;
  status?: SubscriptionStatus;
  expiresAt?: Date | null;
}

export interface UpdateSubscriptionDto {
  plan?: string;
  status?: SubscriptionStatus;
  expiresAt?: Date | null;
}

export interface SubscriptionDomainService {
  validateCreate(dto: CreateSubscriptionDto): void;
  validateUpdate(dto: UpdateSubscriptionDto): void;
  createSubscription(dto: CreateSubscriptionDto): Subscription;
}

export class SubscriptionDomainServiceImpl implements SubscriptionDomainService {
  private readonly VALID_STATUSES: SubscriptionStatus[] = [
    'active',
    'cancelled',
    'expired',
    'pending',
  ];

  validateCreate(dto: CreateSubscriptionDto): void {
    if (!dto.plan || dto.plan.trim().length === 0) {
      throw new DomainValidationError('Subscription plan is required');
    }
    if (dto.plan.length > 100) {
      throw new DomainValidationError(
        'Plan name must not exceed 100 characters'
      );
    }
    if (dto.status && !this.VALID_STATUSES.includes(dto.status)) {
      throw new DomainValidationError(`Invalid status: ${dto.status}`);
    }
  }

  validateUpdate(dto: UpdateSubscriptionDto): void {
    if (dto.plan !== undefined) {
      if (!dto.plan || dto.plan.trim().length === 0) {
        throw new DomainValidationError('Plan name cannot be empty');
      }
      if (dto.plan.length > 100) {
        throw new DomainValidationError(
          'Plan name must not exceed 100 characters'
        );
      }
    }
    if (dto.status !== undefined && !this.VALID_STATUSES.includes(dto.status)) {
      throw new DomainValidationError(`Invalid status: ${dto.status}`);
    }
  }

  createSubscription(dto: CreateSubscriptionDto): Subscription {
    this.validateCreate(dto);
    const subscription = new Subscription();
    subscription.plan = dto.plan.trim();
    subscription.status = dto.status ?? 'pending';
    subscription.expiresAt = dto.expiresAt ?? null;
    return subscription;
  }
}
