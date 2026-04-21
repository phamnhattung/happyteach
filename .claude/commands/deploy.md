# /deploy — Generate Production Deployment Configuration

You are a senior DevOps engineer. Generate complete production deployment configuration for Teacher Assistant AI targeting AWS/GCP with Kubernetes.

## What to generate

### Docker

Update/verify `docker-compose.yml` covers:
- postgres:16 with health check + volume
- redis:7-alpine with persistence
- All NestJS services with correct env + depends_on
- Adminer (dev only)
- Proper network isolation

### Kubernetes (k8s/)

Generate:

```
k8s/
├── namespace.yaml
├── configmap.yaml          — non-secret env vars
├── secrets.yaml            — template only (never real values)
├── services/
│   ├── auth-deployment.yaml
│   ├── lesson-deployment.yaml
│   ├── exam-deployment.yaml
│   ├── grading-deployment.yaml
│   └── [each service].yaml
├── ingress.yaml            — nginx ingress with TLS + rate limit
├── hpa.yaml                — HorizontalPodAutoscaler (CPU 70%)
├── postgres.yaml           — StatefulSet + PVC
└── redis.yaml              — StatefulSet + PVC
```

### Each service deployment must have

```yaml
replicas: 2
resources:
  requests: { cpu: 100m, memory: 128Mi }
  limits: { cpu: 500m, memory: 512Mi }
livenessProbe: GET /health
readinessProbe: GET /ready
strategy: RollingUpdate (maxSurge: 1, maxUnavailable: 0)
```

### GitHub Actions (.github/workflows/)

**ci.yml** — on push/PR to any branch:
1. pnpm install (cached)
2. lint all packages
3. type-check all packages
4. unit tests with coverage
5. Build all Docker images (don't push)

**deploy-staging.yml** — on push to `develop`:
1. Build + push Docker images to registry
2. `kubectl apply` to staging namespace
3. Run smoke tests
4. Notify Slack

**deploy-prod.yml** — on push to `main` (requires manual approval):
1. Build + push Docker images (tag with git SHA + `latest`)
2. `kubectl apply` to production namespace
3. Verify rollout status
4. Notify Slack

### Environment variables

Generate `.env.example` at repo root covering all services:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/teachassist

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# AI Providers
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
AI_PRIMARY_PROVIDER=claude

# Storage
AWS_BUCKET=
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### Health check endpoints

Every NestJS service must expose:
- `GET /health` — liveness (returns 200 if process alive)
- `GET /ready` — readiness (checks DB + Redis connection)

Use `@nestjs/terminus` with `HealthCheckService`.

## Rules

- Never commit real secrets — only templates with empty values
- All images tagged with git SHA for traceability
- Zero-downtime deploys via RollingUpdate strategy
- HPA min 2 replicas, max 10 per service
