import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'crypto'
import type { ExamAIProvider, GenerateExamInput } from './ai-provider.interface'
import type { ExamQuestion } from '@happyteach/types'

@Injectable()
export class OpenAIExamProvider implements ExamAIProvider {
  readonly name = 'openai'
  private readonly logger = new Logger(OpenAIExamProvider.name)
  private apiKey: string

  constructor(private config: ConfigService) {
    this.apiKey = config.get('OPENAI_API_KEY') ?? ''
  }

  async generateExam(input: GenerateExamInput): Promise<ExamQuestion[]> {
    if (!this.apiKey) throw new Error('OpenAI API key not configured')
    const start = Date.now()
    const totalQuestions = Object.values(input.questions).reduce((a, b) => a + b, 0)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 8192,
        messages: [
          {
            role: 'system',
            content: 'Bạn là chuyên gia ra đề thi. Trả về JSON array câu hỏi, không có markdown.',
          },
          {
            role: 'user',
            content: `Tạo ${totalQuestions} câu hỏi kiểm tra môn ${input.subject} lớp ${input.grade}, chương ${input.chapter}. Trả về JSON array với các trường: type, gradingMode, order, content, points, options, correctAnswer, sampleAnswer, rubric, maxWords.`,
          },
        ],
      }),
    })

    this.logger.log(`OpenAI exam generation: ${Date.now() - start}ms`)
    const data = (await response.json()) as { choices: { message: { content: string } }[] }
    const text = data.choices[0]?.message?.content ?? '[]'
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('Invalid OpenAI response')
    const raw = JSON.parse(jsonMatch[0]) as Omit<ExamQuestion, 'id'>[]
    return raw.map((q) => ({ ...q, id: randomUUID() }))
  }
}
