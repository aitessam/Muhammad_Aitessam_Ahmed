import { Router, type Request, type Response } from 'express';
import { Subscription } from '../domain/entities/subscription.entity';
import { SubscriptionRepositoryImpl } from '../repositories/subscription.repository';
import { SubscriptionDomainServiceImpl } from '../domain/services/subscription.service';
import { NotFoundError } from '../../../shared/errors';
import { AppDataSource } from '../../../shared/config/typeorm-data-source';
import { asyncHandler } from '../../../shared/middleware';

const router = Router();
const subscriptionDomainService = new SubscriptionDomainServiceImpl();

function getSubscriptionRepository(): SubscriptionRepositoryImpl {
  const repo = AppDataSource.getRepository(Subscription);
  return new SubscriptionRepositoryImpl(repo);
}

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const subRepo = getSubscriptionRepository();
    const subscriptions = await subRepo.findAll();
    res.json({ data: subscriptions });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const subRepo = getSubscriptionRepository();
    const subscription = await subRepo.findById(req.params.id);
    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }
    res.json({ data: subscription });
  })
);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const subRepo = getSubscriptionRepository();
  const dto = req.body as {
    plan: string;
    status?: 'active' | 'cancelled' | 'expired' | 'pending';
    expiresAt?: string | null;
  };
  const parsedDto = {
    ...dto,
    expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
  };
    const subscription = await subRepo.create(
      parsedDto,
      subscriptionDomainService
    );
    res.status(201).json({ data: subscription });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const subRepo = getSubscriptionRepository();
  const dto = req.body as {
    plan?: string;
    status?: 'active' | 'cancelled' | 'expired' | 'pending';
    expiresAt?: string | null;
  };
  const parsedDto = {
    ...dto,
    expiresAt: dto.expiresAt !== undefined ? (dto.expiresAt ? new Date(dto.expiresAt) : null) : undefined,
  };
    const subscription = await subRepo.update(
      req.params.id,
      parsedDto,
      subscriptionDomainService
    );
    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }
    res.json({ data: subscription });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const subRepo = getSubscriptionRepository();
    const deleted = await subRepo.delete(req.params.id);
    if (!deleted) {
      throw new NotFoundError('Subscription not found');
    }
    res.status(204).send();
  })
);

export const subscriptionController = router;
