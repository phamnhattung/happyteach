import { Controller, Get, Param, Query, UseGuards, Req, Res } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import type { FastifyReply } from 'fastify'
import { GradebookService } from './gradebook.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { AuthRequest } from '../auth/auth-request.interface'

@ApiTags('gradebook')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('grading')
export class GradebookController {
  constructor(private gradebook: GradebookService) {}

  @Get('class')
  @ApiOperation({ summary: 'Bảng điểm lớp (tất cả đề đã xuất bản)' })
  @ApiQuery({ name: 'subject', required: false })
  getClass(@Req() req: AuthRequest, @Query('subject') subject?: string) {
    return this.gradebook.getClassGradebook(req.user.id, subject)
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'Lịch sử điểm học sinh' })
  getStudent(@Param('studentId') studentId: string) {
    return this.gradebook.getStudentHistory(studentId)
  }

  @Get('exam/:examId/stats')
  @ApiOperation({ summary: 'Thống kê điểm theo đề thi' })
  getExamStats(@Param('examId') examId: string) {
    return this.gradebook.getExamStats(examId)
  }

  @Get('export/excel')
  @ApiOperation({ summary: 'Xuất bảng điểm Excel' })
  async exportExcel(@Req() req: AuthRequest, @Res() res: FastifyReply) {
    const buffer = await this.gradebook.exportExcel(req.user.id)
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.header('Content-Disposition', 'attachment; filename="gradebook.xlsx"')
    res.send(buffer)
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Xuất bảng điểm PDF' })
  async exportPdf(@Req() req: AuthRequest, @Res() res: FastifyReply) {
    const buffer = await this.gradebook.exportPdf(req.user.id)
    res.header('Content-Type', 'application/pdf')
    res.header('Content-Disposition', 'attachment; filename="gradebook.pdf"')
    res.send(buffer)
  }
}
