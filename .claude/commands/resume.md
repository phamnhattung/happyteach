# /resume — Resume Work from Last Checkpoint

Call this at the start of a new session to instantly get back to work without re-explaining context.

## What to do

### Step 1 — Read all state files

Read these files in order:
1. `SESSION_STATE.md` — where we left off
2. `PLAN.md` — full phase details and constraints
3. `CLAUDE.md` — project rules and architecture decisions

### Step 2 — Orient and report

Print a compact status report to the user:

```
## Resuming HappyTeach

**Last checkpoint:** [date from SESSION_STATE.md]

**Completed phases:**
- ✅ Phase X — [name]
- ✅ Phase Y — [name]

**Current phase:**
- 🔄 Phase Z — [name] ([what was in progress])

**Next action:**
[Exact next step from SESSION_STATE.md "Next action" field]

**Open decisions needing input:**
- [any blocked decisions from the Open Decisions table]

Ready to continue. Should I proceed with [next action]?
```

### Step 3 — Wait for user confirmation

Do not start generating code or making changes until the user says to proceed.

If there are open decisions listed in SESSION_STATE.md, surface them now and ask the user to resolve them before continuing.

### Step 4 — Continue

Once the user confirms:
1. Pick up from the exact "Next action" in SESSION_STATE.md
2. Follow the phase instructions in PLAN.md
3. Run `/checkpoint` after completing the next task or set of files
