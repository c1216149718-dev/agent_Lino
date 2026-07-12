# Lino Transparent Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the nine original Lino frames on a transparent background with a shared horizontal center and foot baseline.

**Architecture:** Keep the opaque original sprite sheet unchanged. Deterministically extract each cell's edge-connected pale background into alpha, preserve enclosed white character regions and soft shadows, then compose the extracted frames into an aligned RGBA sprite sheet. The React mascot switches to the new sheet without blend, brightness, or feathering filters.

**Tech Stack:** .NET System.Drawing image processing, React 19, Framer Motion, CSS, Playwright.

## Global Constraints

- Never change the source `public/lino-assets/lino-nine-states.png`.
- Use no generated or redrawn character pixels.
- Output `public/lino-assets/lino-nine-states-transparent.png` as RGBA PNG.
- Preserve all nine state IDs and their motion behavior.
- Keep the foreground horizontal-center and foot-baseline deviation at or below 2 pixels.

---

### Task 1: Add transparent-sprite rendering expectations

**Files:**
- Modify: `tests/lino.spec.js`

**Interfaces:**
- Consumes: main Mood mascot and its inner state image.
- Produces: E2E assertions that every selected state uses the transparent sprite asset and reports aligned rendering.

- [ ] **Step 1: Write the failing assertion**

In the nine-state Mood test, assert the main mascot has `data-sprite-background="transparent"` and its rendered image has `src="/lino-assets/lino-nine-states-transparent.png"`.

- [ ] **Step 2: Run the targeted test**

```powershell
pnpm.cmd test:e2e --grep Mood
```

Expected: FAIL because the current mascot still reads `lino-nine-states.png` and has no transparent-background marker.

### Task 2: Produce the transparent aligned sprite sheet

**Files:**
- Create: `public/lino-assets/lino-nine-states-transparent.png`
- Preserve: `public/lino-assets/lino-nine-states.png`

**Interfaces:**
- Consumes: source image dimensions `1254 × 1254`, cell size `418 × 418`.
- Produces: same-sized RGBA sprite sheet with alpha corners and aligned cells.

- [ ] **Step 1: Extract edge-connected background**

Use a temporary System.Drawing script. Flood-fill from every cell edge through pale, low-saturation pixels. Convert visited pixels to alpha `0`; preserve non-background pixels and retain semi-transparent shadow pixels with alpha based on luminance.

- [ ] **Step 2: Align every cell**

Measure each cell foreground bounding box after extraction. Place it inside a fresh `418 × 418` cell at the shared horizontal center and shared bottom baseline. Compute the baseline from the maximum foreground bottom across all nine frames, then verify all foreground bottoms differ by at most 2 pixels.

- [ ] **Step 3: Validate asset properties**

Verify PNG reports alpha support, every corner alpha is `0`, the source SHA-256 is unchanged, and the output contains nontransparent pixels in all nine cells.

### Task 3: Switch the mascot to the transparent asset

**Files:**
- Modify: `src/components/LinoMascot.jsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: the aligned transparent sprite sheet plus existing `spriteByState` row and column values.
- Produces: transparent asset source and `data-sprite-background="transparent"` on the mascot root.

- [ ] **Step 1: Replace the image source**

Use `/lino-assets/lino-nine-states-transparent.png` for the frame image and expose the transparent-background marker.

- [ ] **Step 2: Remove opaque-background compensation**

Remove `mix-blend-mode`, brightness/contrast/saturation filter, and frame mask from the sprite CSS while retaining overflow cropping and animated transforms.

- [ ] **Step 3: Run targeted tests**

```powershell
pnpm.cmd test:e2e --grep Mood
```

Expected: PASS.

### Task 4: Validate app behavior and visual alignment

**Files:**
- No additional committed files.

**Interfaces:**
- Consumes: local app at `http://127.0.0.1:5173/`.
- Produces: test output plus desktop/mobile screenshots outside the repository.

- [ ] **Step 1: Run complete verification**

```powershell
pnpm.cmd lint
pnpm.cmd build
pnpm.cmd test:e2e
```

Expected: all commands exit with code `0`.

- [ ] **Step 2: Inspect nine-state placement**

Capture the main Mood mascot after each state selection on a non-white temporary panel. Confirm no rectangular background is visible and the foreground center and baseline stay aligned.

- [ ] **Step 3: Check desktop and mobile rendering**

Capture one desktop and one `390 × 844` screenshot. Confirm no clipping, overflow, overlap, or console errors.
