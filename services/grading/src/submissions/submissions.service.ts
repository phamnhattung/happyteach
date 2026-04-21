import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { GradingAIService } from '../ai/grading-ai.service'
import { BubbleScannerService } from './bubble-scanner.service'
import { GradingGateway } from '../gateway/grading.gateway'
import type { CreateSubmissionDto } from './dto/create-submission.dto'
import type { ApproveGradingDto } from './dto/approve-grading.dto'
import type { ManualScoreDto, OverrideQuestionScoreDto } from './dto/manual-score.dto'
import type { BubbleScanResult, KeyedQuestionResult, ExamQuestion } from '@happyteach/types'

@Injectable()
export class SubmissionsService {
  private prisma = new PrismaClient()
  private readonly logger = new Logger(SubmissionsService.name)

  constructor(
    private ai: GradingAIService,
    private scanner: BubbleScannerService,
    private gateway: GradingGateway,
  ) {}

  async create(dto: CreateSubmissionDto, teacherId: string) {
    const existing = await this.prisma.submission.findFirst({
      where: { examId: dto.examId, studentId: dto.studentId, status: { not: 'GRADED' } },
    })
    if (existing) return existing

    return this.prisma.submission.create({
      data: {
        examId: dto.examId,
        studentId: dto.studentId,
        studentName: dto.studentName,
        teacherId,
      },
    })
  }

  async scanBubbleSheet(
    submissionId: string,
    imageBuffer: Buffer,
    teacherId: string,
  ): Promise<BubbleScanResult> {
    const submission = await this.findWithExam(submissionId, teacherId)
    const exam = submission.exam
    const questions = exam.questions as ExamQuestion[]
    const versions = (exam.versions ?? null) as { version: string; questionOrder: string[] }[] | null

    // Preprocess image
    const processed = await this.scanner.preprocessImage(imageBuffer)

    // Decode QR → get examId + version + keyedCount
    let qrData = await this.scanner.decodeQR(processed)

    if (!qrData) {
      this.logger.warn(`QR decode failed for submission ${submissionId}, trying AI fallback`)
      qrData = await this.scanner.decodeQRViaAI(processed)
    }

    // Determine keyed questions (in version order if available)
    let keyedQuestions: ExamQuestion[]
    if (qrData && versions) {
      const ver = versions.find((v) => v.version === qrData!.version)
      keyedQuestions = ver
        ? ver.questionOrder
            .map((id) => questions.find((q) => q.id === id))
            .filter((q): q is ExamQuestion => !!q && q.gradingMode === 'keyed')
        : questions.filter((q) => q.gradingMode === 'keyed')
    } else {
      keyedQuestions = questions.filter((q) => q.gradingMode === 'keyed')
    }

    if (keyedQuestions.length === 0) {
      throw new BadRequestException('Đề thi không có câu hỏi trắc nghiệm')
    }

    // Detect bubbles
    const questionTypes = keyedQuestions.map((q) => q.type)
    const rawDetections = await this.scanner.detectBubbles(processed, keyedQuestions.length, questionTypes)

    // Map detected answers to answer key
    const results: KeyedQuestionResult[] = keyedQuestions.map((q, i) => {
      const detected = rawDetections[i]?.detected ?? null
      const confidence = rawDetections[i]?.confidence ?? 0
      const isCorrect = !!detected && detected === q.correctAnswer
      return {
        questionId: q.id,
        detected,
        correct: q.correctAnswer ?? '',
        isCorrect,
        points: isCorrect ? q.points : 0,
        confidence,
      }
    })

    const keyedScore = results.reduce((sum, r) => sum + r.points, 0)
    const keyedTotal = keyedQuestions.reduce((sum, q) => sum + q.points, 0)
    const nonKeyedQuestions = questions.filter((q) => q.gradingMode !== 'keyed')
    const pendingAiCount = nonKeyedQuestions.length

    const newStatus = pendingAiCount > 0 ? 'KEYED_DONE' : 'GRADED'

    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: newStatus,
        keyedScore,
        keyedResults: results as object[],
        ...(pendingAiCount === 0 ? { finalScore: keyedScore, gradedAt: new Date() } : {}),
      },
    })

    if (pendingAiCount === 0) {
      await this.upsertScore(submissionId, submission.studentId, exam.id, keyedScore)
    }

    // Flag low-confidence detections
    const flaggedCount = results.filter((r) => r.confidence < 0.55).length

    this.gateway.emit(submissionId, 'scan.bubble.done', {
      keyedScore,
      keyedTotal,
      pendingAiCount,
      flaggedCount,
    })

    return { keyedScore, keyedTotal, pendingAiCount, results }
  }

  async scanAnswerPages(
    submissionId: string,
    imageBuffers: Buffer[],
    teacherId: string,
  ) {
    const submission = await this.findWithExam(submissionId, teacherId)
    const questions = submission.exam.questions as ExamQuestion[]
    const nonKeyedQuestions = questions.filter((q) => q.gradingMode !== 'keyed')

    if (nonKeyedQuestions.length === 0) {
      throw new BadRequestException('Đề thi không có câu tự luận')
    }

    // Extract text from images via Claude Vision OCR
    const ocrResults = await this.ai.extractAnswers(
      imageBuffers,
      nonKeyedQuestions.map((q) => ({ id: q.id, order: q.order, content: q.content, gradingMode: q.gradingMode })),
    )

    // Grade each non-keyed question
    const gradingResults = await Promise.all(
      nonKeyedQuestions.map(async (q) => {
        const extracted = ocrResults.find((r) => r.questionId === q.id)
        const text = extracted?.extractedText ?? ''

        try {
          if (q.gradingMode === 'ai') {
            const result = await this.ai.gradeOpenAnswer({
              question: q.content,
              answer: text,
              maxPoints: q.points,
            })
            return {
              submissionId,
              questionId: q.id,
              ocrText: text,
              suggestedScore: Math.min(result.score, q.points),
              maxScore: q.points,
              reasoning: result.reasoning,
              status: 'pending_approval',
            }
          }

          if (q.gradingMode === 'essay') {
            const result = await this.ai.gradeEssay({
              question: q.content,
              answer: text,
              rubric: q.rubric ?? [],
              maxPoints: q.points,
            })
            return {
              submissionId,
              questionId: q.id,
              ocrText: text,
              suggestedScore: Math.min(result.total, q.points),
              maxScore: q.points,
              reasoning: result.feedback,
              criteriaScores: result.criteria,
              status: 'pending_approval',
            }
          }
        } catch (err) {
          this.logger.error(`AI grading failed for question ${q.id}: ${(err as Error).message}`)
        }

        return {
          submissionId,
          questionId: q.id,
          ocrText: text,
          suggestedScore: 0,
          maxScore: q.points,
          reasoning: 'Lỗi chấm bài tự động — cần giáo viên chấm thủ công',
          status: 'pending_approval',
        }
      }),
    )

    // Save all AI results
    await this.prisma.$transaction(
      gradingResults.map((result) =>
        this.prisma.aiGradingResult.upsert({
          where: { submissionId_questionId: { submissionId, questionId: result.questionId } },
          create: result as Parameters<typeof this.prisma.aiGradingResult.create>[0]['data'],
          update: {
            ocrText: result.ocrText,
            suggestedScore: result.suggestedScore,
            reasoning: result.reasoning,
            criteriaScores: result.criteriaScores as object | undefined,
            status: 'pending_approval',
          },
        }),
      ),
    )

    await this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'PENDING_APPROVAL' },
    })

    this.gateway.emit(submissionId, 'scan.ai.done', { count: gradingResults.length })

    return gradingResults
  }

  async getAiResults(submissionId: string, teacherId: string) {
    await this.findWithExam(submissionId, teacherId)
    return this.prisma.aiGradingResult.findMany({ where: { submissionId }, orderBy: { createdAt: 'asc' } })
  }

  async approveGrading(submissionId: string, dto: ApproveGradingDto, teacherId: string): Promise<void> {
    const submission = await this.findWithExam(submissionId, teacherId)

    await this.prisma.$transaction(async (tx) => {
      for (const a of dto.approvals) {
        await tx.aiGradingResult.update({
          where: { submissionId_questionId: { submissionId, questionId: a.questionId } },
          data: {
            status: 'approved',
            approvedScore: a.approvedScore,
            teacherNote: a.note,
          },
        })
      }

      const aiScore = dto.approvals.reduce((sum, a) => sum + a.approvedScore, 0)
      const keyedScore = submission.keyedScore ?? 0
      const finalScore = keyedScore + aiScore

      await tx.submission.update({
        where: { id: submissionId },
        data: { status: 'GRADED', aiScore, finalScore, gradedAt: new Date() },
      })

      await tx.score.upsert({
        where: { submissionId },
        create: { submissionId, studentId: submission.studentId, examId: submission.examId, value: finalScore },
        update: { value: finalScore },
      })

      await tx.auditLog.create({
        data: {
          userId: teacherId,
          action: 'GRADE_APPROVED',
          metadata: { submissionId, finalScore, aiScore },
        },
      })
    })

    this.gateway.emit(submissionId, 'grading.complete', { finalScore: (submission.keyedScore ?? 0) + dto.approvals.reduce((s, a) => s + a.approvedScore, 0) })
  }

  async manualScore(submissionId: string, dto: ManualScoreDto, teacherId: string): Promise<void> {
    const submission = await this.findWithExam(submissionId, teacherId)

    await this.prisma.$transaction(async (tx) => {
      await tx.submission.update({
        where: { id: submissionId },
        data: { status: 'GRADED', finalScore: dto.finalScore, gradedAt: new Date() },
      })

      await tx.score.upsert({
        where: { submissionId },
        create: { submissionId, studentId: submission.studentId, examId: submission.examId, value: dto.finalScore },
        update: { value: dto.finalScore },
      })

      await tx.auditLog.create({
        data: { userId: teacherId, action: 'MANUAL_GRADE', metadata: { submissionId, score: dto.finalScore, note: dto.note } },
      })
    })
  }

  async overrideQuestionScore(
    submissionId: string,
    questionId: string,
    dto: OverrideQuestionScoreDto,
    teacherId: string,
  ): Promise<void> {
    await this.findWithExam(submissionId, teacherId)

    await this.prisma.aiGradingResult.update({
      where: { submissionId_questionId: { submissionId, questionId } },
      data: { status: 'overridden', approvedScore: dto.score, teacherNote: dto.note },
    })

    await this.prisma.auditLog.create({
      data: { userId: teacherId, action: 'SCORE_OVERRIDE', metadata: { submissionId, questionId, score: dto.score } },
    })
  }

  async findByExam(examId: string, teacherId: string) {
    return this.prisma.submission.findMany({
      where: { examId },
      include: { aiResults: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  private async findWithExam(submissionId: string, teacherId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { exam: true },
    })
    if (!submission) throw new NotFoundException('Không tìm thấy bài nộp')
    if (submission.exam.teacherId !== teacherId && submission.teacherId !== teacherId) {
      throw new BadRequestException('Không có quyền truy cập')
    }
    return submission
  }

  private async upsertScore(
    submissionId: string,
    studentId: string,
    examId: string,
    value: number,
  ): Promise<void> {
    await this.prisma.score.upsert({
      where: { submissionId },
      create: { submissionId, studentId, examId, value },
      update: { value },
    })
  }
}
