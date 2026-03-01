import type { EntityManager } from 'typeorm';
import { ChatMessage } from '../domain/entities/chat-message.entity';

export interface CreateChatMessageDto {
  userId: string;
  question: string;
  answer: string;
  tokenUsage: number;
}

export interface ChatMessageRepository {
  create(
    manager: EntityManager,
    dto: CreateChatMessageDto
  ): Promise<ChatMessage>;
}

export class ChatMessageRepositoryImpl implements ChatMessageRepository {
  async create(
    manager: EntityManager,
    dto: CreateChatMessageDto
  ): Promise<ChatMessage> {
    const message = manager.create(ChatMessage, {
      userId: dto.userId,
      question: dto.question,
      answer: dto.answer,
      tokenUsage: dto.tokenUsage,
    });
    return manager.save(message);
  }
}
