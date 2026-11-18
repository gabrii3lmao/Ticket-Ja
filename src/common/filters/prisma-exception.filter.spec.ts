// The generated Prisma client ships with ESM-style `.js` imports that the
// unit-test resolver cannot follow. The filter only needs the error class.
jest.mock('generated/prisma/client', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    clientVersion: string;

    constructor(
      message: string,
      { code, clientVersion }: { code: string; clientVersion: string },
    ) {
      super(message);
      this.name = 'PrismaClientKnownRequestError';
      this.code = code;
      this.clientVersion = clientVersion;
    }
  }

  return { Prisma: { PrismaClientKnownRequestError } };
});

import { ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaClientExceptionFilter } from './prisma-exception.filter';

function createHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'POST', url: '/orders' }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

function createError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(
    'database error\nsecond line',
    {
      code,
      clientVersion: 'test',
    },
  );
}

describe('PrismaClientExceptionFilter', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['P2000', HttpStatus.BAD_REQUEST],
    ['P2002', HttpStatus.CONFLICT],
    ['P2003', HttpStatus.UNPROCESSABLE_ENTITY],
    ['P2025', HttpStatus.NOT_FOUND],
  ])('maps %s to %s', (code, expectedStatus) => {
    const filter = new PrismaClientExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(createError(code), host);

    expect(status).toHaveBeenCalledWith(expectedStatus);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: expectedStatus,
        path: '/orders',
        error: expect.objectContaining({
          code,
          message: 'database errorsecond line',
        }),
      }),
    );
  });

  it('maps unknown Prisma errors to 500', () => {
    const filter = new PrismaClientExceptionFilter();
    const { host, status } = createHost();

    filter.catch(createError('P9999'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
