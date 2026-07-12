# Lino Nine-State Sprite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace CSS-drawn Lino expressions with the exact nine reference frames and give every state a distinct motion behavior.

**Architecture:** Copy the supplied reference sheet unchanged into public assets. `LinoMascot` resolves each state to a sprite row and column, renders it through an overflow-hidden square viewport, and applies state-specific Framer Motion transforms; Mood and persisted state data use the same nine-state catalog.

**Tech Stack:** React 19, Framer Motion, CSS, Playwright, localStorage.

## Global Constraints

- Use the supplied `1254 × 1254` reference image unchanged.
- Remove the CSS face and cue overlays.
- Do not add dependencies or change localStorage version `2`.
- Use exactly these states: `idle`, `happy`, `playful`, `curious`, `shy`, `surprised`, `thinking`, `proud`, `sleepy`.
- Respect `prefers-reduced-motion`.

---

### Task 1: Define failing nine-state behavior tests

**Files:**
- Modify: `tests/lino.spec.js`

**Interfaces:**
- Consumes: Mood navigation, Mood state buttons, mascot state attributes, localStorage key `lino-home:v2`.
- Produces: regression coverage for nine states, sprite coordinates, random switching, and legacy-state migration.

- [ ] **Step 1: Replace five-state Mood assertions with nine-state assertions**

Check that nine `.expression-strip` controls render. Select each strip and assert the main mascot exposes the expected `data-state`, `data-sprite-row`, and `data-sprite-column` values.

- [ ] **Step 2: Add legacy migration assertions**

Seed localStorage with `sad`, reload, and assert Mood restores `shy`. Repeat for `angry` and assert `proud`.

- [ ] **Step 3: Run targeted tests**

```powershell
pnpm.cmd test:e2e --grep "Mood|legacy"
```

Expected: FAIL because the current UI has five state controls and no sprite coordinates.

### Task 2: Update the state catalog and persistence compatibility

**Files:**
- Modify: `src/data/seed.js`
- Modify: `src/hooks/useStoredChat.js`
- Modify: `src/components/ChatStage.jsx`

**Interfaces:**
- Consumes: existing `agentState` string and `setAgentState(state)` API.
- Produces: nine Mood entries and legacy mappings `sad -> shy`, `angry -> proud`.

- [ ] **Step 1: Replace the state options and Mood metadata**

Use the nine exact IDs and Chinese labels from the approved specification. Keep `thinking` and `proud` as the send lifecycle states.

- [ ] **Step 2: Add legacy state normalization**

Resolve `sad` to `shy` and `angry` to `proud` before valid-state checking.

- [ ] **Step 3: Expand weighted ambient states**

Keep `idle` repeated for a calm default and include the other non-transient states once each.

### Task 3: Replace overlays with the exact sprite renderer

**Files:**
- Create: `public/lino-assets/lino-nine-states.png`
- Modify: `src/components/LinoMascot.jsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `state`, `pose`, `size`, and reduced-motion preference.
- Produces: `data-sprite-row`, `data-sprite-column`, and state-specific motion.

- [ ] **Step 1: Copy the supplied image unchanged**

Copy `C:\Users\ASUS\AppData\Local\Temp\codex-clipboard-115b9070-c784-4e1d-975b-d5e5f8d737dd.png` to `public/lino-assets/lino-nine-states.png` and verify both SHA-256 hashes match.

- [ ] **Step 2: Render the selected sprite cell**

Use a square overflow viewport and position a three-times-size image with row and column CSS variables. Remove all face-overlay and cue markup.

- [ ] **Step 3: Apply distinct state motion**

Keep animations transform-only: breathe, hop, tilt, tuck, recoil, think, proud bounce, and sleepy nod. Switch directly when reduced motion is active.

- [ ] **Step 4: Run targeted tests**

```powershell
pnpm.cmd test:e2e --grep "Mood|legacy"
```

Expected: PASS.

### Task 4: Full verification and rendered QA

**Files:**
- No additional committed files.

**Interfaces:**
- Consumes: app at `http://127.0.0.1:5173/`.
- Produces: test output and desktop/mobile screenshot evidence outside the repository.

- [ ] **Step 1: Run static and full test verification**

```powershell
pnpm.cmd lint
pnpm.cmd build
pnpm.cmd test:e2e
```

Expected: all commands exit with code `0`.

- [ ] **Step 2: Inspect desktop and mobile Mood states**

Capture desktop and `390 × 844` screenshots after selecting different states. Check sprite framing, white-background blending, text fit, clipping, overlap, and horizontal overflow.

- [ ] **Step 3: Exercise random switching and console checks**

Click the main Mood Lino, verify the state changes, and confirm there are no relevant browser console errors or warnings.
