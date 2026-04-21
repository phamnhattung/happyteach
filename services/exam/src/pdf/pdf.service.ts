import { Injectable } from '@nestjs/common'
import { createId } from '@paralleldrive/cuid2'
import type { ExamQuestion, ExamVersion } from '@happyteach/types'

interface ExamMeta {
  id: string
  title: string
  subject: string
  grade: string
  duration: number
  teacherName: string
  schoolName?: string
}

@Injectable()
export class PdfService {
  async generateStudentExamPdf(meta: ExamMeta, questions: ExamQuestion[], version?: ExamVersion): Promise<Buffer> {
    const orderedQuestions = version
      ? version.questionOrder.map((qId) => questions.find((q) => q.id === qId)!).filter(Boolean)
      : questions

    const puppeteer = await import('puppeteer')
    const browser = await puppeteer.default.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    await page.setContent(this.buildStudentHtml(meta, orderedQuestions, version))
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '15mm' } })
    await browser.close()
    return Buffer.from(pdf)
  }

  async generateBubbleSheetPdf(meta: ExamMeta, questions: ExamQuestion[], version: ExamVersion): Promise<Buffer> {
    const keyedQuestions = version.questionOrder
      .map((qId) => questions.find((q) => q.id === qId)!)
      .filter((q) => q?.gradingMode === 'keyed')

    if (keyedQuestions.length === 0) throw new Error('No keyed questions for bubble sheet')

    const qrData = JSON.stringify({ examId: meta.id, version: version.version, keyedCount: keyedQuestions.length })
    const puppeteer = await import('puppeteer')
    const browser = await puppeteer.default.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    await page.setContent(this.buildBubbleSheetHtml(meta, keyedQuestions, version.version, qrData))
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' } })
    await browser.close()
    return Buffer.from(pdf)
  }

  async generateAnswerKeyPdf(meta: ExamMeta, questions: ExamQuestion[], version?: ExamVersion): Promise<Buffer> {
    const orderedQuestions = version
      ? version.questionOrder.map((qId) => questions.find((q) => q.id === qId)!).filter(Boolean)
      : questions

    const puppeteer = await import('puppeteer')
    const browser = await puppeteer.default.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    await page.setContent(this.buildAnswerKeyHtml(meta, orderedQuestions))
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '15mm' } })
    await browser.close()
    return Buffer.from(pdf)
  }

  private buildStudentHtml(meta: ExamMeta, questions: ExamQuestion[], version?: ExamVersion): string {
    const versionLabel = version ? ` — Đề ${version.version}` : ''
    let questionOrder = 0

    const questionsHtml = questions.map((q) => {
      questionOrder++
      if (q.gradingMode === 'keyed') {
        const optionsHtml = (q.options ?? []).map((opt, i) => {
          const label = q.type === 'true_false' ? opt : `${String.fromCharCode(65 + i)}. ${opt}`
          return `<div class="option"><span class="bubble">○</span> ${label}</div>`
        }).join('')
        return `<div class="question"><div class="q-header"><span class="q-num">Câu ${questionOrder}.</span> <span class="q-points">(${q.points} điểm)</span></div><div class="q-content">${q.content}</div><div class="options">${optionsHtml}</div></div>`
      }
      const lines = q.type === 'essay' && q.maxWords ? Math.ceil(q.maxWords / 12) : 6
      const blankLines = Array(lines).fill('<div class="blank-line"></div>').join('')
      return `<div class="question"><div class="q-header"><span class="q-num">Câu ${questionOrder}.</span> <span class="q-points">(${q.points} điểm)</span></div><div class="q-content">${q.content}</div><div class="answer-area">${blankLines}</div></div>`
    }).join('')

    return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700&display=swap');
  body { font-family: 'Be Vietnam Pro', Arial, sans-serif; padding: 0; margin: 0; color: #1c1917; font-size: 13px; }
  .header { text-align: center; border-bottom: 2px solid #1c1917; padding-bottom: 10px; margin-bottom: 16px; }
  .school { font-size: 11px; color: #57534e; }
  .exam-title { font-size: 18px; font-weight: 700; text-transform: uppercase; margin: 6px 0; }
  .meta { font-size: 11px; display: flex; justify-content: center; gap: 24px; color: #44403c; }
  .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; font-size: 12px; }
  .info-field { border-bottom: 1px solid #1c1917; padding-bottom: 2px; }
  .info-label { color: #78716c; }
  .question { margin-bottom: 16px; page-break-inside: avoid; }
  .q-header { margin-bottom: 6px; }
  .q-num { font-weight: 700; }
  .q-points { font-size: 11px; color: #78716c; }
  .q-content { margin-bottom: 8px; line-height: 1.6; }
  .options { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding-left: 8px; }
  .option { display: flex; align-items: center; gap: 6px; }
  .bubble { font-size: 16px; }
  .answer-area { margin-top: 4px; }
  .blank-line { border-bottom: 1px solid #d6d3d1; height: 20px; margin-bottom: 4px; }
  .footer { position: fixed; bottom: 10mm; left: 0; right: 0; text-align: center; font-size: 10px; color: #a8a29e; }
  .section-title { font-weight: 700; font-size: 13px; background: #f5f5f4; padding: 4px 8px; margin: 12px 0 8px 0; }
</style></head><body>
<div class="header">
  <div class="school">${meta.schoolName ?? 'TRƯỜNG THPT'}</div>
  <div class="exam-title">ĐỀ KIỂM TRA${versionLabel}</div>
  <div class="meta">
    <span>Môn: ${meta.subject} — Lớp ${meta.grade}</span>
    <span>Thời gian: ${meta.duration} phút</span>
    <span>Ngày: ......../......../........</span>
  </div>
</div>
<div class="student-info">
  <div class="info-field"><span class="info-label">Họ và tên: </span>.................................................................</div>
  <div class="info-field"><span class="info-label">Lớp: </span>..............</div>
  <div class="info-field"><span class="info-label">Số báo danh: </span>................</div>
  <div class="info-field"><span class="info-label">Điểm: </span>................</div>
</div>
${questionsHtml}
<div class="footer">Trang <span class="pageNumber"></span> / <span class="totalPages"></span></div>
</body></html>`
  }

  private buildBubbleSheetHtml(
    meta: ExamMeta,
    keyedQuestions: ExamQuestion[],
    version: 'A' | 'B' | 'C',
    qrData: string,
  ): string {
    const qrSvg = this.generateQrPlaceholder(qrData)
    const rowsHtml = keyedQuestions.map((q, i) => {
      const cols = q.type === 'true_false'
        ? ['Đ', 'S'].map((label, j) => `<td><label><input type="radio" disabled> ${label}</label></td>`).join('')
        : ['A', 'B', 'C', 'D'].map((label) => `<td><label><input type="radio" disabled> ${label}</label></td>`).join('')
      return `<tr><td class="q-label">Câu ${i + 1}</td>${cols}</tr>`
    }).join('')

    return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; padding: 0; margin: 0; font-size: 12px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 2px solid #000; margin-bottom: 12px; }
  .header-left h2 { font-size: 16px; font-weight: 700; margin: 0 0 4px 0; }
  .header-left p { margin: 2px 0; font-size: 11px; }
  .qr-box { width: 80px; height: 80px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 8px; }
  .version-badge { font-size: 28px; font-weight: 900; letter-spacing: -1px; color: #d97706; margin-left: 8px; }
  .student-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px; }
  .field { border-bottom: 1px solid #000; padding-bottom: 2px; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f5f5f4; font-size: 11px; padding: 4px; text-align: center; border: 1px solid #d6d3d1; }
  td { padding: 4px; text-align: center; border: 1px solid #d6d3d1; font-size: 12px; }
  .q-label { text-align: left; font-weight: 600; width: 50px; }
  label { display: flex; align-items: center; justify-content: center; gap: 4px; cursor: default; }
  .note { font-size: 10px; color: #78716c; margin-top: 8px; text-align: center; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
</style></head><body>
<div class="header">
  <div class="header-left">
    <h2>PHIẾU TRẢ LỜI TRẮC NGHIỆM <span class="version-badge">Đề ${version}</span></h2>
    <p>Môn: ${meta.subject} — Lớp ${meta.grade} — ${meta.duration} phút</p>
    <p>${meta.schoolName ?? 'TRƯỜNG THPT'}</p>
  </div>
  <div style="text-align:center">
    <div class="qr-box">QR</div>
    <div style="font-size:9px;margin-top:2px">Mã QR đề thi</div>
  </div>
</div>
<div class="student-row">
  <div class="field">Họ tên: .......................................</div>
  <div class="field">Lớp: .............</div>
  <div class="field">Số báo danh: .............</div>
</div>
<div class="two-col">
  <div>
    <table>
      <tr><th>Câu</th><th>A</th><th>B</th><th>C</th><th>D</th></tr>
      ${keyedQuestions.slice(0, Math.ceil(keyedQuestions.length / 2)).map((q, i) => {
        const isStf = q.type === 'true_false'
        return `<tr><td class="q-label">Câu ${i + 1}</td>${isStf ? '<td>○ Đ</td><td>○ S</td><td></td><td></td>' : '<td>○ A</td><td>○ B</td><td>○ C</td><td>○ D</td>'}</tr>`
      }).join('')}
    </table>
  </div>
  <div>
    <table>
      <tr><th>Câu</th><th>A</th><th>B</th><th>C</th><th>D</th></tr>
      ${keyedQuestions.slice(Math.ceil(keyedQuestions.length / 2)).map((q, i) => {
        const idx = Math.ceil(keyedQuestions.length / 2) + i + 1
        const isStf = q.type === 'true_false'
        return `<tr><td class="q-label">Câu ${idx}</td>${isStf ? '<td>○ Đ</td><td>○ S</td><td></td><td></td>' : '<td>○ A</td><td>○ B</td><td>○ C</td><td>○ D</td>'}</tr>`
      }).join('')}
    </table>
  </div>
</div>
<div class="note">⚠ Dùng bút chì tô kín ô trả lời. Mỗi câu chỉ chọn một đáp án.</div>
</body></html>`
  }

  private buildAnswerKeyHtml(meta: ExamMeta, questions: ExamQuestion[]): string {
    const answersHtml = questions.map((q, i) => {
      if (q.gradingMode === 'keyed') {
        return `<div class="answer-row keyed"><span class="q-num">Câu ${i + 1}:</span> <span class="correct-answer">${q.correctAnswer}</span> <span class="points">(${q.points}đ)</span></div>`
      }
      const rubricHtml = q.rubric ? `<div class="rubric">${q.rubric.map((r) => `<div class="criterion"><strong>${r.name} (${r.weight}%):</strong> ${r.description}</div>`).join('')}</div>` : ''
      const sampleHtml = q.sampleAnswer ? `<div class="sample"><strong>Đáp án mẫu:</strong> ${q.sampleAnswer}</div>` : ''
      const typeLabel = q.gradingMode === 'essay' ? 'Tự luận (rubric)' : 'AI chấm'
      return `<div class="answer-row ai"><span class="q-num">Câu ${i + 1}:</span> <span class="ai-badge">${typeLabel}</span> <span class="points">(${q.points}đ)</span>${sampleHtml}${rubricHtml}</div>`
    }).join('')

    return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; padding: 0; margin: 0; font-size: 12px; position: relative; }
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-45deg); font-size: 48px; font-weight: 900; color: rgba(220,38,38,0.08); white-space: nowrap; pointer-events: none; z-index: 0; }
  .content { position: relative; z-index: 1; }
  .header { border-bottom: 3px solid #dc2626; padding-bottom: 12px; margin-bottom: 16px; }
  .header h2 { font-size: 18px; color: #dc2626; margin: 0 0 4px 0; }
  .confidential-banner { background: #dc2626; color: white; text-align: center; padding: 4px; font-weight: 700; font-size: 11px; margin-bottom: 16px; }
  .answer-row { padding: 8px; border-radius: 4px; margin-bottom: 6px; }
  .keyed { background: #f0fdf4; border-left: 3px solid #16a34a; }
  .ai { background: #fefce8; border-left: 3px solid #ca8a04; }
  .q-num { font-weight: 700; }
  .correct-answer { font-size: 16px; font-weight: 900; color: #16a34a; margin-left: 8px; }
  .points { color: #78716c; font-size: 11px; margin-left: 4px; }
  .ai-badge { background: #ca8a04; color: white; padding: 1px 6px; border-radius: 10px; font-size: 10px; margin-left: 4px; }
  .sample { margin-top: 6px; font-size: 11px; color: #44403c; }
  .rubric { margin-top: 6px; padding-left: 8px; }
  .criterion { font-size: 11px; color: #44403c; margin-bottom: 2px; }
</style></head><body>
<div class="watermark">DÀNH CHO GIÁO VIÊN — BẢO MẬT</div>
<div class="content">
  <div class="confidential-banner">🔒 TÀI LIỆU MẬT — CHỈ DÀNH CHO GIÁO VIÊN — KHÔNG PHÂN PHÁT</div>
  <div class="header">
    <h2>ĐÁP ÁN VÀ THANG ĐIỂM</h2>
    <div>Môn: ${meta.subject} — Lớp ${meta.grade} — ${meta.duration} phút</div>
    <div>${meta.title}</div>
    <div>GV: ${meta.teacherName}</div>
  </div>
  ${answersHtml}
</div>
</body></html>`
  }

  private generateQrPlaceholder(data: string): string {
    return `<text>${data.slice(0, 20)}...</text>`
  }
}
