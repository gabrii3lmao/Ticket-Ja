import { BadRequestException } from '@nestjs/common';
import {
  assertEndDateAfterStartDate,
  assertSalesWindow,
} from './event.validator';

describe('assertEndDateAfterStartDate', () => {
  const startDate = new Date('2026-09-15T20:00:00.000Z');

  it('should throw when endDate is before startDate', () => {
    expect(() =>
      assertEndDateAfterStartDate(
        startDate,
        new Date('2026-09-14T20:00:00.000Z'),
      ),
    ).toThrow(BadRequestException);
  });

  it('should not throw when endDate equals startDate', () => {
    expect(() =>
      assertEndDateAfterStartDate(startDate, new Date(startDate)),
    ).not.toThrow();
  });

  it('should not throw when endDate is after startDate', () => {
    expect(() =>
      assertEndDateAfterStartDate(
        startDate,
        new Date('2026-09-16T20:00:00.000Z'),
      ),
    ).not.toThrow();
  });

  it('should not throw when endDate is undefined', () => {
    expect(() => assertEndDateAfterStartDate(startDate)).not.toThrow();
  });
});

describe('assertSalesWindow', () => {
  const eventStartDate = new Date('2026-09-15T20:00:00.000Z');

  describe('salesEnd vs eventStartDate', () => {
    it('should throw when salesEnd is after eventStartDate', () => {
      expect(() =>
        assertSalesWindow(
          undefined,
          new Date('2026-09-16T20:00:00.000Z'),
          eventStartDate,
        ),
      ).toThrow(BadRequestException);
    });

    it('should not throw when salesEnd equals eventStartDate', () => {
      expect(() =>
        assertSalesWindow(undefined, new Date(eventStartDate), eventStartDate),
      ).not.toThrow();
    });
  });

  describe('salesStart vs salesEnd', () => {
    it('should throw when salesStart is after salesEnd', () => {
      expect(() =>
        assertSalesWindow(
          new Date('2026-08-10'),
          new Date('2026-08-01'),
          eventStartDate,
        ),
      ).toThrow(BadRequestException);
    });

    it('should throw when salesStart equals salesEnd', () => {
      const date = new Date('2026-08-10');
      expect(() =>
        assertSalesWindow(date, new Date(date), eventStartDate),
      ).toThrow(BadRequestException);
    });
  });

  describe('salesStart vs eventStartDate', () => {
    it('should throw when salesStart is after eventStartDate', () => {
      expect(() =>
        assertSalesWindow(
          new Date('2026-09-16T20:00:00.000Z'),
          undefined,
          eventStartDate,
        ),
      ).toThrow(BadRequestException);
    });

    it('should throw when salesStart equals eventStartDate', () => {
      expect(() =>
        assertSalesWindow(new Date(eventStartDate), undefined, eventStartDate),
      ).toThrow(BadRequestException);
    });

    it('should not throw when salesStart is before eventStartDate', () => {
      expect(() =>
        assertSalesWindow(new Date('2026-08-10'), undefined, eventStartDate),
      ).not.toThrow();
    });
  });

  it('should not throw when all values are undefined', () => {
    expect(() => assertSalesWindow()).not.toThrow();
  });
});
