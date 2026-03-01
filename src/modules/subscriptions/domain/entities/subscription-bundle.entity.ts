import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export type SubscriptionTier = 'basic' | 'pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';

@Entity('subscription_bundles')
@Index(['userId'])
@Index(['userId', 'active'])
@Index(['active', 'cancelledAt'])
export class SubscriptionBundle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: import('../../../users/domain/entities/user.entity').User;

  @Column({
    type: 'varchar',
    length: 20,
  })
  tier!: SubscriptionTier;

  @Column({ type: 'int', name: 'max_messages' })
  maxMessages!: number;

  @Column({ type: 'int', name: 'remaining_messages' })
  remainingMessages!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price!: string;

  @Column({ type: 'date', name: 'start_date' })
  startDate!: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate!: Date;

  @Column({ type: 'date', name: 'renewal_date', nullable: true })
  renewalDate: Date | null = null;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'billing_cycle',
  })
  billingCycle!: BillingCycle;

  @Column({ type: 'boolean', name: 'auto_renew', default: true })
  autoRenew!: boolean;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'timestamp', name: 'cancelled_at', nullable: true })
  cancelledAt: Date | null = null;
}
