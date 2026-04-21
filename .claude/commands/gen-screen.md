# /gen-screen [name] — Generate an Expo Mobile Screen

Generate a complete, production-ready Expo screen for Teacher Assistant AI.

## Usage

```
/gen-screen profile
/gen-screen notifications
/gen-screen class-detail
```

The argument `$ARGUMENTS` is the screen name.

## What to generate

### File location

`apps/mobile/src/app/(tabs)/$ARGUMENTS.tsx` or the appropriate route path based on the name.

### Screen template

Every screen must include:

```typescript
// Proper TypeScript types (no `any`)
// React Query for data fetching
// Zustand store access via hooks
// NativeWind className styling
// Reanimated for entrance animations (FadeInDown)
// Loading skeleton state
// Empty state component
// Error state with retry button
// Pull-to-refresh (RefreshControl)
// Keyboard-aware behavior where forms exist
```

### Component structure

```
screens/$ARGUMENTS/
├── index.tsx          — main screen
├── components/        — screen-specific components
│   └── *.tsx
└── hooks/             — screen-specific hooks
    └── use-$ARGUMENTS.ts
```

### Shared components to use (from packages/ui)

- `<Container>` — safe area wrapper
- `<Card>` — elevated card with shadow
- `<Button>` — primary/secondary/ghost variants
- `<Input>` — form input with label + error
- `<Skeleton>` — loading placeholder
- `<EmptyState>` — icon + message + optional CTA
- `<Avatar>` — user/student avatar with fallback initials

### NativeWind design system

Use these consistent tokens:
- Primary: `bg-indigo-600`, `text-indigo-600`
- Surface: `bg-white dark:bg-gray-900`
- Border: `border-gray-200 dark:border-gray-700`
- Text primary: `text-gray-900 dark:text-gray-100`
- Text secondary: `text-gray-500 dark:text-gray-400`
- Danger: `bg-red-500`, `text-red-500`
- Success: `bg-green-500`

### React Query pattern

```typescript
export function use$Screen() {
  const query = useQuery({
    queryKey: ['$name', id],
    queryFn: () => api.$name.get(id),
    staleTime: 1000 * 60 * 5,
  })
  
  const mutation = useMutation({
    mutationFn: api.$name.update,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['$name'] }),
  })
  
  return { ...query, mutation }
}
```

## After generating

State what API endpoints the screen depends on and whether they exist yet.
