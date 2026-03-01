import type { Subscription } from '../entities/subscription.entity';

export interface SubscriptionPolicy {
  canRead(subscription: Subscription, userId?: string): boolean;
  canUpdate(subscription: Subscription, userId?: string): boolean;
  canCancel(subscription: Subscription, userId?: string): boolean;
}

export class SubscriptionPolicyImpl implements SubscriptionPolicy {
  canRead(_subscription: Subscription, _userId?: string): boolean {
    return true;
  }

  canUpdate(_subscription: Subscription, _userId?: string): boolean {
    return true;
  }

  canCancel(subscription: Subscription, _userId?: string): boolean {
    return subscription.status === 'active';
  }
}
