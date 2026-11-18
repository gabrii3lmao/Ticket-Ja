import { readDatabaseState } from './state';

const { databaseUrl } = readDatabaseState();

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET ??= 'test-access-token-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-token-secret';
process.env.JWT_ACCESS_EXPIRATION ??= '15m';
process.env.JWT_REFRESH_EXPIRATION ??= '7d';
process.env.ORDER_RESERVATION_TTL_MINUTES ??= '15';
