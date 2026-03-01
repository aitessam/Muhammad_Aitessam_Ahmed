import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';

@Entity('monthly_usages')
@Unique(['userId', 'year', 'month'])
@Index(['userId'])
@Index(['userId', 'year', 'month'])
export class MonthlyUsage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: import('../../../users/domain/entities/user.entity').User;

  @Column({ type: 'smallint' })
  year!: number;

  @Column({ type: 'smallint' })
  month!: number;

  @Column({ type: 'int', name: 'free_messages_used', default: 0 })
  freeMessagesUsed!: number;
}
