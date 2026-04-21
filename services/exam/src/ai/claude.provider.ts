import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'crypto'
import Anthropic from '@anthropic-ai/sdk'
import type { ExamAIProvider, GenerateExamInput } from './ai-provider.interface'
import type { ExamQuestion } from '@happyteach/types'

const SYSTEM_PROMPT = `Bạn là chuyên gia ra đề thi cho giáo viên Việt Nam theo chương trình GDPT 2018.
Luôn trả về JSON hợp lệ theo đúng cấu trúc được yêu cầu. Nội dung bằng tiếng Việt.
Câu hỏi phải chính xác, rõ ràng, phù hợp lứa tuổi và mức độ khó yêu cầu.`

@Injectable()
export class ClaudeExamProvider implements ExamAIProvider {
  readonly name = 'claude'
  private client: Anthropic
  private readonly logger = new Logger(ClaudeExamProvider.name)

  constructor(private config: ConfigService) {
    this.client = new Anthropic({ apiKey: config.getOrThrow('ANTHROPIC_API_KEY') })
  }

  async generateExam(input: GenerateExamInput): Promise<ExamQuestion[]> {
    const start = Date.now()
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: this.buildPrompt(input) }],
    })

    this.logger.log(`Claude exam generation: ${Date.now() - start}ms`)
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return this.parseQuestions(text)
  }

  private buildPrompt(input: GenerateExamInput): string {
    const { subject, grade, chapter, duration, difficulty, questions, instructions, rubricTemplate } = input
    const difficultyLabel = ['', 'Rất dễ', 'Dễ', 'Trung bình', 'Khó', 'Rất khó'][difficulty]

    const questionSpec = [
      questions.mcqCount > 0 && `${questions.mcqCount} câu trắc nghiệm 4 lựa chọn (A/B/C/D)`,
      questions.tfCount > 0 && `${questions.tfCount} câu đúng/sai`,
      questions.shortCount > 0 && `${questions.shortCount} câu trả lời ngắn (không có đáp án cố định, AI chấm)`,
      questions.openCount > 0 && `${questions.openCount} câu hỏi mở (không có đáp án cố định, AI chấm)`,
      questions.essayCount > 0 && `${questions.essayCount} câu tự luận với thang điểm rubric`,
    ].filter(Boolean).join(', ')

    const rubricNote = rubricTemplate
      ? `Sử dụng mẫu rubric này cho câu tự luận: ${rubricTemplate}`
      : `Tạo rubric phù hợp cho câu tự luận gồm: Nội dung (50%), Lập luận (30%), Ngôn ngữ (20%)`

    return `Tạo đề kiểm tra:
- Môn: ${subject}, Lớp ${grade}
- Chương/Bài: ${chapter}
- Thời gian: ${duration} phút
- Độ khó: ${difficultyLabel}
- Cơ cấu: ${questionSpec}
${instructions ? `- Yêu cầu đặc biệt: ${instructions}` : ''}
${rubricNote}

Phân bổ điểm: tổng 10 điểm, chia đều theo số câu và loại.

Trả về JSON array (không có markdown, chỉ JSON thuần):
[
  {
    "type": "mcq",
    "gradingMode": "keyed",
    "order": 1,
    "content": "nội dung câu hỏi",
    "points": 1,
    "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    "correctAnswer": "A",
    "sampleAnswer": null
  },
  {
    "type": "true_false",
    "gradingMode": "keyed",
    "order": 2,
    "content": "Phát biểu...",
    "points": 0.5,
    "options": ["Đúng", "Sai"],
    "correctAnswer": "Đúng",
    "sampleAnswer": null
  },
  {
    "type": "short",
    "gradingMode": "ai",
    "order": 3,
    "content": "câu hỏi ngắn...",
    "points": 1,
    "options": null,
    "correctAnswer": null,
    "sampleAnswer": "đáp án mẫu chi tiết"
  },
  {
    "type": "essay",
    "gradingMode": "essay",
    "order": 4,
    "content": "đề tự luận...",
    "points": 3,
    "options": null,
    "correctAnswer": null,
    "maxWords": 300,
    "sampleAnswer": "bài viết mẫu chi tiết",
    "rubric": [
      { "name": "Nội dung", "weight": 50, "description": "Đủ ý, chính xác..." },
      { "name": "Lập luận", "weight": 30, "description": "Logic, mạch lạc..." },
      { "name": "Ngôn ngữ", "weight": 20, "description": "Dùng từ đúng, đa dạng..." }
    ]
  }
]`
  }

  private parseQuestions(text: string): ExamQuestion[] {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('Invalid AI response: no JSON array found')
    const raw = JSON.parse(jsonMatch[0]) as Omit<ExamQuestion, 'id'>[]
    return raw.map((q) => ({ ...q, id: randomUUID() }))
  }
}
