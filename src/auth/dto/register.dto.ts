import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'Full name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Email address', example: 'john@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password (min 6 characters)',
    example: '123456',
  })
  @Length(6)
  password: string;
}
