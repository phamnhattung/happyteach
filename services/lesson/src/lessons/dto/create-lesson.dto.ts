import { IsString, IsNumber, IsObject, Min, Max } from 'class-validator'
import type { LessonPlan } from '@happyteach/types'

export class CreateLessonDto {
  @IsString()
  subject: string

  @IsString()
  grade: string

  @IsNumber()
  @Min(45)
  @Max(90)
  duration: number

  @IsObject()
  content: LessonPlan
}
