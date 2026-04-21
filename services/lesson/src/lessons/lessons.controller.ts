import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  Sse,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Observable, from } from 'rxjs'
import type { FastifyReply } from 'fastify'
import { LessonsService } from './lessons.service'
import { CreateLessonDto } from './dto/create-lesson.dto'
import { UpdateLessonDto } from './dto/update-lesson.dto'
import { GenerateLessonDto } from './dto/generate-lesson.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { AuthRequest } from '../auth/auth-request.interface'

@ApiTags('lessons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lessons')
export class LessonsController {
  constructor(private lessons: LessonsService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Stream AI lesson generation (SSE)' })
  async generateStream(
    @Body() dto: GenerateLessonDto,
    @Res() res: FastifyReply,
    @Req() req: AuthRequest,
  ) {
    res.raw.setHeader('Content-Type', 'text/event-stream')
    res.raw.setHeader('Cache-Control', 'no-cache')
    res.raw.setHeader('Connection', 'keep-alive')
    res.raw.flushHeaders?.()

    for await (const chunk of this.lessons.generateStream(dto, req.user.id)) {
      res.raw.write(`data: ${JSON.stringify({ token: chunk })}\n\n`)
    }
    res.raw.write('data: [DONE]\n\n')
    res.raw.end()
  }

  @Post()
  @ApiOperation({ summary: 'Lưu bài giảng' })
  create(@Body() dto: CreateLessonDto, @Req() req: AuthRequest) {
    return this.lessons.create(dto, req.user.id)
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách bài giảng' })
  findAll(
    @Req() req: AuthRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('subject') subject?: string,
    @Query('grade') grade?: string,
  ) {
    return this.lessons.findAll(req.user.id, page, limit, subject, grade)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết bài giảng' })
  findOne(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.lessons.findOne(id, req.user.id)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật bài giảng' })
  update(@Param('id') id: string, @Body() dto: UpdateLessonDto, @Req() req: AuthRequest) {
    return this.lessons.update(id, dto, req.user.id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa bài giảng' })
  remove(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.lessons.remove(id, req.user.id)
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Nhân bản bài giảng' })
  duplicate(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.lessons.duplicate(id, req.user.id)
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Xuất PDF bài giảng' })
  async exportPdf(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Res() res: FastifyReply,
  ) {
    const pdf = await this.lessons.exportPdf(id, req.user.id)
    res.header('Content-Type', 'application/pdf')
    res.header('Content-Disposition', `attachment; filename="lesson-${id}.pdf"`)
    res.send(pdf)
  }
}
