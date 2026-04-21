import { IsString, IsNumber, IsOptional, IsArray, Min, Max } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import type { ExamQuestion } from '@happyteach/types'

export class UpdateExamDto {
  @ApiPropertyOptional() @IsString() @IsOptional() title?: string
  @ApiPropertyOptional() @IsNumber() @Min(15) @IsOptional() duration?: number
  @ApiPropertyOptional() @IsString() @IsOptional() instructions?: string
  @ApiPropertyOptional() @IsArray() @IsOptional() questions?: ExamQuestion[]
}
