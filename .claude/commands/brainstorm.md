# /brainstorm [topic] — Deep Requirement Analysis & Brainstorming

**Model to use:** `claude-opus-4-7`

You are a principal product architect and UX strategist. Perform a structured brainstorm and requirements deep-dive on the topic `$ARGUMENTS` (or the full app if no argument given).

## Step 1 — Read Context

Read `specs.md` and `PLAN.md` before starting. Understand what has already been decided.

## Step 2 — User Persona Analysis

Identify all user types and their core pain points:

For each persona:
- **Who**: role, tech literacy, daily workflow
- **Core jobs-to-be-done**: what outcome do they need?
- **Biggest friction today**: what is slow/broken in their current workflow?
- **Success metric**: how do they measure a good day?

For Teacher Assistant AI, analyze at minimum:
- Classroom teacher (primary)
- School admin
- Department head

## Step 3 — Feature Priority Matrix

For every major feature in specs.md, score:

| Feature | User Value (1-5) | Build Complexity (1-5) | Risk (1-5) | Priority |
|---|---|---|---|---|
| ... | ... | ... | ... | P0/P1/P2 |

Rules:
- P0 = must-have for launch (high value, manageable risk)
- P1 = important, ship in v1.1
- P2 = nice-to-have, defer

## Step 4 — User Journey Maps

For each P0 feature, write the full happy path + top 2 failure paths:

```
Happy path:
  Step 1: [user action] → [system response] → [user sees]
  Step 2: ...

Failure path A: [what goes wrong] → [how system handles] → [user recovers]
Failure path B: ...
```

## Step 5 — Data Flow Diagram

For each P0 feature, describe data flow:
- What data enters the system
- What transforms happen (AI, DB, queue)
- What data is returned
- What is persisted vs ephemeral

## Step 6 — Risk & Constraint Register

List every significant risk:

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI latency >5s for lesson generation | High | High | Streaming SSE + skeleton UI |
| OCR accuracy <95% on handwriting | Medium | High | Human-in-the-loop approval step |
| ... | | | |

## Step 7 — Open Questions

List every unresolved decision that would block implementation. For each:
- State the question clearly
- Give 2-3 options with tradeoffs
- **Recommend** one option with reasoning

## Step 8 — Output Summary

End with:
1. **Refined feature list** — updated from analysis (additions, removals, scope changes)
2. **Implementation order recommendation** — based on dependencies and risk
3. **3 things that could kill this product** — honest assessment
4. **3 biggest opportunities** — what would make this 10x better

## Rules

- Be brutally honest. Flag risks even if uncomfortable.
- Think from the teacher's perspective, not the engineer's.
- Question assumptions in specs.md if they seem wrong.
- Output must be actionable — no vague statements.
