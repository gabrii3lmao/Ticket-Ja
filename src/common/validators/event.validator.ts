import { BadRequestException } from '@nestjs/common';

export function assertEndDateAfterStartDate(startDate: Date, endDate?: Date) {
  if (endDate && endDate < startDate) {
    throw new BadRequestException(
      'Event end date must be on or after the start date',
    );
  }
}

export function assertSalesWindow(
  salesStart?: Date,
  salesEnd?: Date,
  eventStartDate?: Date,
) {
  if (salesEnd && eventStartDate && salesEnd > eventStartDate) {
    throw new BadRequestException(
      'Sales end date must be before or on the event start date',
    );
  }
  if (salesStart && salesEnd && salesStart >= salesEnd) {
    throw new BadRequestException(
      'Sales start date must be before sales end date',
    );
  }
  if (salesStart && eventStartDate && salesStart >= eventStartDate) {
    throw new BadRequestException(
      'Sales start date must be before the event start date',
    );
  }
}
