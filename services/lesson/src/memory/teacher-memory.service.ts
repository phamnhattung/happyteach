import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import type { LessonPlan } from '@happyteach/types'

interface StyleProfile {
  avgDifficulty: number
  lessonCount: number
  examCount: number
  subjectCounts: Record<string, number>
  preferredPhases: Record<string, number>
  examMcqRatio: number
  avgMcqCount: number
  avgEssayCount: number
  curriculumContext: string
  style: string
}

const DEFAULT_PROFILE: StyleProfile = {
  avgDifficulty: 3,
  lessonCount: 0,
  examCount: 0,
  subjectCounts: {},
  preferredPhases: {},
  examMcqRatio: 0.7,
  avgMcqCount: 0,
  avgEssayCount: 0,
  curriculumContext: '',
  style: '',
}

@Injectable()
export class TeacherMemoryService {
  private prisma = new PrismaClient()

  async getContext(teacherId: string): Promise<string> {
    const memory = await this.prisma.teacherMemory.findUnique({ where: { teacherId } })
    if (!memory) return ''

    const p = { ...DEFAULT_PROFILE, ...(memory.styleProfile as Partial<StyleProfile>) }
    const lines: string[] = []

    if (p.lessonCount > 0) {
      const topSubjects = Object.entries(p.subjectCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([s]) => s)
        .join(', ')
      lines.push(`- Đã soạn ${p.lessonCount} giáo án, môn chủ yếu: ${topSubjects}`)
      lines.push(`- Độ khó ưa thích: ${p.avgDifficulty.toFixed(1)}/5`)
    }

    if (p.examCount > 0) {
      lines.push(`- Đã tạo ${p.examCount} đề thi, tỉ lệ trắc nghiệm: ${Math.round(p.examMcqRatio * 100)}%`)
    }

    const topPhases = Object.entries(p.preferredPhases)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([ph]) => ph)
    if (topPhases.length > 0) {
      lines.push(`- Ưu tiên hoạt động: ${topPhases.join(', ')}`)
    }

    if (p.style) {
      lines.push(`- Phong cách dạy học: ${p.style}`)
    }

    if (p.curriculumContext) {
      lines.push(`\nBối cảnh chương trình (do giáo viên cung cấp):\n${p.curriculumContext.slice(0, 1500)}`)
    }

    return lines.length > 0 ? `Thông tin về giáo viên:\n${lines.join('\n')}` : ''
  }

  async getSummary(teacherId: string) {
    const memory = await this.prisma.teacherMemory.findUnique({ where: { teacherId } })
    if (!memory) {
      return { hasMemory: false, profile: DEFAULT_PROFILE }
    }
    return {
      hasMemory: true,
      profile: { ...DEFAULT_PROFILE, ...(memory.styleProfile as Partial<StyleProfile>) },
    }
  }

  async updateAfterLesson(teacherId: string, subject: string, content: LessonPlan) {
    const memory = await this.prisma.teacherMemory.findUnique({ where: { teacherId } })
    const p: StyleProfile = memory
      ? { ...DEFAULT_PROFILE, ...(memory.styleProfile as Partial<StyleProfile>) }
      : { ...DEFAULT_PROFILE }

    p.lessonCount += 1
    p.avgDifficulty = rollingAvg(p.avgDifficulty, p.lessonCount - 1, content.estimatedDifficulty)
    p.subjectCounts[subject] = (p.subjectCounts[subject] ?? 0) + 1

    for (const phase of content.teachingFlow) {
      p.preferredPhases[phase.phase] = (p.preferredPhases[phase.phase] ?? 0) + 1
    }

    await this.upsert(teacherId, subject, p)
  }

  async updateAfterExam(teacherId: string, subject: string, mcqCount: number, essayCount: number) {
    const memory = await this.prisma.teacherMemory.findUnique({ where: { teacherId } })
    const p: StyleProfile = memory
      ? { ...DEFAULT_PROFILE, ...(memory.styleProfile as Partial<StyleProfile>) }
      : { ...DEFAULT_PROFILE }

    p.examCount += 1
    p.subjectCounts[subject] = (p.subjectCounts[subject] ?? 0) + 1
    const total = mcqCount + essayCount
    if (total > 0) {
      p.examMcqRatio = rollingAvg(p.examMcqRatio, p.examCount - 1, mcqCount / total)
    }
    p.avgMcqCount = rollingAvg(p.avgMcqCount, p.examCount - 1, mcqCount)
    p.avgEssayCount = rollingAvg(p.avgEssayCount, p.examCount - 1, essayCount)

    await this.upsert(teacherId, subject, p)
  }

  async addCurriculumContext(teacherId: string, text: string) {
    const memory = await this.prisma.teacherMemory.findUnique({ where: { teacherId } })
    const p: StyleProfile = memory
      ? { ...DEFAULT_PROFILE, ...(memory.styleProfile as Partial<StyleProfile>) }
      : { ...DEFAULT_PROFILE }

    p.curriculumContext = text.trim().slice(0, 3000)

    const subjects = memory?.subjects ?? []
    await this.upsert(teacherId, subjects[0] ?? '', p)
  }

  async reset(teacherId: string) {
    await this.prisma.teacherMemory.deleteMany({ where: { teacherId } })
  }

  private async upsert(teacherId: string, subject: string, profile: StyleProfile) {
    const subjects = Object.keys(profile.subjectCounts)
    await this.prisma.teacherMemory.upsert({
      where: { teacherId },
      create: { teacherId, subjects, styleProfile: profile as object },
      update: { subjects, styleProfile: profile as object },
    })
  }
}

function rollingAvg(current: number, n: number, next: number): number {
  if (n === 0) return next
  return parseFloat(((current * n + next) / (n + 1)).toFixed(2))
}
