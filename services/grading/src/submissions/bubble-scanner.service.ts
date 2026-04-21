import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import type { KeyedQuestionResult } from '@happyteach/types'

export interface QRDecodeResult {
  examId: string
  version: 'A' | 'B' | 'C'
  keyedCount: number
}

interface BubbleCell {
  label: string
  fillRatio: number
}

interface BubbleRow {
  bubbles: BubbleCell[]
}

@Injectable()
export class BubbleScannerService {
  private readonly logger = new Logger(BubbleScannerService.name)
  private claude: Anthropic

  constructor(private config: ConfigService) {
    this.claude = new Anthropic({ apiKey: config.getOrThrow('ANTHROPIC_API_KEY') })
  }

  async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    const sharp = (await import('sharp')).default
    return sharp(imageBuffer)
      .resize({ width: 2000, withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen()
      .toBuffer()
  }

  async decodeQR(imageBuffer: Buffer): Promise<QRDecodeResult | null> {
    try {
      const sharp = (await import('sharp')).default
      const { data, info } = await sharp(imageBuffer)
        .resize({ width: 1024 })
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true })

      const jsQR = (await import('jsqr')).default
      const code = jsQR(new Uint8ClampedArray(data), info.width, info.height)
      if (!code?.data) return null

      const parsed = JSON.parse(code.data) as QRDecodeResult
      return parsed
    } catch {
      return null
    }
  }

  async decodeQRViaAI(imageBuffer: Buffer): Promise<QRDecodeResult | null> {
    try {
      const base64 = imageBuffer.toString('base64')
      const response = await this.claude.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
              {
                type: 'text',
                text: 'Đọc mã QR trong ảnh này. Trả về nội dung JSON của QR code. Nếu không đọc được, trả về null.',
              },
            ],
          },
        ],
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return null
      return JSON.parse(jsonMatch[0]) as QRDecodeResult
    } catch {
      return null
    }
  }

  async detectBubbles(
    imageBuffer: Buffer,
    keyedCount: number,
    questionTypes: string[],
  ): Promise<KeyedQuestionResult[]> {
    try {
      return await this.detectBubblesPixel(imageBuffer, keyedCount, questionTypes)
    } catch (err) {
      this.logger.warn(`Pixel detection failed, using AI fallback: ${(err as Error).message}`)
      return this.detectBubblesAI(imageBuffer, keyedCount, questionTypes)
    }
  }

  private async detectBubblesPixel(
    imageBuffer: Buffer,
    keyedCount: number,
    questionTypes: string[],
  ): Promise<KeyedQuestionResult[]> {
    const sharp = (await import('sharp')).default

    const { data, info } = await sharp(imageBuffer)
      .resize({ width: 800 })
      .grayscale()
      .threshold(128)
      .raw()
      .toBuffer({ resolveWithObject: true })

    const { width, height } = info
    const pixels = new Uint8Array(data)

    const getPixel = (x: number, y: number): number =>
      pixels[Math.min(Math.max(y, 0), height - 1) * width + Math.min(Math.max(x, 0), width - 1)] ?? 255

    const measureFillRatio = (x: number, y: number, r: number): number => {
      let dark = 0
      let total = 0
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy <= r * r) {
            total++
            if (getPixel(x + dx, y + dy) < 128) dark++
          }
        }
      }
      return total > 0 ? dark / total : 0
    }

    // Bubble grid estimation based on fixed layout from PDF generator
    // The bubble sheet has a 2-column layout, each column has N/2 rows
    // Columns are at roughly x=[15%, 65%] of image width
    // Rows start at ~25% of height, spaced evenly

    const half = Math.ceil(keyedCount / 2)
    const results: KeyedQuestionResult[] = []

    // Grid regions for 2-column bubble layout
    const cols = [
      { startX: Math.floor(width * 0.1), labels: ['A', 'B', 'C', 'D'] },
      { startX: Math.floor(width * 0.55), labels: ['A', 'B', 'C', 'D'] },
    ]

    const rowHeight = Math.floor((height * 0.65) / Math.max(half, 1))
    const bubbleR = Math.max(8, Math.floor(rowHeight * 0.25))
    const colSpacing = Math.floor(width * 0.08)

    for (let colIdx = 0; colIdx < 2; colIdx++) {
      const questionsInCol = colIdx === 0 ? half : keyedCount - half
      const col = cols[colIdx]!
      const startY = Math.floor(height * 0.27)

      for (let rowIdx = 0; rowIdx < questionsInCol; rowIdx++) {
        const globalIdx = colIdx * half + rowIdx
        if (globalIdx >= keyedCount) break

        const cy = startY + rowIdx * rowHeight
        const qType = questionTypes[globalIdx] ?? 'mcq'
        const labels = qType === 'true_false' ? ['Đ', 'S'] : ['A', 'B', 'C', 'D']

        const bubbles: BubbleCell[] = labels.map((label, bi) => ({
          label,
          fillRatio: measureFillRatio(col.startX + bi * colSpacing + colSpacing, cy, bubbleR),
        }))

        results.push({
          questionId: `q${globalIdx}`,
          detected: bubbles.reduce((best, b) => (b.fillRatio > best.fillRatio ? b : best)).label,
          correct: '',
          isCorrect: false,
          points: 0,
          confidence: Math.max(...bubbles.map((b) => b.fillRatio)),
        })
      }
    }

    return results
  }

  private async detectBubblesAI(
    imageBuffer: Buffer,
    keyedCount: number,
    questionTypes: string[],
  ): Promise<KeyedQuestionResult[]> {
    const base64 = imageBuffer.toString('base64')
    const labels = questionTypes.slice(0, keyedCount).map((t, i) =>
      t === 'true_false' ? `Câu ${i + 1}: Đ hoặc S` : `Câu ${i + 1}: A, B, C, hoặc D`,
    )

    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            {
              type: 'text',
              text: `Đây là phiếu trả lời trắc nghiệm của học sinh. Đọc đáp án học sinh đã tô cho ${keyedCount} câu hỏi:\n${labels.join('\n')}\n\nTrả về JSON array:\n[{"questionIndex": 0, "detected": "A", "confidence": 0.9}]`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const raw = JSON.parse(jsonMatch[0]) as { questionIndex: number; detected: string; confidence: number }[]
    return raw.map((r) => ({
      questionId: `q${r.questionIndex}`,
      detected: r.detected ?? null,
      correct: '',
      isCorrect: false,
      points: 0,
      confidence: r.confidence ?? 0.5,
    }))
  }
}
