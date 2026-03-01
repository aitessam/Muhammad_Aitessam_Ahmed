import type { Chat } from '../entities/chat.entity';

export interface ChatPolicy {
  canRead(chat: Chat, userId?: string): boolean;
  canUpdate(chat: Chat, userId?: string): boolean;
  canDelete(chat: Chat, userId?: string): boolean;
}

export class ChatPolicyImpl implements ChatPolicy {
  canRead(_chat: Chat, _userId?: string): boolean {
    return true;
  }

  canUpdate(_chat: Chat, _userId?: string): boolean {
    return true;
  }

  canDelete(_chat: Chat, _userId?: string): boolean {
    return true;
  }
}
