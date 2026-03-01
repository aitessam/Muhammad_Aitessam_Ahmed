export interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface MockOpenAIResponse {
  answer: string;
  usage: OpenAIUsage;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_ANSWERS = [
  'This is a simulated response. In production, integrate with OpenAI API.',
  'Based on your question, here is a placeholder answer. Replace with real AI.',
  'Mock response: Your query has been processed with simulated latency.',
];

export interface MockOpenAIService {
  getResponse(question: string): Promise<MockOpenAIResponse>;
}

export class MockOpenAIServiceImpl implements MockOpenAIService {
  constructor(
    private readonly minLatencyMs: number = 500,
    private readonly maxLatencyMs: number = 1500
  ) {}

  async getResponse(question: string): Promise<MockOpenAIResponse> {
    const latency = randomBetween(this.minLatencyMs, this.maxLatencyMs);
    await sleep(latency);

    const promptTokens = Math.min(question.length / 4, 100) + 10;
    const completionTokens = randomBetween(20, 80);
    const totalTokens = promptTokens + completionTokens;

    const answer =
      MOCK_ANSWERS[randomBetween(0, MOCK_ANSWERS.length - 1)] +
      ` [${question.slice(0, 50)}...]`;

    return {
      answer,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
    };
  }
}
