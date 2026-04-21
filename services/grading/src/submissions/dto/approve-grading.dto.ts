import { IsArray, IsNumber, IsOptional, IsString, ValidateNested, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

class ApprovalItemDto {
  @ApiProperty() @IsString() questionId!: string
  @ApiProperty() @IsNumber() @Min(0) approvedScore!: number
  @ApiPropertyOptional() @IsString() @IsOptional() note?: string
}

export class ApproveGradingDto {
  @ApiProperty({ type: [ApprovalItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalItemDto)
  approvals!: ApprovalItemDto[]
}
