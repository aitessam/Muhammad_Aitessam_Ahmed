import type { Chat } from '../entities/chat.entity';
import { DomainValidationError } from '../errors';

export interface CreateChatDto {
  title: string;
  description?: string;
}

export interface UpdateChatDto {
  title?: string;
  description?: string;
}

export interface ChatDomainService {
  validateCreate(dto: CreateChatDto): void;
  validateUpdate(dto: UpdateChatDto): void;
  createChat(dto: CreateChatDto): Chat;
}

export class ChatDomainServiceImpl implements ChatDomainService {
  validateCreate(dto: CreateChatDto): void {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new DomainValidationError('Chat title is required');
    }
    if (dto.title.length > 255) {
      throw new DomainValidationError('Chat title must not exceed 255 characters');
    }
  }

  validateUpdate(dto: UpdateChatDto): void {
    if (dto.title !== undefined) {
      if (!dto.title || dto.title.trim().length === 0) {
        throw new DomainValidationError('Chat title cannot be empty');
      }
      if (dto.title.length > 255) {
        throw new DomainValidationError(
          'Chat title must not exceed 255 characters'
        );
      }
    }
  }

  createChat(dto: CreateChatDto): Chat {
    this.validateCreate(dto);
    const chat = new Chat();
    chat.title = dto.title.trim();
    chat.description = dto.description?.trim() ?? null;
    return chat;
  }
}
