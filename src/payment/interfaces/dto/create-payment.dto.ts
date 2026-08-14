import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaymentMethod } from 'generated/prisma/enums';

export class CreatePaymentInput {
  @IsNotEmpty()
  @IsString()
  customerExternalId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(0.01)
  amount: number; // in Reais, ex: 105.00

  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  method: PaymentMethod; // Passa u Pix

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  dueDate: Date;

  @IsOptional()
  @IsString()
  description?: string;
}
