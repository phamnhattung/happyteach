# /checkpoint — Save Session Progress

Call this skill after completing any task, before hitting context limits, or any time you want to preserve state.

## What to do

### Step 1 — Read current state

Read `SESSION_STATE.md`, `PLAN.md`, and the last few files you worked on to get an accurate picture of what's done.

### Step 2 — Update SESSION_STATE.md

Rewrite SESSION_STATE.md with the current accurate state. Use this exact structure:

```markdown
# SESSION_STATE.md

> Auto-updated by `/checkpoint` skill. Last updated: [TODAY'S DATE]

---

## Current Status

| Field | Value |
|---|---|
| Phase | [number] — [phase name] |
| Active task | [what was being worked on] |
| Blocked | [Yes — reason / No] |
| Next action | [exact next step: file to create, command to run, decision to make] |

---

## Completed Work

### Skills created (`D:/Project/Vibe/.claude/commands/`)
[List all skill files with their purpose]

### Docs created
[List all documentation files]

### Services / packages scaffolded
[List directories created with brief description]

### Key decisions locked in
[Bullet list of architectural decisions that must not change]

---

## Pending / In Progress

- [ ] [task currently in progress, if any]
- [ ] [next queued task]

---

## Phase Checklist

| # | Phase | Skill | Model | Status |
|---|---|---|---|---|
[One row per phase from PLAN.md, with accurate status emoji]

Status legend: ⬜ pending | 🔄 in progress | ✅ done | ❌ blocked

---

## Files Created This Session

[List every file path written during this session, grouped by phase]

**Phase 2 — Scaffold:**
- `package.json`
- `pnpm-workspace.yaml`
- ...

**Phase 4 — Auth:**
- `services/auth/src/main.ts`
- ...

---

## Open Decisions

| Decision | Needed by | Options | Recommendation |
|---|---|---|---|
[Any unresolved decisions that block a future phase]

---

## Resume Instructions

To resume in a new session:

1. Read this file first
2. Check the Phase Checklist — find first 🔄 or ⬜ phase
3. Read `PLAN.md` for full phase detail
4. Read `CLAUDE.md` for project constraints
5. Run the skill listed for that phase
```

### Step 3 — Confirm to user

After writing the file, print a short summary:

```
Checkpoint saved.

Phase X (name) — [status]
Next: [one sentence on what to do next]

Resume anytime with: /resume
```

## When to call this

- After every completed phase
- After completing any significant set of files (>5 files created)
- Before the conversation is likely to hit context limits
- Any time the user says "save", "checkpoint", "save progress", or "save state"
