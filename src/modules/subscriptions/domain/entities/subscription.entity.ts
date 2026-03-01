import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'pending';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  plan!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status!: SubscriptionStatus;

  @Column({ type: 'timestamp', name: 'expires_at', nullable: true })
  expiresAt: Date | null = null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
