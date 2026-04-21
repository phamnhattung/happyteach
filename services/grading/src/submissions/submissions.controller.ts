import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger'
import { SubmissionsService } from './submissions.service'
import { CreateSubmissionDto } from './dto/create-submission.dto'
import { ApproveGradingDto } from './dto/approve-grading.dto'
import { ManualScoreDto, OverrideQuestionScoreDto } from './dto/manual-score.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { AuthRequest } from '../auth/auth-request.interface'

@ApiTags('grading')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('grading/submissions')
export class SubmissionsController {
  constructor(private submissions: SubmissionsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo bài nộp mới' })
  create(@Body() dto: CreateSubmissionDto, @Req() req: AuthRequest) {
    return this.submissions.create(dto, req.user.id)
  }

  @Post(':id/scan/bubble')
  @ApiOperation({ summary: 'Phase 1: Quét phiếu trả lời trắc nghiệm' })
  @ApiConsumes('multipart/form-data')
  async scanBubble(@Param('id') id: string, @Req() req: AuthRequest) {
    const body = await req.file()
    if (!body) throw new Error('No image uploaded')
    const buffer = await body.toBuffer()
    return this.submissions.scanBubbleSheet(id, buffer, req.user.id)
  }

  @Post(':id/scan/answers')
  @ApiOperation({ summary: 'Phase 2: Quét trang trả lời tự luận' })
  @ApiConsumes('multipart/form-data')
  async scanAnswers(@Param('id') id: string, @Req() req: AuthRequest) {
    const parts = req.files()
    const buffers: Buffer[] = []
    for await (const part of parts) {
      buffers.push(await part.toBuffer())
    }
    return this.submissions.scanAnswerPages(id, buffers, req.user.id)
  }

  @Get(':id/ai-results')
  @ApiOperation({ summary: 'Lấy kết quả AI để duyệt' })
  getAiResults(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.submissions.getAiResults(id, req.user.id)
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Phase 3: Duyệt kết quả AI → hoàn tất chấm bài' })
  approve(@Param('id') id: string, @Body() dto: ApproveGradingDto, @Req() req: AuthRequest) {
    return this.submissions.approveGrading(id, dto, req.user.id)
  }

  @Post(':id/manual')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Nhập điểm thủ công' })
  manualScore(@Param('id') id: string, @Body() dto: ManualScoreDto, @Req() req: AuthRequest) {
    return this.submissions.manualScore(id, dto, req.user.id)
  }

  @Put(':id/score/:qId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Override điểm từng câu' })
  overrideScore(
    @Param('id') id: string,
    @Param('qId') qId: string,
    @Body() dto: OverrideQuestionScoreDto,
    @Req() req: AuthRequest,
  ) {
    return this.submissions.overrideQuestionScore(id, qId, dto, req.user.id)
  }

  @Get('exam/:examId')
  @ApiOperation({ summary: 'Danh sách bài nộp theo đề thi' })
  findByExam(@Param('examId') examId: string, @Req() req: AuthRequest) {
    return this.submissions.findByExam(examId, req.user.id)
  }
}
