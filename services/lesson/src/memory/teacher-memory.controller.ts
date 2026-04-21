import {
  Controller,
  Get,
  Delete,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { TeacherMemoryService } from './teacher-memory.service'
import { AddCurriculumDto } from './dto/curriculum.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { AuthRequest } from '../auth/auth-request.interface'

@ApiTags('memory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('memory')
export class TeacherMemoryController {
  constructor(private memory: TeacherMemoryService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy tóm tắt phong cách giảng dạy' })
  getSummary(@Req() req: AuthRequest) {
    return this.memory.getSummary(req.user.id)
  }

  @Post('curriculum')
  @ApiOperation({ summary: 'Thêm ngữ cảnh chương trình dạy học' })
  addCurriculum(@Body() dto: AddCurriculumDto, @Req() req: AuthRequest) {
    return this.memory.addCurriculumContext(req.user.id, dto.text)
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa toàn bộ phong cách cá nhân hóa' })
  reset(@Req() req: AuthRequest) {
    return this.memory.reset(req.user.id)
  }
}
