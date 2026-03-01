import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../../../shared/config/typeorm-data-source';
import { User } from '../../users/domain/entities/user.entity';
import { SubscriptionBundleRepositoryImpl } from '../repositories/subscription-bundle.repository';
import { SubscriptionBundleDomainServiceImpl } from '../domain/services/subscription-bundle.service';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '../../../shared/errors';
import { asyncHandler } from '../../../shared/middleware';

const createBundleSchema = z
  .object({
    tier: z.enum(['basic', 'pro', 'enterprise']),
    billingCycle: z.enum(['monthly', 'yearly']),
  })
  .strip();

const router = Router();
const bundleRepo = new SubscriptionBundleRepositoryImpl(AppDataSource);
const domainService = new SubscriptionBundleDomainServiceImpl();

async function getUserIdFromAuth(auth0Id: string): Promise<string> {
  const user = await AppDataSource.getRepository(User).findOne({
    where: { auth0Id },
  });
  if (!user) {
    throw new BadRequestError('User not found. Use the app first to register.');
  }
  return user.id;
}

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth0Id = req.auth?.sub;
    if (!auth0Id) throw new BadRequestError('User ID not found in token');

    const userId = await getUserIdFromAuth(auth0Id);
    const bundles = await bundleRepo.findByUserId(userId);
    res.json({ data: bundles });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth0Id = req.auth?.sub;
    if (!auth0Id) throw new BadRequestError('User ID not found in token');

    const userId = await getUserIdFromAuth(auth0Id);
    const bundle = await bundleRepo.findById(req.params.id);
    if (!bundle) throw new NotFoundError('Subscription not found');
    if (bundle.userId !== userId) throw new ForbiddenError('Not your subscription');

    res.json({ data: bundle });
  })
);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = createBundleSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      throw new BadRequestError(
        first?.message ?? 'Validation failed',
        'VALIDATION_ERROR'
      );
    }

    const auth0Id = req.auth?.sub;
    if (!auth0Id) throw new BadRequestError('User ID not found in token');

    const userId = await getUserIdFromAuth(auth0Id);

    try {
      domainService.validateCreate(parsed.data);
    } catch (e) {
      throw new BadRequestError(
        e instanceof Error ? e.message : 'Invalid subscription data',
        'VALIDATION_ERROR'
      );
    }
    const period = domainService.computePeriod(parsed.data);

    const bundle = await AppDataSource.transaction(async (manager) => {
      return bundleRepo.create(manager, {
        userId,
        tier: parsed.data.tier,
        billingCycle: parsed.data.billingCycle,
        startDate: period.startDate,
        endDate: period.endDate,
        renewalDate: period.renewalDate,
        maxMessages: period.maxMessages,
        remainingMessages: period.maxMessages,
        price: period.price,
      });
    });

    res.status(201).json({ data: bundle });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth0Id = req.auth?.sub;
    if (!auth0Id) throw new BadRequestError('User ID not found in token');

    const userId = await getUserIdFromAuth(auth0Id);
    const existing = await bundleRepo.findById(req.params.id);
    if (!existing) throw new NotFoundError('Subscription not found');
    if (existing.userId !== userId) throw new ForbiddenError('Not your subscription');

    const cancelled = await AppDataSource.transaction(async (manager) => {
      return bundleRepo.cancel(manager, req.params.id);
    });

    if (!cancelled) {
      throw new BadRequestError('Subscription is already cancelled or not found');
    }

    res.status(200).json({
      data: cancelled,
      message: 'Subscription cancelled. No further renewals.',
    });
  })
);

router.post(
  '/:id/renew',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const auth0Id = req.auth?.sub;
    if (!auth0Id) throw new BadRequestError('User ID not found in token');

    const userId = await getUserIdFromAuth(auth0Id);
    const bundle = await bundleRepo.findById(req.params.id);
    if (!bundle) throw new NotFoundError('Subscription not found');
    if (bundle.userId !== userId) throw new ForbiddenError('Not your subscription');
    if (!bundle.active) {
      throw new BadRequestError('Cannot renew a cancelled subscription');
    }

    const { endDate, renewalDate } = domainService.computeNextPeriod(
      bundle.endDate,
      bundle.billingCycle
    );

    const renewed = await AppDataSource.transaction(async (manager) => {
      return bundleRepo.renew(
        manager,
        req.params.id,
        endDate,
        renewalDate,
        bundle.maxMessages
      );
    });

    if (!renewed) throw new NotFoundError('Subscription not found');

    res.status(200).json({
      data: renewed,
      message: 'Subscription renewed successfully.',
    });
  })
);

export const subscriptionBundleController = router;
