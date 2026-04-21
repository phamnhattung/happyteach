import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import type { ExamQuestion } from '@happyteach/types'

export class CreateExamDto {
  @ApiProperty() @IsString() title!: string
  @ApiProperty() @IsString() subject!: string
  @ApiProperty() @IsNumber() @Min(1) @Max(12) grade!: number
  @ApiProperty() @IsNumber() @Min(15) duration!: number
  @ApiPropertyOptional() @IsString() @IsOptional() chapter?: string
  @ApiPropertyOptional() @IsString() @IsOptional() instructions?: string
  @ApiProperty() @IsArray() questions!: ExamQuestion[]
}
