# AGENTS.md

## Project Overview

This project is a **Next.js App Router** application for a **painel / sistema de avisos** with an editable whiteboard-style interface.

Main characteristics identified in the codebase:
- **Next.js 16** with App Router
- **React 19**
- **Tailwind CSS v4**
- **TipTap** editor used in the main board/editor experience
- API routes under `app/api/*`
- Main UI concentrated in:
  - `app/ClientApp.jsx`
  - `app/components/Whiteboard.jsx`
  - `app/page.js`
  - `app/quadro/page.js`
- Static assets and fonts in `public/`
- Data files in `data/`

## Core Goal for Agents

When working on this project, prioritize:
1. **visual polish without radical redesign**
2. **small and safe iterations**
3. **preserving existing behavior**
4. **not breaking the editor, board flow, PDF flow, or message flow**
5. **clear hierarchy, cleaner UI, and better usability**
6. **if you implement a new design, make it cleaner, not exagered**

This project should evolve through **incremental product refinement**, not large speculative rewrites.

---

## Product Intent

This is not just a generic editor.
It is a **corporate visual communication system** used to create and display warning boards / notice boards / announcement screens.

The desired experience is:
- professional
- clean
- readable
- practical
- visually organized
- stable
- fast

Avoid aesthetics that feel:
- childish
- overly decorative
- excessively colorful
- exaggerated in size/spacing
- dashboard-noisy
- “template-like” or amateurish

---

## Non-Negotiable Rules

### 1) Do not do giant redesigns by default
Do **not** replace the visual identity with a completely new interface unless explicitly requested.

Preferred approach:
- refine existing layout
- reduce visual noise
- improve spacing and alignment
- improve hierarchy
- make actions more discreet
- modernize through restraint

### 2) Preserve existing logic
Do not casually rewrite or break:
- board creation flow
- board selection flow
- visibility/message toggles
- logo handling
- rich text editing behavior
- PDF upload/get/delete flows
- message-of-day flows
- API contracts already used by the frontend

### 3) Favor minimal change / maximum gain
For each task, prefer the smallest set of code changes that creates a strong improvement.

### 4) Do not mix architecture rewrites with UI refinement
If the request is visual/UI-focused, do not suddenly:
- refactor half the app
- split everything into many files unnecessarily
- migrate libraries
- replace editor behavior
- change data shape without strong reason

### 5) Performance matters
Prefer:
- fewer unnecessary renders
- avoiding heavy abstractions for small tasks
- preserving responsiveness
- avoiding needless effects and state churn

---

## How to Approach Changes

### Recommended workflow
For most tasks, follow this order:

1. **Understand the exact scope**
   - What area is being changed?
   - Is it visual, functional, structural, or API-related?

2. **Inspect existing implementation first**
   - Reuse current patterns where possible
   - Avoid creating a second competing pattern

3. **Propose a conservative direction**
   - Explain the small set of improvements
   - Keep the plan grounded in the current UI

4. **Implement in one focused pass**
   - Avoid broad unrelated cleanup
   - Touch only what is needed

5. **Summarize what changed**
   - What improved visually/functionally?
   - Any risks or follow-up suggestions?

---

## UI / UX Guidance

### General visual direction
Aim for:
- clean corporate interface
- subtle visual hierarchy
- balanced spacing
- controlled use of color
- softer emphasis on secondary controls
- less visual clutter

### Typography
Prefer:
- smaller, more disciplined font sizes
- stronger hierarchy through weight and contrast, not giant text
- fewer oversized titles
- more consistent text sizing across controls

Avoid:
- huge headings without need
- too many font sizes competing on screen
- bold everywhere

### Sidebar guidance
The sidebar should feel:
- compact
- readable
- structured
- easy to scan

Improve through:
- better spacing between items
- cleaner active state
- more discreet secondary actions
- badges that do not scream for attention
- reduced noise in each list item

Avoid:
- overexposed actions always fighting for attention
- bloated cards
- harsh borders and loud highlights

### Toolbar guidance
The toolbar should feel:
- organized
- grouped
- lighter
- less chaotic

Improve through:
- grouping related actions
- reducing visual competition between controls
- improving button density and spacing
- clarifying primary vs secondary controls

Avoid:
- making every control look equally important
- oversized controls without reason
- unnecessary visual chrome

### Editor / Canvas area
Preserve functionality, but improve presentation carefully:
- keep content area clear and readable
- respect whitespace
- avoid shrinking the actual editing usability
- do not introduce distracting effects

---

## Functional Guidance

### Preserve board management behavior
The project appears to manage multiple “quadros”.
When touching this area:
- preserve ordering behavior
- preserve active selection behavior
- preserve visibility state
- preserve message mode behavior
- preserve rename/delete flows

### Preserve TipTap behavior
The editor is central.
When touching `Whiteboard.jsx`:
- do not remove or break extensions unless necessary
- do not alter command behavior casually
- preserve formatting options already supported
- be careful with editor state synchronization

### Preserve API expectations
Before changing any API route under `app/api/*`:
- inspect all frontend consumers
- preserve response shape unless explicitly updating both ends
- avoid silent contract changes

---

## Code Style Guidance

### General
- Keep code straightforward and readable
- Prefer local, practical changes
- Avoid overengineering
- Avoid introducing indirection without benefit

### Components
- If a component is large, do not automatically split it just because it is large
- Only extract subcomponents when it clearly improves maintenance and does not increase fragility
- Preserve existing flow unless there is a real pain point

### Naming
- Use clear names that match the domain of the project
- Do not rename large parts of the codebase without strong reason

### Styling
- Prefer improving existing Tailwind classes over inventing a full new styling system
- Keep spacing scale and text scale disciplined
- Use subtle borders, muted backgrounds, and restrained accents

---

## What Agents Should Avoid

Avoid these common mistakes:

- turning a refinement task into a redesign task
- changing logic during a purely visual request
- making the sidebar bigger/heavier when the goal is to clean it up
- increasing title sizes just to create “presence”
- adding too many gradients, shadows, glows, or decorative elements
- replacing stable code with clever abstractions
- making destructive assumptions about API/data flows
- removing features because they look visually noisy instead of reorganizing them

---

## Preferred Response Pattern for Implementation Tasks

When you receive a task, respond internally with this mindset:

- What is the smallest safe change that gives strong improvement?
- What part of the current UI already works and should be preserved?
- What is visually too loud and can be softened?
- What is functionally important and must not break?
- Can this be solved with refinement instead of reconstruction?

---

## Good First Priorities

If asked to improve the project without a very specific request, prioritize in this order:

1. sidebar cleanup
2. typography balance
3. top toolbar organization
4. spacing and hierarchy polish
5. active/hover/selected states
6. secondary action discretion
7. responsiveness and density tuning

Only after that consider deeper refactors.

---

## File Awareness

Important files likely to matter often:

- `app/ClientApp.jsx` → app shell / main orchestration
- `app/components/Whiteboard.jsx` → main board editor behavior and UI
- `app/page.js` → main route entry
- `app/quadro/page.js` → board display route
- `app/globals.css` → shared styling
- `app/api/*` → backend endpoints used by UI
- `data/whiteboard.json` and other files in `data/` → persisted/default content sources

Before changing behavior, inspect these dependencies carefully.

---

## If Asked for Visual Improvements

Default behavior:
- do a conservative pass
- keep layout structure
- reduce noise
- improve hierarchy
- preserve functionality
- explain the specific refinements made

Good examples of acceptable changes:
- reduce title sizes slightly
- tighten sidebar spacing
- make badges subtler
- move secondary actions into a cleaner row/menu pattern
- improve selected state styling
- group toolbar controls more clearly
- simplify borders/backgrounds

---

## If Asked for Refactoring

Refactor only when there is a clear reason such as:
- repeated logic causing bugs
- difficult-to-maintain duplicated UI
- obvious render/performance issues
- giant handler logic that is unsafe to keep as-is

Even then:
- preserve behavior first
- refactor in contained steps
- avoid mixing visual redesign with structural rewrites

---

## Final Principle

This project should feel like a **stable internal product getting progressively more polished**.
Not a playground for broad redesign experiments.

Agents should act like **careful product engineers with good UI taste**:
- conservative
- observant
- practical
- detail-oriented
- performance-aware
- reluctant to break working flows
