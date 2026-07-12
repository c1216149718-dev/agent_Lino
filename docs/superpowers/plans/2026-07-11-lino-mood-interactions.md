# Lino Mood Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Mood selections visibly change Lino's original cloud expression and motion, and make the main Mood Lino trigger a different random emotion when clicked.

**Architecture:** Keep the original cloud PNG as the immutable silhouette. Add state-specific HTML/CSS face and action overlays inside `LinoMascot`, while `MoodPanel` owns the random selection event and derives labels from the existing agent state.

**Tech Stack:** React 19, Framer Motion, Tailwind CSS, Playwright, localStorage.

## Global Constraints

- Preserve `/lino-assets/lino-original-cloud.png` as the visible character body.
- Do not use the cat-shaped expression assets.
- Do not add dependencies or change the localStorage schema.
- Disable the random Mood interaction while Lino is responding.
- Respect `prefers-reduced-motion`.

---

### Task 1: Specify Mood interaction behavior

**Files:**
- Modify: `tests/lino.spec.js`

**Interfaces:**
- Consumes: Mood tab button and the existing `chat.agentState` state.
- Produces: E2E expectations for `data-expression`, dynamic Mood labels, selected strips, and the random Mood button.

- [ ] **Step 1: Write the failing tests**

Add a test that enters the desk, opens Mood, chooses `happy`, checks the main mascot has `data-expression="happy"`, checks the label is `Feeling happy`, and checks the chosen strip has `aria-pressed="true"`. Add a second test that clicks the main mascot and asserts its `data-state` differs from the previous state.

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run:

```powershell
pnpm.cmd test:e2e --grep "Mood"
```

Expected: FAIL because the main mascot is not a button and does not expose the rendered expression state.

- [ ] **Step 3: Keep the failing assertions behavior-focused**

Use role and state locators rather than visual pixel coordinates so the test covers the user interaction and remains stable across responsive layouts.

### Task 2: Render state-specific faces and action cues

**Files:**
- Modify: `src/components/LinoMascot.jsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `state`, `expression`, `pose`, `size`, and `useReducedMotion()`.
- Produces: `data-state`, `data-expression`, `.lino-expression-*`, and `.lino-cue-*` selectors.

- [ ] **Step 1: Add semantic state markers and overlay markup**

Expose the resolved state and expression on the mascot root. Render a face layer with two eyes, brows, and a mouth plus a decorative cue layer. Keep both layers non-interactive and hidden from accessibility APIs.

- [ ] **Step 2: Add minimal state-specific CSS**

Use CSS transforms and borders to draw the seven expressions. Animate only the cue layer or transform-based body motion, and disable those animations under the existing reduced-motion media query.

- [ ] **Step 3: Run the targeted Mood test**

Run:

```powershell
pnpm.cmd test:e2e --grep "Mood"
```

Expected: expression-state assertions pass; random-button assertions remain failing until Task 3.

### Task 3: Connect Mood controls and dynamic copy

**Files:**
- Modify: `src/components/ChatStage.jsx`

**Interfaces:**
- Consumes: `chat.agentState`, `chat.isResponding`, and `chat.setAgentState(state)`.
- Produces: `chooseRandomMood()` and selected-state Mood controls.

- [ ] **Step 1: Add mood metadata and random selection**

Store an English display label beside each existing state. Build the random pool from the five Mood states, exclude the current state, and call `chat.setAgentState` with one remaining state.

- [ ] **Step 2: Make the main mascot interactive**

Wrap it in a button named `随机切换 Lino 情绪`, disable it while responding, and show an accessible selected state on each precise Mood button with `aria-pressed`.

- [ ] **Step 3: Derive the Mood heading from state**

Replace the fixed `Feeling neutral` text with the current state label and retain a neutral fallback for transient states.

- [ ] **Step 4: Run targeted and complete verification**

Run:

```powershell
pnpm.cmd test:e2e --grep "Mood"
pnpm.cmd lint
pnpm.cmd build
pnpm.cmd test:e2e
```

Expected: all commands exit with code 0.

### Task 4: Rendered desktop and mobile QA

**Files:**
- No committed files.

**Interfaces:**
- Consumes: running Vite app at `http://127.0.0.1:5173/`.
- Produces: screenshots and console/overflow evidence outside the repository.

- [ ] **Step 1: Exercise the target flow on desktop**

Open the app, enter Chat, open Mood, select each emotion, click the main Lino, and verify the face, motion, label, and selected strip change without console errors.

- [ ] **Step 2: Repeat the interaction on mobile**

Use a 390 by 844 viewport and confirm the Mood grid has no horizontal overflow, clipping, or overlapping controls.

- [ ] **Step 3: Record remaining risks**

Report browser coverage and the fact that CSS overlays are positioned against the current original PNG crop.
