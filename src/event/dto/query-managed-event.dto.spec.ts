import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryManagedEventDto } from './query-managed-event.dto';

const options = { whitelist: true, forbidNonWhitelisted: true };

describe('QueryManagedEventDto', () => {
  it('accepts and coerces a management query with status', async () => {
    const dto = plainToInstance(QueryManagedEventDto, {
      page: '1',
      limit: '15',
      name: 'rock',
      status: 'DRAFT',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    const errors = await validate(dto, options);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(15);
    expect(dto.status).toBe('DRAFT');
  });

  it('rejects an invalid status value', async () => {
    const dto = plainToInstance(QueryManagedEventDto, { status: 'NOPE' });

    const errors = await validate(dto, options);

    expect(errors.some((error) => error.property === 'status')).toBe(true);
  });

  it('rejects unknown properties', async () => {
    const dto = plainToInstance(QueryManagedEventDto, { bogus: 'x' });

    const errors = await validate(dto, options);

    expect(errors.some((error) => error.property === 'bogus')).toBe(true);
  });
});
