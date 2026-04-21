import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import type { RubricCriterion } from '@happyteach/types'

export interface ExtractedAnswer {
  questionId: string
  extractedText: string
}

export interface OpenAnswerGradingResult {
  score: number
  reasoning: string
}

export interface EssayGradingResult {
  criteria: { name: string; score: number; maxScore: number; comment: string }[]
  total: number
  feedback: string
}

const GRADING_SYSTEM = `Bạn là giáo viên chấm bài chuyên nghiệp. Chấm điểm chính xác, công bằng, giải thích rõ ràng bằng tiếng Việt. Luôn trả về JSON hợp lệ.`

@Injectable()
export class GradingAIService {
  private client: Anthropic
  private readonly logger = new Logger(GradingAIService.name)

  constructor(private config: ConfigService) {
    this.client = new Anthropic({ apiKey: config.getOrThrow('ANTHROPIC_API_KEY') })
  }

  async extractAnswers(
    imageBuffers: Buffer[],
    questions: { id: string; order: number; content: string; gradingMode: string }[],
  ): Promise<ExtractedAnswer[]> {
    const start = Date.now()

    const imageContent: Anthropic.ImageBlockParam[] = imageBuffers.map((buf) => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: buf.toString('base64'),
      },
    }))

    const questionList = questions
      .map((q) => `Câu ${q.order} (ID: ${q.id}): ${q.content.slice(0, 100)}`)
      .join('\n')

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: [{ type: 'text', text: GRADING_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: [
            ...imageContent,
            {
              type: 'text',
              text: `Đây là bài làm của học sinh. Hãy đọc và trích xuất nội dung trả lời cho từng câu hỏi sau:\n\n${questionList}\n\nTrả về JSON array:\n[{"questionId": "id_câu", "extractedText": "nội dung học sinh viết"}]`,
            },
          ],
        },
      ],
    })

    this.logger.log(`OCR extraction: ${Date.now() - start}ms`)
    const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return questions.map((q) => ({ questionId: q.id, extractedText: '' }))
    return JSON.parse(jsonMatch[0]) as ExtractedAnswer[]
  }

  async gradeOpenAnswer(input: {
    question: string
    answer: string
    maxPoints: number
  }): Promise<OpenAnswerGradingResult> {
    const { question, answer, maxPoints } = input
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: [{ type: 'text', text: GRADING_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: `Bạn là giáo viên chấm bài. Câu hỏi: "${question}"\nHọc sinh trả lời: "${answer}"\nĐiểm tối đa: ${maxPoints}\n\nChấm điểm nghiêm túc và công bằng. Trả về JSON:\n{ "score": number, "reasoning": "lý do cụ thể bằng tiếng Việt" }`,
        },
      ],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { score: 0, reasoning: 'Không thể chấm bài tự động' }
    return JSON.parse(jsonMatch[0]) as OpenAnswerGradingResult
  }

  async gradeEssay(input: {
    question: string
    answer: string
    rubric: RubricCriterion[]
    maxPoints: number
  }): Promise<EssayGradingResult> {
    const { question, answer, rubric, maxPoints } = input
    const rubricText = rubric.map((c) => `- ${c.name} (${c.weight}%): ${c.description}`).join('\n')

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [{ type: 'text', text: GRADING_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: `Bạn là giáo viên chấm bài tự luận. Câu hỏi: "${question}"\nHọc sinh trả lời: "${answer}"\nĐiểm tối đa: ${maxPoints}\n\nThang điểm:\n${rubricText}\n\nTrả về JSON:\n{\n  "criteria": [{ "name": string, "score": number, "maxScore": number, "comment": string }],\n  "total": number,\n  "feedback": "nhận xét tổng thể bằng tiếng Việt"\n}`,
        },
      ],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { criteria: [], total: 0, feedback: 'Không thể chấm bài tự động' }
    return JSON.parse(jsonMatch[0]) as EssayGradingResult
  }
}
