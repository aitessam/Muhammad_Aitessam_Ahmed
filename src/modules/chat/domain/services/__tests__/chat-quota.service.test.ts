import type { EntityManager } from 'typeorm';
import { ChatQuotaDomainServiceImpl } from '../chat-quota.service';
import { QuotaRepositoryImpl, type QuotaSource } from '../../../repositories/quota.repository';
import { QuotaExhaustedError } from '../../../../shared/errors';
import { MonthlyUsage } from '../../../usage/domain/entities/monthly-usage.entity';
import { SubscriptionBundle } from '../../../subscriptions/domain/entities/subscription-bundle.entity';

describe('ChatQuotaDomainService', () => {
  let service: ChatQuotaDomainServiceImpl;
  let mockQuotaRepo: jest.Mocked<QuotaRepositoryImpl>;
  let mockManager: jest.Mocked<EntityManager>;

  beforeEach(() => {
    mockQuotaRepo = {
      consumeQuota: jest.fn(),
    } as any;

    mockManager = {
      query: jest.fn(),
      save: jest.fn(),
    } as any;

    service = new ChatQuotaDomainServiceImpl(mockQuotaRepo);
  });

  describe('checkAndConsumeQuota', () => {
    const userId = 'user-123';

    it('should consume from free tier when user has free messages available', async () => {
      // Arrange
      mockQuotaRepo.consumeQuota.mockResolvedValue('free');

      // Act
      const result = await service.checkAndConsumeQuota(mockManager, userId);

      // Assert
      expect(result).toBe('free');
      expect(mockQuotaRepo.consumeQuota).toHaveBeenCalledWith(mockManager, userId);
    });

    it('should consume from bundle when free tier is exhausted', async () => {
      // Arrange
      mockQuotaRepo.consumeQuota.mockResolvedValue('bundle');

      // Act
      const result = await service.checkAndConsumeQuota(mockManager, userId);

      // Assert
      expect(result).toBe('bundle');
      expect(mockQuotaRepo.consumeQuota).toHaveBeenCalledWith(mockManager, userId);
    });

    it('should throw QuotaExhaustedError when no quota available', async () => {
      // Arrange
      mockQuotaRepo.consumeQuota.mockRejectedValue(new QuotaExhaustedError());

      // Act & Assert
      await expect(service.checkAndConsumeQuota(mockManager, userId))
        .rejects.toThrow(QuotaExhaustedError);
      expect(mockQuotaRepo.consumeQuota).toHaveBeenCalledWith(mockManager, userId);
    });

    it('should propagate other errors from repository', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockQuotaRepo.consumeQuota.mockRejectedValue(error);

      // Act & Assert
      await expect(service.checkAndConsumeQuota(mockManager, userId))
        .rejects.toThrow('Database connection failed');
      expect(mockQuotaRepo.consumeQuota).toHaveBeenCalledWith(mockManager, userId);
    });
  });
});

describe('QuotaRepositoryImpl', () => {
  let repo: QuotaRepositoryImpl;
  let mockManager: jest.Mocked<EntityManager>;

  beforeEach(() => {
    mockManager = {
      query: jest.fn(),
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
    } as any;

    repo = new QuotaRepositoryImpl();
  });

  describe('consumeQuota', () => {
    const userId = 'user-123';
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    it('should consume free tier quota when available', async () => {
      // Arrange
      const mockMonthlyUsage = {
        freeMessagesUsed: 2,
      } as MonthlyUsage;

      const mockQueryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockMonthlyUsage]),
      };

      mockManager.query.mockResolvedValue(undefined);
      (mockManager.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);
      mockManager.save.mockResolvedValue(mockMonthlyUsage);

      // Act
      const result = await repo.consumeQuota(mockManager, userId);

      // Assert
      expect(result).toBe('free');
      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO monthly_usages'),
        [userId, year, month]
      );
      expect(mockMonthlyUsage.freeMessagesUsed).toBe(3);
      expect(mockManager.save).toHaveBeenCalledWith(mockMonthlyUsage);
    });

    it('should consume bundle quota when free tier is exhausted', async () => {
      // Arrange
      const mockMonthlyUsage = {
        freeMessagesUsed: 3, // Already exhausted free tier
      } as MonthlyUsage;

      const mockBundle = {
        remainingMessages: 5,
      } as SubscriptionBundle;

      const mockUsageQueryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockMonthlyUsage]),
      };

      const mockBundleQueryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockBundle),
      };

      mockManager.query.mockResolvedValue(undefined);
      (mockManager.createQueryBuilder as jest.Mock)
        .mockReturnValueOnce(mockUsageQueryBuilder)
        .mockReturnValueOnce(mockBundleQueryBuilder);
      mockManager.save.mockResolvedValue(mockBundle);

      // Act
      const result = await repo.consumeQuota(mockManager, userId);

      // Assert
      expect(result).toBe('bundle');
      expect(mockBundle.remainingMessages).toBe(4);
      expect(mockManager.save).toHaveBeenCalledWith(mockBundle);
    });

    it('should throw QuotaExhaustedError when both free and bundle quotas are exhausted', async () => {
      // Arrange
      const mockMonthlyUsage = {
        freeMessagesUsed: 3, // Exhausted free tier
      } as MonthlyUsage;

      const mockUsageQueryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockMonthlyUsage]),
      };

      const mockBundleQueryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null), // No bundle available
      };

      mockManager.query.mockResolvedValue(undefined);
      (mockManager.createQueryBuilder as jest.Mock)
        .mockReturnValueOnce(mockUsageQueryBuilder)
        .mockReturnValueOnce(mockBundleQueryBuilder);

      // Act & Assert
      await expect(repo.consumeQuota(mockManager, userId))
        .rejects.toThrow(QuotaExhaustedError);
    });

    it('should handle concurrent access with pessimistic locking', async () => {
      // Arrange
      const mockMonthlyUsage = {
        freeMessagesUsed: 2,
      } as MonthlyUsage;

      const mockQueryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockMonthlyUsage]),
      };

      mockManager.query.mockResolvedValue(undefined);
      (mockManager.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);
      mockManager.save.mockResolvedValue(mockMonthlyUsage);

      // Act
      await repo.consumeQuota(mockManager, userId);

      // Assert
      expect(mockQueryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('should select bundle with most remaining messages when multiple available', async () => {
      // Arrange
      const mockMonthlyUsage = {
        freeMessagesUsed: 3, // Exhausted free tier
      } as MonthlyUsage;

      const mockBundle = {
        remainingMessages: 10,
      } as SubscriptionBundle;

      const mockUsageQueryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockMonthlyUsage]),
      };

      const mockBundleQueryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockBundle),
      };

      mockManager.query.mockResolvedValue(undefined);
      (mockManager.createQueryBuilder as jest.Mock)
        .mockReturnValueOnce(mockUsageQueryBuilder)
        .mockReturnValueOnce(mockBundleQueryBuilder);
      mockManager.save.mockResolvedValue(mockBundle);

      // Act
      await repo.consumeQuota(mockManager, userId);

      // Assert
      expect(mockBundleQueryBuilder.orderBy).toHaveBeenCalledWith('remaining_messages', 'DESC');
      expect(mockBundleQueryBuilder.addOrderBy).toHaveBeenCalledWith('end_date', 'DESC');
    });
  });
});
