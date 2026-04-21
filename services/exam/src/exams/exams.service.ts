import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { createId } from '@paralleldrive/cuid2'
import { AIProviderService } from '../ai/ai-provider.service'
import { PdfService } from '../pdf/pdf.service'
import type { CreateExamDto } from './dto/create-exam.dto'
import type { UpdateExamDto } from './dto/update-exam.dto'
import type { GenerateExamDto } from './dto/generate-exam.dto'
import type { ExamQuestion, ExamVersion } from '@happyteach/types'

@Injectable()
export class ExamsService {
  private prisma = new PrismaClient()

  constructor(
    private ai: AIProviderService,
    private pdf: PdfService,
  ) {}

  async generate(dto: GenerateExamDto): Promise<ExamQuestion[]> {
    return this.ai.generateExam(dto)
  }

  async create(dto: CreateExamDto, teacherId: string) {
    const exam = await this.prisma.exam.create({
      data: {
        title: dto.title,
        subject: dto.subject,
        grade: String(dto.grade),
        chapter: dto.chapter,
        duration: dto.duration,
        instructions: dto.instructions,
        questions: dto.questions as object[],
        teacherId,
      },
    })
    const questions = (dto.questions ?? []) as Array<{ gradingMode?: string }>
    const mcqCount = questions.filter((q) => q.gradingMode === 'keyed').length
    const essayCount = questions.length - mcqCount
    this.updateExamMemoryAsync(teacherId, dto.subject, mcqCount, essayCount).catch(() => null)
    return exam
  }

  private async updateExamMemoryAsync(
    teacherId: string,
    subject: string,
    mcqCount: number,
    essayCount: number,
  ) {
    const memory = await this.prisma.teacherMemory.findUnique({ where: { teacherId } })
    const existing = (memory?.styleProfile ?? {}) as Record<string, unknown>
    const examCount = ((existing.examCount as number | undefined) ?? 0) + 1
    const total = mcqCount + essayCount
    const mcqRatio = total > 0 ? mcqCount / total : 0.7
    const prevRatio = (existing.examMcqRatio as number | undefined) ?? 0.7
    const newRatio = parseFloat(((prevRatio * (examCount - 1) + mcqRatio) / examCount).toFixed(2))
    const subjects = Array.from(new Set([
      ...((existing.subjects as string[] | undefined) ?? []),
      subject,
    ]))
    await this.prisma.teacherMemory.upsert({
      where: { teacherId },
      create: {
        teacherId,
        subjects,
        styleProfile: { ...existing, examCount, examMcqRatio: newRatio, subjectCounts: { [subject]: 1 } },
      },
      update: {
        subjects,
        styleProfile: {
          ...existing,
          examCount,
          examMcqRatio: newRatio,
          subjectCounts: {
            ...((existing.subjectCounts as Record<string, number>) ?? {}),
            [subject]: (((existing.subjectCounts as Record<string, number>) ?? {})[subject] ?? 0) + 1,
          },
        },
      },
    })
  }

  async findAll(
    teacherId: string,
    page: number,
    limit: number,
    subject?: string,
    grade?: string,
    status?: string,
  ) {
    const where = {
      teacherId,
      deletedAt: null,
      ...(subject && { subject }),
      ...(grade && { grade }),
      ...(status && { status: status.toUpperCase() as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' }),
    }
    const [data, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.exam.count({ where }),
    ])
    return { data, total, page, limit }
  }

  async findOne(id: string, teacherId: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id, deletedAt: null } })
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi')
    if (exam.teacherId !== teacherId) throw new ForbiddenException()
    return exam
  }

  async update(id: string, dto: UpdateExamDto, teacherId: string) {
    const exam = await this.findOne(id, teacherId)
    if (exam.status === 'PUBLISHED') throw new BadRequestException('Không thể sửa đề đã xuất bản')
    return this.prisma.exam.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.duration ? { duration: dto.duration } : {}),
        ...(dto.instructions !== undefined ? { instructions: dto.instructions } : {}),
        ...(dto.questions ? { questions: dto.questions as object[] } : {}),
      },
    })
  }

  async remove(id: string, teacherId: string) {
    await this.findOne(id, teacherId)
    await this.prisma.exam.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async publish(id: string, teacherId: string) {
    const exam = await this.findOne(id, teacherId)
    const questions = exam.questions as ExamQuestion[]
    if (questions.length === 0) throw new BadRequestException('Đề thi chưa có câu hỏi')
    await this.prisma.exam.update({ where: { id }, data: { status: 'PUBLISHED' } })
    await this.prisma.auditLog.create({
      data: { userId: teacherId, action: 'EXAM_PUBLISHED', ipAddress: null, metadata: { examId: id } },
    })
    return { message: 'Đề thi đã được xuất bản' }
  }

  async duplicate(id: string, teacherId: string) {
    const exam = await this.findOne(id, teacherId)
    return this.prisma.exam.create({
      data: {
        title: `${exam.title} (bản sao)`,
        subject: exam.subject,
        grade: exam.grade,
        chapter: exam.chapter,
        duration: exam.duration,
        questions: exam.questions as object[],
        teacherId,
      },
    })
  }

  async generateVersions(id: string, teacherId: string): Promise<ExamVersion[]> {
    const exam = await this.findOne(id, teacherId)
    const questions = exam.questions as ExamQuestion[]
    const keyedQuestions = questions.filter((q) => q.gradingMode === 'keyed')
    const nonKeyedQuestions = questions.filter((q) => q.gradingMode !== 'keyed')

    const versions: ExamVersion[] = (['A', 'B', 'C'] as const).map((ver) => {
      const shuffledKeyed = ver === 'A' ? keyedQuestions : this.shuffleArray([...keyedQuestions])
      const optionMaps: Record<string, string[]> = {}

      shuffledKeyed.forEach((q) => {
        if (q.type === 'mcq' && q.options) {
          const shuffled = this.shuffleArray([...q.options])
          optionMaps[q.id] = shuffled
        }
      })

      const questionOrder = [
        ...shuffledKeyed.map((q) => q.id),
        ...nonKeyedQuestions.map((q) => q.id),
      ]

      return { version: ver, questionOrder, optionMaps }
    })

    await this.prisma.exam.update({ where: { id }, data: { versions: versions as object[] } })
    return versions
  }

  async exportStudentPdf(id: string, teacherId: string, versionLabel?: 'A' | 'B' | 'C'): Promise<Buffer> {
    const exam = await this.findOne(id, teacherId)
    const teacher = await this.prisma.user.findUnique({ where: { id: teacherId } })
    const questions = exam.questions as ExamQuestion[]
    const versions = exam.versions as ExamVersion[] | null
    const version = versionLabel && versions ? versions.find((v) => v.version === versionLabel) : undefined

    return this.pdf.generateStudentExamPdf(
      { id: exam.id, title: exam.title, subject: exam.subject, grade: exam.grade, duration: exam.duration, teacherName: teacher?.name ?? '' },
      questions,
      version,
    )
  }

  async exportBubblePdf(id: string, teacherId: string, versionLabel: 'A' | 'B' | 'C' = 'A'): Promise<Buffer> {
    const exam = await this.findOne(id, teacherId)
    const teacher = await this.prisma.user.findUnique({ where: { id: teacherId } })
    const questions = exam.questions as ExamQuestion[]
    const versions = exam.versions as ExamVersion[] | null

    if (!versions) {
      const generated = await this.generateVersions(id, teacherId)
      const version = generated.find((v) => v.version === versionLabel)!
      return this.pdf.generateBubbleSheetPdf(
        { id: exam.id, title: exam.title, subject: exam.subject, grade: exam.grade, duration: exam.duration, teacherName: teacher?.name ?? '' },
        questions,
        version,
      )
    }

    const version = versions.find((v) => v.version === versionLabel)
    if (!version) throw new BadRequestException(`Phiên bản ${versionLabel} chưa được tạo`)
    return this.pdf.generateBubbleSheetPdf(
      { id: exam.id, title: exam.title, subject: exam.subject, grade: exam.grade, duration: exam.duration, teacherName: teacher?.name ?? '' },
      questions,
      version,
    )
  }

  async exportAnswerKeyPdf(id: string, teacherId: string): Promise<Buffer> {
    const exam = await this.findOne(id, teacherId)
    const teacher = await this.prisma.user.findUnique({ where: { id: teacherId } })
    const questions = exam.questions as ExamQuestion[]

    await this.prisma.auditLog.create({
      data: { userId: teacherId, action: 'ANSWER_KEY_ACCESSED', ipAddress: null, metadata: { examId: id } },
    })

    return this.pdf.generateAnswerKeyPdf(
      { id: exam.id, title: exam.title, subject: exam.subject, grade: exam.grade, duration: exam.duration, teacherName: teacher?.name ?? '' },
      questions,
    )
  }

  private shuffleArray<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }
}
