import { IsString, IsObject, IsOptional } from 'class-validator'
import type { LessonPlan } from '@happyteach/types'

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  subject?: string

  @IsOptional()
  @IsString()
  grade?: string

  @IsOptional()
  @IsObject()
  content?: Partial<LessonPlan>
}
