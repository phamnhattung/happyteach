import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import OpenAI from 'openai'
import type { AIProvider } from './ai-provider.interface'
import type { LessonPlan, GenerateLessonInput } from '@happyteach/types'

@Injectable()
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai'
  private client: OpenAI
  private readonly logger = new Logger(OpenAIProvider.name)

  constructor(private config: ConfigService) {
    this.client = new OpenAI({ apiKey: config.getOrThrow('OPENAI_API_KEY') })
  }

  async *generateLessonStream(input: GenerateLessonInput, style?: string): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages: [
        { role: 'system', content: 'Bạn là chuyên gia thiết kế giáo án Việt Nam. Trả về JSON thuần.' },
        { role: 'user', content: this.buildPrompt(input, style) },
      ],
    })
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? ''
      if (delta) yield delta
    }
  }

  async generateLessonFull(input: GenerateLessonInput, style?: string): Promise<LessonPlan> {
    const start = Date.now()
    const res = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Bạn là chuyên gia thiết kế giáo án Việt Nam. Trả về JSON thuần.' },
        { role: 'user', content: this.buildPrompt(input, style) },
      ],
    })
    this.logger.log(`OpenAI lesson generation: ${Date.now() - start}ms`)
    const text = res.choices[0]?.message?.content ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Invalid OpenAI response')
    return JSON.parse(match[0]) as LessonPlan
  }

  private buildPrompt(input: GenerateLessonInput, style?: string): string {
    return `Thiết kế giáo án: Môn ${input.subject}, Lớp ${input.grade}, Bài: ${input.chapter}, Thời lượng: ${input.duration} phút${style ? `, phong cách: ${style}` : ''}. Trả về JSON theo cấu trúc LessonPlan chuẩn.`
  }
}
