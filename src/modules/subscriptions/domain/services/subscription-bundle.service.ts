import type { SubscriptionTier, BillingCycle } from '../entities/subscription-bundle.entity';
import {
  getPrice,
  getMaxMessages,
} from '../config/tier-config';

const TIERS: SubscriptionTier[] = ['basic', 'pro', 'enterprise'];
const CYCLES: BillingCycle[] = ['monthly', 'yearly'];

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

export interface CreateBundleInput {
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
}

export interface SubscriptionBundleDomainService {
  validateCreate(input: CreateBundleInput): void;
  computePeriod(input: CreateBundleInput): {
    startDate: Date;
    endDate: Date;
    renewalDate: Date | null;
    maxMessages: number;
    price: string;
  };
  computeNextPeriod(
    currentEndDate: Date,
    billingCycle: BillingCycle
  ): { endDate: Date; renewalDate: Date | null };
}

export class SubscriptionBundleDomainServiceImpl
  implements SubscriptionBundleDomainService
{
  validateCreate(input: CreateBundleInput): void {
    if (!TIERS.includes(input.tier)) {
      throw new Error(`Invalid tier. Must be one of: ${TIERS.join(', ')}`);
    }
    if (!CYCLES.includes(input.billingCycle)) {
      throw new Error(
        `Invalid billing cycle. Must be one of: ${CYCLES.join(', ')}`
      );
    }
  }

  computePeriod(input: CreateBundleInput): {
    startDate: Date;
    endDate: Date;
    renewalDate: Date | null;
    maxMessages: number;
    price: string;
  } {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate =
      input.billingCycle === 'yearly'
        ? addYears(startDate, 1)
        : addMonths(startDate, 1);

    const renewalDate =
      input.billingCycle === 'yearly'
        ? addYears(startDate, 1)
        : addMonths(startDate, 1);

    const maxMessages = getMaxMessages(input.tier);
    const priceNum = getPrice(input.tier, input.billingCycle);

    return {
      startDate,
      endDate,
      renewalDate,
      maxMessages,
      price: priceNum.toFixed(2),
    };
  }

  computeNextPeriod(
    currentEndDate: Date,
    billingCycle: BillingCycle
  ): { endDate: Date; renewalDate: Date | null } {
    const start = new Date(currentEndDate);
    start.setHours(0, 0, 0, 0);

    const endDate =
      billingCycle === 'yearly' ? addYears(start, 1) : addMonths(start, 1);
    const renewalDate =
      billingCycle === 'yearly' ? addYears(start, 1) : addMonths(start, 1);

    return { endDate, renewalDate };
  }
}
