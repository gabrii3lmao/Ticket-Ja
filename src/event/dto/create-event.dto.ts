import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsDate, Length } from 'class-validator';

export class CreateEventDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 256)
  name: string;

  @IsNotEmpty()
  @IsString()
  @Length(2, 256)
  artist: string;

  @Type(() => Date) // transforma a string do JSON em objeto Date
  @IsDate()
  @IsNotEmpty()
  date: Date;

  @IsNotEmpty()
  @IsString()
  @Length(2, 256)
  organizer: string;
}
