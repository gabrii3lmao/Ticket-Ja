import { IsEmail, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty({ description: 'Email address', example: 'john@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password', example: '123456' })
  @IsNotEmpty()
  @Length(6)
  password: string;
}
