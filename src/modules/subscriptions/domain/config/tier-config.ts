import type { SubscriptionTier, BillingCycle } from '../entities/subscription-bundle.entity';

export interface TierLimits {
  maxMessages: number;
  priceMonthly: number;
  priceYearly: number;
}

export const TIER_CONFIG: Record<SubscriptionTier, TierLimits> = {
  basic: { maxMessages: 100, priceMonthly: 9.99, priceYearly: 99.99 },
  pro: { maxMessages: 500, priceMonthly: 24.99, priceYearly: 249.99 },
  enterprise: { maxMessages: 5000, priceMonthly: 99.99, priceYearly: 999.99 },
};

export function getPrice(
  tier: SubscriptionTier,
  billingCycle: BillingCycle
): number {
  const config = TIER_CONFIG[tier];
  return billingCycle === 'yearly' ? config.priceYearly : config.priceMonthly;
}

export function getMaxMessages(tier: SubscriptionTier): number {
  return TIER_CONFIG[tier].maxMessages;
}
