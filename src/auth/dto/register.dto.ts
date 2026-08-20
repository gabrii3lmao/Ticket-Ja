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
  @ApiProperty({
    description: 'Legal name of the organizer company',
    example: 'John Corp LTDA',
  })
  @IsNotEmpty()
  @IsString()
  legalName: string;

  @ApiProperty({
    description: 'Trade name of the organizer company',
    required: false,
    example: 'John Corp',
  })
  @IsOptional()
  @IsString()
  tradeName?: string;

  @ApiProperty({
    description: 'CPF or CNPJ of the organizer',
    example: '12345678000190',
  })
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

  @ApiProperty({
    description: 'User role',
    enum: ['BUYER', 'ORGANIZER'],
    default: 'BUYER',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['BUYER', 'ORGANIZER'])
  role?: 'BUYER' | 'ORGANIZER' = 'BUYER';

  @ApiProperty({
    description: 'Organizer data, required when role is ORGANIZER',
    type: OrganizerDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizerDto)
  organizer?: OrganizerDto;
}
