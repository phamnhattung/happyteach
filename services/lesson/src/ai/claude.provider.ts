import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider } from './ai-provider.interface'
import type { LessonPlan, GenerateLessonInput } from '@happyteach/types'

const SYSTEM_PROMPT = `Bạn là chuyên gia thiết kế giáo án cho giáo viên Việt Nam theo chương trình GDPT 2018.
Luôn trả về JSON hợp lệ theo đúng cấu trúc được yêu cầu. Nội dung bằng tiếng Việt.
Giáo án phải thực tế, phù hợp lứa tuổi, và có thể triển khai được trong lớp học.`

@Injectable()
export class ClaudeProvider implements AIProvider {
  readonly name = 'claude'
  private client: Anthropic
  private readonly logger = new Logger(ClaudeProvider.name)

  constructor(private config: ConfigService) {
    this.client = new Anthropic({ apiKey: config.getOrThrow('ANTHROPIC_API_KEY') })
  }

  async *generateLessonStream(input: GenerateLessonInput, style?: string): AsyncIterable<string> {
    const stream = this.client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: this.buildPrompt(input, style) }],
    })

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text
      }
    }
  }

  async generateLessonFull(input: GenerateLessonInput, style?: string): Promise<LessonPlan> {
    const start = Date.now()
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: this.buildPrompt(input, style) }],
    })

    this.logger.log(`Claude lesson generation: ${Date.now() - start}ms`)
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return this.parseLesson(text)
  }

  private buildPrompt(input: GenerateLessonInput, style?: string): string {
    const phaseTime = input.duration === 45
      ? 'Khởi động: 5 phút, Hình thành kiến thức: 20 phút, Luyện tập: 15 phút, Vận dụng: 5 phút'
      : 'Khởi động: 10 phút, Hình thành kiến thức: 35 phút, Luyện tập: 30 phút, Vận dụng: 15 phút'

    return `Thiết kế giáo án chi tiết:
- Môn: ${input.subject}, Lớp ${input.grade}
- Bài/Chương: ${input.chapter}
- Thời lượng: ${input.duration} phút (${phaseTime})
${style ? `- Phong cách giảng dạy của giáo viên: ${style}` : ''}

Trả về JSON theo cấu trúc sau (không có markdown, chỉ JSON thuần):
{
  "title": "tên bài học cụ thể",
  "objectives": ["mục tiêu 1", "mục tiêu 2", "mục tiêu 3"],
  "teachingFlow": [
    {
      "phase": "Khởi động",
      "duration": số_phút,
      "activities": ["hoạt động 1"],
      "teacherActions": ["việc giáo viên làm"],
      "studentActions": ["việc học sinh làm"]
    }
  ],
  "materials": ["dụng cụ 1", "dụng cụ 2"],
  "homework": "nội dung bài tập về nhà",
  "notes": "lưu ý sư phạm",
  "estimatedDifficulty": 3
}`
  }

  private parseLesson(text: string): LessonPlan {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid AI response: no JSON found')
    return JSON.parse(jsonMatch[0]) as LessonPlan
  }
}
