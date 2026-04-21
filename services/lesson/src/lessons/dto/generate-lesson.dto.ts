import { IsString, IsNumber, IsIn, IsOptional, Min, Max } from 'class-validator'

export class GenerateLessonDto {
  @IsString()
  subject: string

  @IsString()
  chapter: string

  @IsNumber()
  @Min(1)
  @Max(12)
  grade: number

  @IsIn([45, 90])
  duration: 45 | 90

  @IsOptional()
  @IsString()
  style?: string
}
