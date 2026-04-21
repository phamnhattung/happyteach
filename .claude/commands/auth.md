# /auth — Build Full Authentication System

You are a senior security engineer. Build the complete authentication system for Teacher Assistant AI — both the NestJS backend service and the Expo mobile screens.

## Backend: services/auth

### Endpoints

```
POST /auth/register       — email + password + name + school
POST /auth/login          — email + password → access + refresh tokens
POST /auth/refresh        — rotate refresh token
POST /auth/logout         — invalidate refresh token
POST /auth/forgot         — send reset email
POST /auth/reset          — reset password with token
POST /auth/google         — OAuth2 Google
POST /auth/apple          — Sign in with Apple
GET  /auth/me             — current user profile
```

### Implementation requirements

- JWT access token: 15 min expiry, signed RS256
- Refresh token: 7 days, stored in Redis with user binding
- Bcrypt password hashing (rounds: 12)
- Prisma models: User, RefreshToken, PasswordReset
- Guards: JwtAuthGuard, RolesGuard
- Decorators: @CurrentUser(), @Roles()
- Email service: BullMQ job queue → nodemailer template
- Google OAuth: passport-google-oauth20
- Apple OAuth: passport-apple
- Rate limit: 5 req/min on login endpoint
- Audit log every auth event

### Prisma schema additions

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String?
  name          String
  role          Role     @default(TEACHER)
  schoolId      String?
  isVerified    Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum Role {
  TEACHER
  ADMIN
  SCHOOL_ADMIN
}
```

## Mobile: apps/mobile/src/app/(auth)

### Screens to build

- `login.tsx` — email/password + Google + Apple buttons
- `register.tsx` — multi-step form (name → school → email → password)
- `forgot-password.tsx` — email input + success state
- `reset-password.tsx` — token from deep link + new password

### Mobile requirements

- React Hook Form + Zod validation on all forms
- Zustand authStore: `{ user, accessToken, login, logout, refresh }`
- Secure token storage: expo-secure-store (never AsyncStorage for tokens)
- Auto-refresh token on 401 via Axios interceptor
- Biometric unlock option (expo-local-authentication)
- Loading skeletons during auth state hydration
- Deep link handler for password reset: `teachassist://reset-password?token=xxx`

### UI design

- Gradient background (purple → blue, teacher-friendly)
- Card-style form with shadow
- Animated logo entrance (Reanimated FadeInDown)
- Inline field validation feedback
- Dark mode compatible (NativeWind dark: prefix)

## After completion

Automatically continue to `/lesson-planner`.
