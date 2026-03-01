import type { DataSource, EntityManager } from 'typeorm';
import type { ChatQuotaDomainService } from './chat-quota.service';
import type { MockOpenAIResponse } from './mock-openai.service';
import type { ChatMessageRepository } from '../../repositories/chat-message.repository';
import type { QuotaSource } from '../../repositories/quota.repository';
import type { UserRepository } from '../../../users/repositories/user.repository';

export interface ProcessMessageResult {
  answer: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  quotaSource: QuotaSource;
}

export interface ChatMessageService {
  processMessage(
    auth0Id: string,
    email: string | undefined,
    question: string,
    aiResponse: MockOpenAIResponse
  ): Promise<ProcessMessageResult>;
}

export class ChatMessageServiceImpl implements ChatMessageService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly userRepo: UserRepository,
    private readonly quotaService: ChatQuotaDomainService,
    private readonly chatMessageRepo: ChatMessageRepository
  ) {}

  async processMessage(
    auth0Id: string,
    email: string | undefined,
    question: string,
    aiResponse: MockOpenAIResponse
  ): Promise<ProcessMessageResult> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const user = await this.userRepo.getOrCreateByAuth0Id(
        manager,
        auth0Id,
        email
      );

      const quotaSource = await this.quotaService.checkAndConsumeQuota(
        manager,
        user.id
      );

      const message = await this.chatMessageRepo.create(manager, {
        userId: user.id,
        question,
        answer: aiResponse.answer,
        tokenUsage: aiResponse.usage.totalTokens,
      });

      void message;

      return {
        answer: aiResponse.answer,
        usage: aiResponse.usage,
        quotaSource,
      };
    });
  }
}
