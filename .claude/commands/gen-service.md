# /gen-service [name] — Generate a NestJS Microservice

Generate a complete, production-ready NestJS microservice for Teacher Assistant AI.

## Usage

```
/gen-service notification
/gen-service billing
/gen-service analytics
```

The argument `$ARGUMENTS` is the service name (e.g. `notification`).

## What to generate

Create `services/$ARGUMENTS/` with full NestJS structure:

```
services/$ARGUMENTS/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── $ARGUMENTS/
│   │   ├── $ARGUMENTS.module.ts
│   │   ├── $ARGUMENTS.controller.ts
│   │   ├── $ARGUMENTS.service.ts
│   │   ├── $ARGUMENTS.repository.ts
│   │   ├── dto/
│   │   │   ├── create-$ARGUMENTS.dto.ts
│   │   │   └── update-$ARGUMENTS.dto.ts
│   │   └── entities/
│   │       └── $ARGUMENTS.entity.ts
│   ├── common/
│   │   ├── filters/http-exception.filter.ts
│   │   ├── interceptors/logging.interceptor.ts
│   │   └── guards/jwt-auth.guard.ts
│   └── prisma/
│       └── prisma.service.ts
├── prisma/
│   └── schema.prisma
├── test/
│   └── $ARGUMENTS.e2e-spec.ts
├── package.json
├── tsconfig.json
├── Dockerfile
└── .env.example
```

## Code requirements

### main.ts

- ValidationPipe globally (whitelist: true, transform: true)
- Helmet for security headers
- CORS configured from env
- Swagger docs at /api/docs (dev only)
- Graceful shutdown on SIGTERM
- Port from env PORT

### Service pattern

Always implement:
- Repository pattern (separate data access from business logic)
- DTOs with class-validator decorators
- Proper HTTP exception handling
- Pagination using `{ data: T[], total: number, page: number, limit: number }`
- Soft delete (deletedAt nullable DateTime)

### package.json dependencies

Always include:
```json
{
  "@nestjs/common": "^10",
  "@nestjs/core": "^10",
  "@nestjs/platform-fastify": "^10",
  "@nestjs/swagger": "^7",
  "@nestjs/jwt": "^10",
  "@prisma/client": "^5",
  "class-validator": "^0.14",
  "class-transformer": "^0.5",
  "helmet": "^7",
  "ioredis": "^5"
}
```

### Dockerfile

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main"]
```

## After generating

Print a summary of endpoints created and next steps.
