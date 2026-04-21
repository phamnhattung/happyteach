import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator'

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string

  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  schoolName?: string
}
