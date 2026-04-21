import { IsString, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateSubmissionDto {
  @ApiProperty() @IsString() examId!: string
  @ApiProperty() @IsString() studentId!: string
  @ApiPropertyOptional() @IsString() @IsOptional() studentName?: string
}
