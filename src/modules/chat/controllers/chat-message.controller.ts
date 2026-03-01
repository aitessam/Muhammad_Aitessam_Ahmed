import { Router, type Request, type Response } from 'express';
import xss from 'xss';
import { z } from 'zod';
import { AppDataSource } from '../../../shared/config/typeorm-data-source';
import { UserRepositoryImpl } from '../../users/repositories/user.repository';
import { QuotaRepositoryImpl } from '../repositories/quota.repository';
import { ChatQuotaDomainServiceImpl } from '../domain/services/chat-quota.service';
import { MockOpenAIServiceImpl } from '../domain/services/mock-openai.service';
import { ChatMessageRepositoryImpl } from '../repositories/chat-message.repository';
import { ChatMessageServiceImpl } from '../domain/services/chat-message.service';
import { BadRequestError } from '../../../shared/errors';
import { asyncHandler } from '../../../shared/middleware';

const sendMessageSchema = z
  .object({
    question: z
      .string()
      .min(1, 'Question is required')
      .max(10000, 'Question must not exceed 10000 characters'),
  })
  .strip();

function sanitizeInput(value: string): string {
  return xss(value, { whiteList: {} });
}

const router = Router();

const userRepo = new UserRepositoryImpl();
const quotaRepo = new QuotaRepositoryImpl();
const quotaService = new ChatQuotaDomainServiceImpl(quotaRepo);
const mockOpenAI = new MockOpenAIServiceImpl(500, 1500);
const chatMessageRepo = new ChatMessageRepositoryImpl();
const chatMessageService = new ChatMessageServiceImpl(
  AppDataSource,
  userRepo,
  quotaService,
  chatMessageRepo
);

router.post(
  '/messages',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parseResult = sendMessageSchema.safeParse(req.body);

    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      throw new BadRequestError(
        firstError?.message ?? 'Validation failed',
        'VALIDATION_ERROR'
      );
    }

    const { question: rawQuestion } = parseResult.data;
    const question = sanitizeInput(rawQuestion);

    const auth0Id = req.auth?.sub;
    if (!auth0Id) {
      throw new BadRequestError('User ID not found in token');
    }

    const email =
      typeof req.auth?.email === 'string' ? req.auth.email : undefined;

    const aiResponse = await mockOpenAI.getResponse(question);

    const result = await chatMessageService.processMessage(
      auth0Id,
      email,
      question,
      aiResponse
    );

    res.status(200).json({
      data: {
        answer: result.answer,
        usage: result.usage,
        quotaSource: result.quotaSource,
      },
    });
  })
);

export const chatMessageController = router;
