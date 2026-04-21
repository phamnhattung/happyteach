import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

export interface GradebookCell {
  submissionId: string | null
  score: number | null
  status: string
  pct: number | null
}

export interface GradebookRow {
  studentId: string
  studentName: string
  scores: Record<string, GradebookCell>
  average: number | null
}

export interface GradebookData {
  examIds: string[]
  examTitles: Record<string, string>
  rows: GradebookRow[]
}

@Injectable()
export class GradebookService {
  private prisma = new PrismaClient()

  async getClassGradebook(teacherId: string, subject?: string): Promise<GradebookData> {
    const exams = await this.prisma.exam.findMany({
      where: { teacherId, deletedAt: null, status: 'PUBLISHED', ...(subject ? { subject } : {}) },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })

    if (exams.length === 0) return { examIds: [], examTitles: {}, rows: [] }

    const examIds = exams.map((e) => e.id)
    const examTitles: Record<string, string> = {}
    for (const e of exams) examTitles[e.id] = e.title

    const submissions = await this.prisma.submission.findMany({
      where: { examId: { in: examIds } },
      include: { score: true },
      orderBy: { createdAt: 'asc' },
    })

    // Group by student
    const studentMap = new Map<string, { name: string; scores: Record<string, GradebookCell> }>()

    for (const sub of submissions) {
      if (!studentMap.has(sub.studentId)) {
        studentMap.set(sub.studentId, { name: sub.studentName ?? sub.studentId, scores: {} })
      }
      const student = studentMap.get(sub.studentId)!
      const exam = exams.find((e) => e.id === sub.examId)
      const total = 10
      const value = sub.finalScore ?? sub.score?.value ?? null
      const pct = value !== null ? (value / total) * 100 : null

      student.scores[sub.examId] = {
        submissionId: sub.id,
        score: value,
        status: sub.status.toLowerCase(),
        pct,
      }
    }

    const rows: GradebookRow[] = Array.from(studentMap.entries()).map(([studentId, data]) => {
      const values = Object.values(data.scores)
        .map((s) => s.score)
        .filter((v): v is number => v !== null)
      const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null

      return { studentId, studentName: data.name, scores: data.scores, average }
    })

    return { examIds, examTitles, rows }
  }

  async getStudentHistory(studentId: string) {
    const submissions = await this.prisma.submission.findMany({
      where: { studentId },
      include: { exam: true, score: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return submissions.map((sub) => ({
      examId: sub.examId,
      examTitle: sub.exam.title,
      subject: sub.exam.subject,
      grade: sub.exam.grade,
      status: sub.status,
      score: sub.finalScore ?? sub.score?.value ?? null,
      gradedAt: sub.gradedAt,
      createdAt: sub.createdAt,
    }))
  }

  async exportExcel(teacherId: string): Promise<Buffer> {
    const data = await this.getClassGradebook(teacherId)
    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Bảng điểm')

    // Headers
    const headers = ['Học sinh', ...data.examIds.map((id) => data.examTitles[id] ?? id), 'Trung bình']
    const headerRow = sheet.addRow(headers)
    headerRow.font = { bold: true, size: 12 }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2D9F3' } }

    // Data rows
    for (const row of data.rows) {
      const values = [
        row.studentName,
        ...data.examIds.map((id) => row.scores[id]?.score ?? '—'),
        row.average?.toFixed(1) ?? '—',
      ]
      const dataRow = sheet.addRow(values)

      // Color-code score cells
      data.examIds.forEach((id, i) => {
        const cell = dataRow.getCell(i + 2)
        const pct = row.scores[id]?.pct ?? null
        if (pct !== null) {
          if (pct < 50) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } }
          else if (pct < 70) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
          else cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
        }
      })
    }

    sheet.columns.forEach((col) => { col.width = 18 })

    return workbook.xlsx.writeBuffer() as Promise<Buffer>
  }

  async exportPdf(teacherId: string): Promise<Buffer> {
    const data = await this.getClassGradebook(teacherId)
    const puppeteer = await import('puppeteer')
    const browser = await puppeteer.default.launch({ args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.setContent(this.buildGradebookHtml(data))
    const pdf = await page.pdf({ format: 'A4', landscape: true, printBackground: true })
    await browser.close()
    return Buffer.from(pdf)
  }

  async getExamStats(examId: string) {
    const scores = await this.prisma.score.findMany({
      where: { examId },
      select: { value: true },
    })
    if (scores.length === 0) return { count: 0, mean: null, median: null, min: null, max: null }

    const values = scores.map((s) => s.value).sort((a, b) => a - b)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const mid = Math.floor(values.length / 2)
    const median = values.length % 2 ? values[mid]! : (values[mid - 1]! + values[mid]!) / 2

    return {
      count: values.length,
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      min: values[0],
      max: values[values.length - 1],
      distribution: {
        below50: values.filter((v) => v < 5).length,
        between50_70: values.filter((v) => v >= 5 && v < 7).length,
        above70: values.filter((v) => v >= 7).length,
      },
    }
  }

  private buildGradebookHtml(data: GradebookData): string {
    const headerCells = ['<th>Học sinh</th>', ...data.examIds.map((id) => `<th>${data.examTitles[id] ?? id}</th>`), '<th>TB</th>'].join('')
    const dataRows = data.rows
      .map((row) => {
        const cells = data.examIds
          .map((id) => {
            const cell = row.scores[id]
            const score = cell?.score
            const pct = cell?.pct ?? null
            const bg = pct === null ? '#FFF' : pct < 50 ? '#FEE2E2' : pct < 70 ? '#FEF3C7' : '#D1FAE5'
            return `<td style="background:${bg}">${score ?? '—'}</td>`
          })
          .join('')
        return `<tr><td>${row.studentName}</td>${cells}<td>${row.average?.toFixed(1) ?? '—'}</td></tr>`
      })
      .join('')

    return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #EDE9FE; padding: 6px; text-align: center; border: 1px solid #C4B5FD; }
  td { padding: 5px 8px; border: 1px solid #E5E7EB; text-align: center; }
  tr:nth-child(even) { background: #F9FAFB; }
</style></head><body>
<h2 style="color:#6D28D9">Bảng điểm</h2>
<table><thead><tr>${headerCells}</tr></thead><tbody>${dataRows}</tbody></table>
</body></html>`
  }
}
