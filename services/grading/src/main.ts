import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { AppModule } from './app.module'

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter()
  await fastifyAdapter.getInstance().register(import('@fastify/multipart'), {
    limits: { fileSize: 10 * 1024 * 1024 },
  })

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter)
  app.useWebSocketAdapter(new IoAdapter(app))
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  app.enableCors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*' })

  const config = new DocumentBuilder()
    .setTitle('HappyTeach Grading Service')
    .setDescription('Camera bubble sheet scanning and AI essay grading')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config))

  const port = process.env.PORT ?? 3004
  await app.listen(port, '0.0.0.0')
  console.log(`Grading service running on port ${port}`)
}

bootstrap()
