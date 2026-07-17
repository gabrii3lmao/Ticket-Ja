import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class SignInDto {
  @IsEmail()
  email: string;
  @IsNotEmpty()
  @Length(6)
  password: string;
}
