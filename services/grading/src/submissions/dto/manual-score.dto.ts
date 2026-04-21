import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ManualScoreDto {
  @ApiProperty() @IsNumber() @Min(0) @Max(10) finalScore!: number
  @ApiPropertyOptional() @IsString() @IsOptional() note?: string
}

export class OverrideQuestionScoreDto {
  @ApiProperty() @IsNumber() @Min(0) score!: number
  @ApiPropertyOptional() @IsString() @IsOptional() note?: string
}
