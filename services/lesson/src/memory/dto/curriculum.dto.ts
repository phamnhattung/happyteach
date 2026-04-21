import { IsString, MaxLength, MinLength } from 'class-validator'

export class AddCurriculumDto {
  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  text!: string
}
