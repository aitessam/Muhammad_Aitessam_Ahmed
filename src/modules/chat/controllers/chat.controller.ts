import { Router, type Request, type Response } from 'express';
import { Chat } from '../domain/entities/chat.entity';
import { ChatRepositoryImpl } from '../repositories/chat.repository';
import { ChatDomainServiceImpl } from '../domain/services/chat.service';
import { NotFoundError } from '../../../shared/errors';
import { AppDataSource } from '../../../shared/config/typeorm-data-source';
import { asyncHandler } from '../../../shared/middleware';

const router = Router();
const chatDomainService = new ChatDomainServiceImpl();

function getChatRepository(): ChatRepositoryImpl {
  const repo = AppDataSource.getRepository(Chat);
  return new ChatRepositoryImpl(repo);
}

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const chatRepo = getChatRepository();
    const chats = await chatRepo.findAll();
    res.json({ data: chats });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const chatRepo = getChatRepository();
    const chat = await chatRepo.findById(req.params.id);
    if (!chat) {
      throw new NotFoundError('Chat not found');
    }
    res.json({ data: chat });
  })
);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const chatRepo = getChatRepository();
  const dto = req.body as { title: string; description?: string };
    const chat = await chatRepo.create(dto, chatDomainService);
    res.status(201).json({ data: chat });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const chatRepo = getChatRepository();
  const dto = req.body as { title?: string; description?: string };
    const chat = await chatRepo.update(req.params.id, dto, chatDomainService);
    if (!chat) {
      throw new NotFoundError('Chat not found');
    }
    res.json({ data: chat });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const chatRepo = getChatRepository();
    const deleted = await chatRepo.delete(req.params.id);
    if (!deleted) {
      throw new NotFoundError('Chat not found');
    }
    res.status(204).send();
  })
);

export const chatController = router;
