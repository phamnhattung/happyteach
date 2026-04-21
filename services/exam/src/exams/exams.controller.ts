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
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import type { FastifyReply } from 'fastify'
import { ExamsService } from './exams.service'
import { CreateExamDto } from './dto/create-exam.dto'
import { UpdateExamDto } from './dto/update-exam.dto'
import { GenerateExamDto } from './dto/generate-exam.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { AuthRequest } from '../auth/auth-request.interface'

@ApiTags('exams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exams')
export class ExamsController {
  constructor(private exams: ExamsService) {}

  @Post('generate')
  @ApiOperation({ summary: 'AI generate exam questions' })
  generate(@Body() dto: GenerateExamDto) {
    return this.exams.generate(dto)
  }

  @Post()
  @ApiOperation({ summary: 'Lưu đề thi' })
  create(@Body() dto: CreateExamDto, @Req() req: AuthRequest) {
    return this.exams.create(dto, req.user.id)
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách đề thi' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published', 'archived'] })
  findAll(
    @Req() req: AuthRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('subject') subject?: string,
    @Query('grade') grade?: string,
    @Query('status') status?: string,
  ) {
    return this.exams.findAll(req.user.id, page, limit, subject, grade, status)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đề thi' })
  findOne(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.exams.findOne(id, req.user.id)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật đề thi' })
  update(@Param('id') id: string, @Body() dto: UpdateExamDto, @Req() req: AuthRequest) {
    return this.exams.update(id, dto, req.user.id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa đề thi' })
  remove(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.exams.remove(id, req.user.id)
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Xuất bản đề thi' })
  publish(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.exams.publish(id, req.user.id)
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Nhân bản đề thi' })
  duplicate(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.exams.duplicate(id, req.user.id)
  }

  @Post(':id/versions')
  @ApiOperation({ summary: 'Tạo đề phiên bản A/B/C' })
  generateVersions(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.exams.generateVersions(id, req.user.id)
  }

  @Get(':id/pdf/student')
  @ApiOperation({ summary: 'Xuất PDF đề cho học sinh' })
  async exportStudentPdf(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Res() res: FastifyReply,
    @Query('version') version?: 'A' | 'B' | 'C',
  ) {
    const pdf = await this.exams.exportStudentPdf(id, req.user.id, version)
    res.header('Content-Type', 'application/pdf')
    res.header('Content-Disposition', `attachment; filename="exam-${id}${version ? `-${version}` : ''}.pdf"`)
    res.send(pdf)
  }

  @Get(':id/pdf/bubble')
  @ApiOperation({ summary: 'Xuất PDF phiếu trả lời trắc nghiệm' })
  async exportBubblePdf(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Res() res: FastifyReply,
    @Query('version') version: 'A' | 'B' | 'C' = 'A',
  ) {
    const pdf = await this.exams.exportBubblePdf(id, req.user.id, version)
    res.header('Content-Type', 'application/pdf')
    res.header('Content-Disposition', `attachment; filename="bubble-${id}-${version}.pdf"`)
    res.send(pdf)
  }

  @Get(':id/pdf/key')
  @ApiOperation({ summary: 'Xuất PDF đáp án (giáo viên)' })
  async exportAnswerKeyPdf(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Res() res: FastifyReply,
  ) {
    const pdf = await this.exams.exportAnswerKeyPdf(id, req.user.id)
    res.header('Content-Type', 'application/pdf')
    res.header('Content-Disposition', `attachment; filename="key-${id}.pdf"`)
    res.header('Cache-Control', 'no-store')
    res.header('X-Expires-In', '900')
    res.send(pdf)
  }
}
