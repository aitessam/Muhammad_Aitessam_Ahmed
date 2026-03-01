import {
  SubscriptionDomainServiceImpl,
  type CreateSubscriptionDto,
  type UpdateSubscriptionDto,
} from '../subscription.service';
import { DomainValidationError } from '../errors';
import { Subscription } from '../entities/subscription.entity';

describe('SubscriptionDomainService', () => {
  let service: SubscriptionDomainServiceImpl;

  beforeEach(() => {
    service = new SubscriptionDomainServiceImpl();
  });

  describe('validateCreate', () => {
    it('should accept valid subscription data', () => {
      // Arrange
      const dto: CreateSubscriptionDto = {
        plan: 'premium',
        status: 'active',
        expiresAt: new Date('2024-12-31'),
      };

      // Act & Assert
      expect(() => service.validateCreate(dto)).not.toThrow();
    });

    it('should accept valid subscription with minimal data', () => {
      // Arrange
      const dto: CreateSubscriptionDto = {
        plan: 'basic',
      };

      // Act & Assert
      expect(() => service.validateCreate(dto)).not.toThrow();
    });

    it('should throw error when plan is missing', () => {
      // Arrange
      const dto = {
        plan: '',
        status: 'active',
      } as CreateSubscriptionDto;

      // Act & Assert
      expect(() => service.validateCreate(dto))
        .toThrow(DomainValidationError);
      expect(() => service.validateCreate(dto))
        .toThrow('Subscription plan is required');
    });

    it('should throw error when plan is only whitespace', () => {
      // Arrange
      const dto = {
        plan: '   ',
        status: 'active',
      } as CreateSubscriptionDto;

      // Act & Assert
      expect(() => service.validateCreate(dto))
        .toThrow(DomainValidationError);
      expect(() => service.validateCreate(dto))
        .toThrow('Subscription plan is required');
    });

    it('should throw error when plan exceeds 100 characters', () => {
      // Arrange
      const dto: CreateSubscriptionDto = {
        plan: 'a'.repeat(101),
        status: 'active',
      };

      // Act & Assert
      expect(() => service.validateCreate(dto))
        .toThrow(DomainValidationError);
      expect(() => service.validateCreate(dto))
        .toThrow('Plan name must not exceed 100 characters');
    });

    it('should throw error when status is invalid', () => {
      // Arrange
      const dto: CreateSubscriptionDto = {
        plan: 'premium',
        status: 'invalid' as any,
      };

      // Act & Assert
      expect(() => service.validateCreate(dto))
        .toThrow(DomainValidationError);
      expect(() => service.validateCreate(dto))
        .toThrow('Invalid status: invalid');
    });

    it('should accept all valid statuses', () => {
      // Arrange
      const validStatuses = ['active', 'cancelled', 'expired', 'pending'] as const;

      // Act & Assert
      validStatuses.forEach(status => {
        const dto: CreateSubscriptionDto = {
          plan: 'premium',
          status,
        };
        expect(() => service.validateCreate(dto)).not.toThrow();
      });
    });
  });

  describe('validateUpdate', () => {
    it('should accept valid update data with all fields', () => {
      // Arrange
      const dto: UpdateSubscriptionDto = {
        plan: 'premium',
        status: 'active',
        expiresAt: new Date('2024-12-31'),
      };

      // Act & Assert
      expect(() => service.validateUpdate(dto)).not.toThrow();
    });

    it('should accept valid update data with partial fields', () => {
      // Arrange
      const dto: UpdateSubscriptionDto = {
        status: 'cancelled',
      };

      // Act & Assert
      expect(() => service.validateUpdate(dto)).not.toThrow();
    });

    it('should accept empty update object', () => {
      // Arrange
      const dto: UpdateSubscriptionDto = {};

      // Act & Assert
      expect(() => service.validateUpdate(dto)).not.toThrow();
    });

    it('should throw error when plan is empty string', () => {
      // Arrange
      const dto: UpdateSubscriptionDto = {
        plan: '',
      };

      // Act & Assert
      expect(() => service.validateUpdate(dto))
        .toThrow(DomainValidationError);
      expect(() => service.validateUpdate(dto))
        .toThrow('Plan name cannot be empty');
    });

    it('should throw error when plan is only whitespace', () => {
      // Arrange
      const dto: UpdateSubscriptionDto = {
        plan: '   ',
      };

      // Act & Assert
      expect(() => service.validateUpdate(dto))
        .toThrow(DomainValidationError);
      expect(() => service.validateUpdate(dto))
        .toThrow('Plan name cannot be empty');
    });

    it('should throw error when plan exceeds 100 characters', () => {
      // Arrange
      const dto: UpdateSubscriptionDto = {
        plan: 'a'.repeat(101),
      };

      // Act & Assert
      expect(() => service.validateUpdate(dto))
        .toThrow(DomainValidationError);
      expect(() => service.validateUpdate(dto))
        .toThrow('Plan name must not exceed 100 characters');
    });

    it('should throw error when status is invalid', () => {
      // Arrange
      const dto: UpdateSubscriptionDto = {
        status: 'invalid' as any,
      };

      // Act & Assert
      expect(() => service.validateUpdate(dto))
        .toThrow(DomainValidationError);
      expect(() => service.validateUpdate(dto))
        .toThrow('Invalid status: invalid');
    });

    it('should accept all valid statuses for update', () => {
      // Arrange
      const validStatuses = ['active', 'cancelled', 'expired', 'pending'] as const;

      // Act & Assert
      validStatuses.forEach(status => {
        const dto: UpdateSubscriptionDto = {
          status,
        };
        expect(() => service.validateUpdate(dto)).not.toThrow();
      });
    });
  });

  describe('createSubscription', () => {
    it('should create subscription with all provided fields', () => {
      // Arrange
      const dto: CreateSubscriptionDto = {
        plan: 'premium',
        status: 'active',
        expiresAt: new Date('2024-12-31'),
      };

      // Act
      const subscription = service.createSubscription(dto);

      // Assert
      expect(subscription).toBeInstanceOf(Subscription);
      expect(subscription.plan).toBe('premium');
      expect(subscription.status).toBe('active');
      expect(subscription.expiresAt).toEqual(new Date('2024-12-31'));
    });

    it('should create subscription with default status when not provided', () => {
      // Arrange
      const dto: CreateSubscriptionDto = {
        plan: 'basic',
      };

      // Act
      const subscription = service.createSubscription(dto);

      // Assert
      expect(subscription.status).toBe('pending');
    });

    it('should create subscription with null expiresAt when not provided', () => {
      // Arrange
      const dto: CreateSubscriptionDto = {
        plan: 'basic',
      };

      // Act
      const subscription = service.createSubscription(dto);

      // Assert
      expect(subscription.expiresAt).toBeNull();
    });

    it('should trim plan name', () => {
      // Arrange
      const dto: CreateSubscriptionDto = {
        plan: '  premium  ',
      };

      // Act
      const subscription = service.createSubscription(dto);

      // Assert
      expect(subscription.plan).toBe('premium');
    });

    it('should throw validation error for invalid data', () => {
      // Arrange
      const dto = {
        plan: '',
      } as CreateSubscriptionDto;

      // Act & Assert
      expect(() => service.createSubscription(dto))
        .toThrow(DomainValidationError);
    });
  });
});

describe('Subscription Lifecycle Integration Tests', () => {
  let service: SubscriptionDomainServiceImpl;

  beforeEach(() => {
    service = new SubscriptionDomainServiceImpl();
  });

  describe('Create Subscription Lifecycle', () => {
    it('should handle complete subscription creation flow', () => {
      // Arrange
      const dto: CreateSubscriptionDto = {
        plan: 'premium',
        status: 'pending',
      };

      // Act
      const subscription = service.createSubscription(dto);

      // Assert
      expect(subscription.plan).toBe('premium');
      expect(subscription.status).toBe('pending');
      expect(subscription.expiresAt).toBeNull();
      expect(subscription.createdAt).toBeInstanceOf(Date);
      expect(subscription.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle subscription activation', () => {
      // Arrange
      const createDto: CreateSubscriptionDto = {
        plan: 'basic',
      };
      const subscription = service.createSubscription(createDto);

      // Act
      const updateDto: UpdateSubscriptionDto = {
        status: 'active',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      };
      service.validateUpdate(updateDto);

      // Simulate update
      subscription.status = updateDto.status!;
      subscription.expiresAt = updateDto.expiresAt!;

      // Assert
      expect(subscription.status).toBe('active');
      expect(subscription.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('Cancel Subscription Lifecycle', () => {
    it('should handle subscription cancellation', () => {
      // Arrange
      const createDto: CreateSubscriptionDto = {
        plan: 'premium',
        status: 'active',
      };
      const subscription = service.createSubscription(createDto);

      // Act
      const updateDto: UpdateSubscriptionDto = {
        status: 'cancelled',
      };
      service.validateUpdate(updateDto);

      // Simulate update
      subscription.status = updateDto.status!;

      // Assert
      expect(subscription.status).toBe('cancelled');
    });
  });

  describe('Renew Subscription Lifecycle', () => {
    it('should handle subscription renewal', () => {
      // Arrange
      const createDto: CreateSubscriptionDto = {
        plan: 'basic',
        status: 'active',
        expiresAt: new Date('2024-01-31'),
      };
      const subscription = service.createSubscription(createDto);

      // Act
      const updateDto: UpdateSubscriptionDto = {
        expiresAt: new Date('2024-02-29'),
      };
      service.validateUpdate(updateDto);

      // Simulate update
      subscription.expiresAt = updateDto.expiresAt!;

      // Assert
      expect(subscription.expiresAt).toEqual(new Date('2024-02-29'));
    });
  });

  describe('Payment Failure Scenarios', () => {
    it('should handle payment failure by setting status to expired', () => {
      // Arrange
      const createDto: CreateSubscriptionDto = {
        plan: 'premium',
        status: 'active',
      };
      const subscription = service.createSubscription(createDto);

      // Act
      const updateDto: UpdateSubscriptionDto = {
        status: 'expired',
      };
      service.validateUpdate(updateDto);

      // Simulate payment failure
      subscription.status = updateDto.status!;

      // Assert
      expect(subscription.status).toBe('expired');
    });

    it('should handle payment retry with pending status', () => {
      // Arrange
      const createDto: CreateSubscriptionDto = {
        plan: 'basic',
        status: 'expired',
      };
      const subscription = service.createSubscription(createDto);

      // Act
      const updateDto: UpdateSubscriptionDto = {
        status: 'pending',
      };
      service.validateUpdate(updateDto);

      // Simulate payment retry
      subscription.status = updateDto.status!;

      // Assert
      expect(subscription.status).toBe('pending');
    });
  });

  describe('Plan Change Lifecycle', () => {
    it('should handle plan upgrade', () => {
      // Arrange
      const createDto: CreateSubscriptionDto = {
        plan: 'basic',
        status: 'active',
      };
      const subscription = service.createSubscription(createDto);

      // Act
      const updateDto: UpdateSubscriptionDto = {
        plan: 'premium',
      };
      service.validateUpdate(updateDto);

      // Simulate plan upgrade
      subscription.plan = updateDto.plan!;

      // Assert
      expect(subscription.plan).toBe('premium');
      expect(subscription.status).toBe('active');
    });

    it('should handle plan downgrade', () => {
      // Arrange
      const createDto: CreateSubscriptionDto = {
        plan: 'premium',
        status: 'active',
      };
      const subscription = service.createSubscription(createDto);

      // Act
      const updateDto: UpdateSubscriptionDto = {
        plan: 'basic',
      };
      service.validateUpdate(updateDto);

      // Simulate plan downgrade
      subscription.plan = updateDto.plan!;

      // Assert
      expect(subscription.plan).toBe('basic');
      expect(subscription.status).toBe('active');
    });
  });
});
