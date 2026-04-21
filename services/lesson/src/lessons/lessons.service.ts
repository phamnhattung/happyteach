import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { AIProviderService } from '../ai/ai-provider.service'
import { TeacherMemoryService } from '../memory/teacher-memory.service'
import type { CreateLessonDto } from './dto/create-lesson.dto'
import type { UpdateLessonDto } from './dto/update-lesson.dto'
import type { GenerateLessonDto } from './dto/generate-lesson.dto'
import type { LessonPlan } from '@happyteach/types'

@Injectable()
export class LessonsService {
  private prisma = new PrismaClient()

  constructor(
    private ai: AIProviderService,
    private memory: TeacherMemoryService,
  ) {}

  async *generateStream(dto: GenerateLessonDto, teacherId: string): AsyncIterable<string> {
    const memoryContext = await this.memory.getContext(teacherId)
    yield* this.ai.generateLessonStream(dto, memoryContext || undefined)
  }

  async generateFull(dto: GenerateLessonDto, teacherId: string): Promise<LessonPlan> {
    const memoryContext = await this.memory.getContext(teacherId)
    return this.ai.generateLessonFull(dto, memoryContext || undefined)
  }

  async create(dto: CreateLessonDto, teacherId: string) {
    const content = dto.content as LessonPlan
    const lesson = await this.prisma.lesson.create({
      data: {
        title: content.title,
        subject: dto.subject,
        grade: dto.grade,
        content: content as object,
        teacherId,
      },
    })
    this.memory.updateAfterLesson(teacherId, dto.subject, content).catch(() => null)
    return lesson
  }

  async findAll(
    teacherId: string,
    page: number,
    limit: number,
    subject?: string,
    grade?: string,
  ) {
    const where = {
      teacherId,
      deletedAt: null,
      ...(subject && { subject }),
      ...(grade && { grade }),
    }
    const [data, total] = await Promise.all([
      this.prisma.lesson.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lesson.count({ where }),
    ])
    return { data, total, page, limit }
  }

  async findOne(id: string, teacherId: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id, deletedAt: null } })
    if (!lesson) throw new NotFoundException('Không tìm thấy bài giảng')
    if (lesson.teacherId !== teacherId) throw new ForbiddenException()
    return lesson
  }

  async update(id: string, dto: UpdateLessonDto, teacherId: string) {
    await this.findOne(id, teacherId)
    return this.prisma.lesson.update({
      where: { id },
      data: {
        ...(dto.subject && { subject: dto.subject }),
        ...(dto.grade && { grade: dto.grade }),
        ...(dto.content && { content: dto.content as object }),
      },
    })
  }

  async remove(id: string, teacherId: string) {
    await this.findOne(id, teacherId)
    await this.prisma.lesson.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async duplicate(id: string, teacherId: string) {
    const lesson = await this.findOne(id, teacherId)
    const content = lesson.content as LessonPlan
    return this.prisma.lesson.create({
      data: {
        title: `${content.title} (bản sao)`,
        subject: lesson.subject,
        grade: lesson.grade,
        content: lesson.content as object,
        teacherId,
      },
    })
  }

  async exportPdf(id: string, teacherId: string): Promise<Buffer> {
    const lesson = await this.findOne(id, teacherId)
    const content = lesson.content as LessonPlan
    const puppeteer = await import('puppeteer')
    const browser = await puppeteer.default.launch({ args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.setContent(this.buildHtml(lesson.title, content))
    const pdf = await page.pdf({ format: 'A4', printBackground: true })
    await browser.close()
    return Buffer.from(pdf)
  }

  private buildHtml(title: string, plan: LessonPlan): string {
    const phases = plan.teachingFlow
      .map(
        (p) => `
        <div class="phase">
          <h3>${p.phase} (${p.duration} phút)</h3>
          <p><strong>Hoạt động:</strong> ${p.activities.join('; ')}</p>
          <p><strong>Giáo viên:</strong> ${p.teacherActions.join('; ')}</p>
          <p><strong>Học sinh:</strong> ${p.studentActions.join('; ')}</p>
        </div>`
      )
      .join('')

    return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
    <style>
      body { font-family: 'Arial', sans-serif; padding: 40px; color: #1c1917; }
      h1 { color: #d97706; font-size: 22px; }
      h2 { color: #44403c; font-size: 16px; margin-top: 24px; }
      h3 { color: #b45309; font-size: 14px; }
      .phase { border-left: 3px solid #f59e0b; padding-left: 12px; margin: 12px 0; }
      ul { padding-left: 20px; }
    </style></head><body>
    <h1>GIÁO ÁN: ${title}</h1>
    <h2>Mục tiêu bài học</h2>
    <ul>${plan.objectives.map((o) => `<li>${o}</li>`).join('')}</ul>
    <h2>Thiết bị và tài liệu</h2>
    <ul>${plan.materials.map((m) => `<li>${m}</li>`).join('')}</ul>
    <h2>Tiến trình dạy học</h2>${phases}
    <h2>Bài tập về nhà</h2><p>${plan.homework}</p>
    <h2>Ghi chú sư phạm</h2><p>${plan.notes}</p>
    </body></html>`
  }

}
