jest.mock('generated/prisma/client', () => ({
  PrismaClient: class {},
}));

import { randomUUID } from 'crypto';

describe('debug', () => {
  it('should work', () => {
    const result = randomUUID();
    console.log('result:', result, typeof result);
    expect(typeof result).toBe('string');
  });
});
