import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsEmail()
  email: string;
  @Length(6)
  password: string;
}
