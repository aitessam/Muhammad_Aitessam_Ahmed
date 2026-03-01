import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

export type UserRole = 'user' | 'admin';

@Entity('users')
@Index(['auth0Id'], { unique: true })
@Index(['email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, name: 'auth0_id' })
  auth0Id!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 50, default: 'user' })
  role!: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany('ChatMessage', 'user')
  chatMessages!: import('../../../chat/domain/entities/chat-message.entity').ChatMessage[];

  @OneToMany('MonthlyUsage', 'user')
  monthlyUsages!: import('../../../usage/domain/entities/monthly-usage.entity').MonthlyUsage[];

  @OneToMany('SubscriptionBundle', 'user')
  subscriptionBundles!: import('../../../subscriptions/domain/entities/subscription-bundle.entity').SubscriptionBundle[];
}
