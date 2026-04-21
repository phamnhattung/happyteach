# /frontend-design — Generate UI Design System & Initial Screens

**Model to use:** `claude-opus-4-7`

You are a senior mobile UI/UX designer and React Native engineer. Your goal is to produce a complete, consistent design system and initial screens for the app — simple to use, information-clear, teacher-friendly.

Read `PLAN.md` first to get the approved app name, target users, and feature list before generating anything.

---

## Deliverable 1 — Brand & Style Guide

Derive the color palette from the app's purpose (teaching, knowledge, warmth) — NOT generic indigo/blue. Think approachable, calm, professional.

Generate `apps/mobile/src/theme/tokens.ts`:

```typescript
export const tokens = {
  colors: {
    primary: {
      50: '…', 100: '…', 200: '…', 300: '…', 400: '…',
      500: '…', 600: '…', 700: '…', 800: '…', 900: '…',
    },
    secondary: {
      50: '…', 100: '…', 200: '…', 300: '…', 400: '…',
      500: '…', 600: '…', 700: '…', 800: '…', 900: '…',
    },
    success: '…',
    warning: '…',
    danger: '…',
    info: '…',
    gray: {
      50: '…', 100: '…', 200: '…', 300: '…', 400: '…',
      500: '…', 600: '…', 700: '…', 800: '…', 900: '…',
    },
  },
  typography: {
    fontFamily: { sans: 'Inter', mono: 'JetBrains Mono' },
    fontSize: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30 },
    fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
    lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
  },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
  shadow: {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 },
  },
} as const
```

Rules for color choice:
- Primary: warm amber/orange OR teal — something energetic yet calm for teachers
- Secondary: complementary, used for accents and highlights
- All colors must pass WCAG AA contrast on white and dark backgrounds
- Provide the hex values — no CSS variable references

---

## Deliverable 2 — Shared Component Library

Generate these components in `packages/ui/src/components/`. Each must:
- Accept NativeWind `className` prop for overrides
- Support dark mode via `dark:` NativeWind classes
- Have full TypeScript props interface
- Use tokens from `tokens.ts`

### Components to generate

**`Button.tsx`**
- Variants: `primary` | `secondary` | `ghost` | `danger`
- Sizes: `sm` | `md` | `lg`
- States: loading (ActivityIndicator), disabled
- Left/right icon slot

**`Card.tsx`**
- Variants: `elevated` | `outlined` | `flat`
- Optional header, footer, pressable mode

**`Input.tsx`**
- Label above field
- Helper text + error text below
- Left/right icon slot
- Multiline support
- Error state (red border + error message)

**`Badge.tsx`**
- Variants: `success` | `warning` | `danger` | `info` | `neutral`
- Sizes: `sm` | `md`

**`Skeleton.tsx`**
- Animated shimmer effect (Reanimated)
- Width + height + borderRadius props
- Common presets: `SkeletonText`, `SkeletonCard`, `SkeletonAvatar`

**`EmptyState.tsx`**
- Icon (Lucide or emoji)
- Title + subtitle
- Optional CTA button

**`Avatar.tsx`**
- Image with fallback to initials
- Sizes: `sm` (32) | `md` (40) | `lg` (56)
- Online indicator dot option

**`ScoreBadge.tsx`** (domain-specific)
- Shows numeric score with color: red (<50%), yellow (50–75%), green (>75%)
- Size: `sm` | `md` | `lg`

Export all from `packages/ui/src/index.ts`.

---

## Deliverable 3 — App Shell & Navigation

Generate `apps/mobile/src/app/(tabs)/_layout.tsx`:

- Read user role from `useAuthStore().user?.role`
- Teacher role → tabs: **Dashboard, Lessons, Exams, Grading, Profile**
- Student role → tabs: **My Results, Grade Sheets, Profile**
- Active tint: `tokens.colors.primary[600]`
- Inactive tint: `tokens.colors.gray[400]`
- Tab bar background: white / `tokens.colors.gray[900]` in dark mode
- Tab bar border top: `tokens.colors.gray[200]`
- Icons: use `lucide-react-native` (BookOpen, FileText, Camera, BarChart2, User, Award, ClipboardList)
- Vietnamese tab labels

---

## Deliverable 4 — Core Screens

### Design principles for all screens

- **Information hierarchy**: most important data is largest and highest on screen
- **One primary action per screen** — clear, full-width button at bottom
- **Progressive disclosure** — show summary first, detail on tap
- **Empty states always** — never a blank white screen
- **Loading skeletons** — never a spinner blocking the full screen

---

### Teacher Dashboard (`apps/mobile/src/app/(tabs)/index.tsx`)

Layout (top to bottom):
1. **Header bar** — "Xin chào, [name] 👋" left, avatar right (tappable → Profile)
2. **Quick stats row** — 3 cards: Bài học hôm nay / Đề thi chờ / Bài cần chấm (numbers, color-coded)
3. **Quick action row** — 3 icon buttons: "+ Soạn bài", "+ Tạo đề", "Chấm bài"
4. **Upcoming lessons** — section header + horizontal scroll cards (subject chip, grade, duration)
5. **Recent exams** — section header + vertical list (title, date, status badge)
6. Empty state for each section when no data

Data: React Query hooks, 5-min stale time, pull-to-refresh.

---

### Student Dashboard (`apps/mobile/src/app/(tabs)/student-home.tsx`)

Layout:
1. **Header** — "Kết quả của tôi"
2. **Score summary card** — average score + trend arrow vs last month
3. **Recent results list** — exam name, date, ScoreBadge, tap → detail
4. **Subjects overview** — chips with average per subject
5. Empty state when no results yet

---

### Lessons Tab (`apps/mobile/src/app/(tabs)/lessons/index.tsx`)

Layout:
1. **Search bar** (sticky)
2. **Filter chips**: All / Toán / Văn / Anh / ... (horizontal scroll)
3. **Lesson list**: card per lesson — title, subject chip, grade, date, 3-dot menu
4. **FAB** (+) bottom-right → navigate to generate screen
5. Skeleton: 4 card placeholders while loading
6. Empty state: "Chưa có bài soạn nào. Tạo bài soạn đầu tiên!"

---

### Exams Tab (`apps/mobile/src/app/(tabs)/exams/index.tsx`)

Layout:
1. **Segmented control**: Bản nháp / Đã xuất bản / Lưu trữ
2. **Exam list**: card — title, subject, grade, question count, date, status badge
3. **FAB** (+) → generate screen
4. Skeleton + empty state per segment

---

### Grading Tab (`apps/mobile/src/app/(tabs)/grading/index.tsx`)

Layout:
1. **Pending grading banner** (orange) — "X bài chưa chấm" — dismissible
2. **Exam selector dropdown** — pick which exam to grade
3. **Student list**: name, submission status chip (Chưa nộp / Đang xử lý / Đã chấm), score if available
4. **"Chấm bằng camera" button** (primary, full-width, sticky bottom)
5. Empty state: "Chọn đề thi để xem danh sách học sinh"

---

### Profile Tab (`apps/mobile/src/app/(tabs)/profile/index.tsx`)

Layout:
1. **Avatar + name + school** — centered at top
2. **Stats row**: Bài soạn / Đề thi / Học sinh đã chấm
3. **Settings list**: Thông báo / Ngôn ngữ / Đổi mật khẩu / Đăng xuất
4. **App version** at bottom in gray[400]

---

## After all deliverables

Display this summary table:

| Deliverable | Files created | Status |
|---|---|---|
| Design tokens | `apps/mobile/src/theme/tokens.ts` | ✓ |
| Shared components | `packages/ui/src/components/*.tsx` | ✓ |
| App shell | `apps/mobile/src/app/(tabs)/_layout.tsx` | ✓ |
| Teacher dashboard | `apps/mobile/src/app/(tabs)/index.tsx` | ✓ |
| Student dashboard | `apps/mobile/src/app/(tabs)/student-home.tsx` | ✓ |
| Lessons tab | `apps/mobile/src/app/(tabs)/lessons/index.tsx` | ✓ |
| Exams tab | `apps/mobile/src/app/(tabs)/exams/index.tsx` | ✓ |
| Grading tab | `apps/mobile/src/app/(tabs)/grading/index.tsx` | ✓ |
| Profile tab | `apps/mobile/src/app/(tabs)/profile/index.tsx` | ✓ |

Then ask:

> "Design system and initial screens generated. Does everything look right? Reply 'yes' to continue to Phase 3 (monorepo scaffold), or tell me what to change."
