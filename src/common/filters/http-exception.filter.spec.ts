import {
  ArgumentsHost,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function createHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'GET', url: '/events' }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the status and response body of a client error', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(new BadRequestException('Invalid payload'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        path: '/events',
        error: expect.objectContaining({ message: 'Invalid payload' }),
      }),
    );
  });

  it('logs and preserves a server error status', () => {
    const filter = new HttpExceptionFilter();
    const { host, status } = createHost();
    const logger = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    filter.catch(new InternalServerErrorException('Unexpected'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(logger).toHaveBeenCalled();
  });
});
