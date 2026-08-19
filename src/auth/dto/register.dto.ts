import 'reflect-metadata';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsCPFOrCNPJ } from 'src/common/validators/document.validator';

export class OrganizerDto {
  @IsNotEmpty()
  @IsString()
  legalName: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsCPFOrCNPJ()
  document: string;
}

export class RegisterDto {
  @ApiProperty({ description: 'Full name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Email address', example: 'john@email.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Password (min 6 characters)',
    example: '123456',
  })
  @IsNotEmpty()
  @Length(6)
  password: string;

  @IsOptional()
  @IsString()
  @IsIn(['BUYER', 'ORGANIZER'])
  role?: 'BUYER' | 'ORGANIZER' = 'BUYER';

  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizerDto)
  organizer?: OrganizerDto;
}
