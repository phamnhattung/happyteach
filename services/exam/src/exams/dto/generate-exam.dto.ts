import { IsString, IsNumber, IsOptional, IsIn, ValidateNested, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

class QuestionMixDto {
  @ApiProperty() @IsNumber() @Min(0) mcqCount!: number
  @ApiProperty() @IsNumber() @Min(0) tfCount!: number
  @ApiProperty() @IsNumber() @Min(0) shortCount!: number
  @ApiProperty() @IsNumber() @Min(0) openCount!: number
  @ApiProperty() @IsNumber() @Min(0) essayCount!: number
}

export class GenerateExamDto {
  @ApiProperty() @IsString() subject!: string
  @ApiProperty() @IsNumber() @Min(1) @Max(12) grade!: number
  @ApiProperty() @IsString() chapter!: string
  @ApiProperty() @IsNumber() @Min(15) duration!: number
  @ApiPropertyOptional() @IsString() @IsOptional() instructions?: string
  @ApiProperty({ type: QuestionMixDto }) @ValidateNested() @Type(() => QuestionMixDto) questions!: QuestionMixDto
  @ApiProperty({ enum: [1, 2, 3, 4, 5] }) @IsIn([1, 2, 3, 4, 5]) difficulty!: 1 | 2 | 3 | 4 | 5
  @ApiPropertyOptional() @IsString() @IsOptional() rubricTemplate?: string
}
