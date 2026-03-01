import 'reflect-metadata';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock process.env for consistent test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Set default test timeout
jest.setTimeout(10000);
