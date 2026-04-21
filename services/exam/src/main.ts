import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter())
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  app.enableCors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*' })
  const config = new DocumentBuilder()
    .setTitle('HappyTeach Exam Service')
    .setDescription('AI exam generation with multi-version PDF export')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config))
  const port = process.env.PORT ?? 3003
  await app.listen(port, '0.0.0.0')
  console.log(`Exam service running on port ${port}`)
}

bootstrap()
