import type { Repository } from 'typeorm';
import { Chat } from '../domain/entities/chat.entity';
import type { CreateChatDto, UpdateChatDto } from '../domain/services/chat.service';
import type { ChatDomainService } from '../domain/services/chat.service';

export interface ChatRepository {
  findById(id: string): Promise<Chat | null>;
  findAll(): Promise<Chat[]>;
  create(dto: CreateChatDto, domainService: ChatDomainService): Promise<Chat>;
  update(id: string, dto: UpdateChatDto, domainService: ChatDomainService): Promise<Chat | null>;
  delete(id: string): Promise<boolean>;
}

export class ChatRepositoryImpl implements ChatRepository {
  constructor(private readonly repo: Repository<Chat>) {}

  async findById(id: string): Promise<Chat | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findAll(): Promise<Chat[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async create(dto: CreateChatDto, domainService: ChatDomainService): Promise<Chat> {
    const chat = domainService.createChat(dto);
    return this.repo.save(chat);
  }

  async update(
    id: string,
    dto: UpdateChatDto,
    domainService: ChatDomainService
  ): Promise<Chat | null> {
    const chat = await this.findById(id);
    if (!chat) return null;

    domainService.validateUpdate(dto);

    if (dto.title !== undefined) chat.title = dto.title.trim();
    if (dto.description !== undefined) chat.description = dto.description?.trim() ?? null;

    return this.repo.save(chat);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
