# Vertical Slice Plan
## Mission: Place Value Patrol (`number-place-value-patrol`)

**Goal:** One mission playable end-to-end — forge → shop → deploy → 60 s wave → save — without building the other 11 missions or full meta systems.

**Approval gate:** Do not expand to content pass or polish until this slice is reviewed.

---

## What ships in the slice

| Include | Exclude (defer) |
|---------|-----------------|
| Single mission (Place Value Patrol) | Other 11 missions |
| Forge UI (3 slots + lock-in) | Strand/mission grid (hard-link to slice mission) |
| 4 turret types (no upgrades in slice, or 1 upgrade to prove pattern) | Full upgrade tree |
| 3-lane field + 6–9 fixed pads | Free grid pathfinding |
| 60 s score wave (no retry) | Lives / win-lose |
| Results: aliens blasted + leaks stat | Collectibles, defence bots |
| `localStorage` save (name, XP, mission complete) | Daily quests |
| `?dev` skip-forge + unlock | Full How to Play carousel (1 modal stub OK) |

---

## Screen flow (slice)

```
index.html
  └─ #screen-welcome     → name entry, load save
  └─ #screen-forge       → Place Value Patrol only
  └─ #screen-shop        → bottom bar, budget display
  └─ #screen-deploy      → canvas/DOM field + placement
  └─ #screen-wave        → same view, wave active (or unified deploy+wave)
  └─ #screen-results     → win/lose, XP, replay
```

Minimal routing in `app.js`: linear state machine, no mission picker yet.

---

## Build order (estimated)

### Phase 1 — Shell & save (0.5 day)
- [ ] `index.html` — screens as hidden sections, topbar placeholder
- [ ] `css/main.css` — dark panel, orange accent, Bangers `@import`, mobile tap targets ≥ 44 px
- [ ] `js/app.js` — `loadSave()` / `saveSave()`, state merge, screen show/hide
- [ ] Welcome screen writes `playerName`, reads `grannyboom.siege.v1`

### Phase 2 — Forge (1 day)
- [ ] `js/missions-data.js` — import `number-place-value-patrol` (already drafted)
- [ ] `js/forge.js` — render opener, 3 slot rows, lock-in input
- [ ] Validation: slot indices must match before lock-in accepted; numeric tolerance ±0
- [ ] Success → set `waveBudget`, `missionXp`, transition to shop
- [ ] Granny toast on wrong pick / wrong lock-in (3 short lines max)

### Phase 3 — Shop (0.5 day)
- [ ] `js/shop.js` — 4 turret buttons, subtract from wave budget
- [ ] Owned turrets queue for deployment (count badges)
- [ ] Cannot proceed with 0 turrets placed later — min 1 turret required

### Phase 4 — TD engine (2 days)
- [ ] `js/td-engine.js`:
  - 3 lanes × ~3 pads = 9 placement cells
  - Lane path: spawn x=0 → house x=right
  - Tower entity: type, pad, range circle (debug), fire cooldown, projectile or instant hit
  - Enemy entity: HP, speed, lane, progress 0→1
  - Glue trap: slow modifier on enemies in cell
- [ ] Renderer: **Canvas** (recommended — easier projectiles + many enemies; stick with canvas for v1)
- [ ] Placement: tap empty pad → pop from owned queue
- [ ] Wave spawner reads `waveConfig` from mission data
- [ ] Timer 60 s, phases trickle/clump/boss
- [ ] Lives: decrement on enemy reaching house
- [ ] Pause + 1×/2× buttons

### Phase 5 — Results & dev (0.5 day)
- [ ] Win: survived 60 s with lives > 0 → +XP, mark complete in save
- [ ] Lose: lives 0 → retry button (back to shop with same budget, or re-forge — **decision: retry wave only**)
- [ ] `js/dev.js` — `?dev` sets `DEV.skipForge`, `DEV.infiniteLives`, `DEV.fastWave`

### Phase 6 — Smoke test
- [ ] Desktop Chrome + one mobile viewport (375×667)
- [ ] Fresh save → name → forge → win path under 12 min (target ~8 min)

**Total estimate:** ~4–5 dev days for one developer.

---

## Paper prototype — Place Value Patrol (forge + wave)

### Narrative opener
> *Three squads crossed the fence line. Count each group's digits — thousands, then hundreds, then ones — and tell Granny the total headcount before they reach the porch.*

### Forge slots

| Slot | Role label | Options | Correct |
|------|------------|---------|---------|
| 1 | Thousands | 3 · 30 · **3000** · 300 | index 2 → 3000 |
| 2 | Hundreds | 4 · **400** · 40 · 4000 | index 1 → 400 |
| 3 | Ones | 7 · 70 · 707 · **7** | index 0 → 7 |

**Lock-in:** `3407` (exact integer)

**Granny wrong-pick lines:**
- Slot 1 wrong: *"That digit's in the thousands house — scoot it three places left."*
- Slot 2 wrong: *"Hundreds sit in the middle. Not tens, not thousands."*
- Slot 3 wrong: *"Ones are the doorstep digits. Just the 7."*
- Lock-in wrong: *"Add your three picks: thousands + hundreds + ones."*

**Rewards on success:**
- Persistent XP: **+25**
- Wave budget: **75 XP**

### Wave script (60 s)

| Time | Phase | Spawns | Enemy HP | Speed | Notes |
|------|-------|--------|----------|-------|-------|
| 0–15 s | Trickle | 5 total, 1 every 3 s | 12 | 1.0× | Single lane rotation |
| 15–45 s | Clump | 15 total, bursts of 3 every 6 s | 22 | 1.1× | Lanes 1–3 |
| 45–60 s | Mini-boss | 1 boss + 4 escorts | Boss 140, escort 18 | Boss 0.7×, escort 1.2× | Boss lane 2 at 45 s |

**Wave mode:** Always runs full **60 seconds**. Score = **aliens blasted**. Leaks tracked but do not end the wave early. No retry — one run per forge, then results.

**Lives:** Removed for slice (score attack only).

**Win condition:** Timer hits 0 → results screen  
**Lose condition:** None (score attack)

### Expected player solution (maze fantasy)

With 75 budget, typical buy: 2× Pea Shooter (30) + 1× Glue Trap (20) + 1× Splatter Cannon (25) = 75.  
Pads arranged so clumps pass through glue → splatter → pea crossfire. Slice validates *feel*, not optimal DPS math.

---

## Technical decisions (locked for slice)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Renderer | Canvas 2D | Projectiles, entity count, one draw loop |
| Pathing v1 | Fixed lanes | Scope guardrail; pads per lane |
| Module system | ES modules in `<script type="module">` | No bundler for GitHub Pages simplicity |
| Save key | `grannyboom.siege.v1` | Per README |
| CSS | Single `main.css` | Match Granny Boom simplicity |

---

## Placeholder assets (slice)

| Asset | Placeholder |
|-------|-------------|
| Field | Green gradient + lane dividers |
| House | Orange rectangle + "GRANNY" label |
| Enemies | Coloured circles with HP bar |
| Turrets | Squares/triangles per type colour |
| Granny | Optional emoji/silhouette in forge panel |

Replace with real art in polish pass; document source in README when pulling from main Granny Boom repo.

---

## Acceptance checklist (for approval to expand)

- [ ] Forge validates slots + lock-in; wrong answers recover gracefully
- [ ] Shop spends wave budget only; cannot overspend
- [ ] At least 1 turret placeable per lane
- [ ] Enemies move spawn → house; leaks reduce lives
- [ ] Turrets fire and reduce enemy HP
- [ ] 60 s timer and 3 wave phases observable
- [ ] Win/lose screens persist XP on win
- [ ] `?dev` skip-forge works for QA
- [ ] Year 5 readable without external instructions (teacher smoke test)

---

## After approval

1. **Content pass** — remaining 11 missions in `missions-data.js` using forge template
2. **Mission grid** — strand tabs + unlock gating
3. **Upgrades** — 2 tiers per turret
4. **How to Play** — 3-slide carousel + guide page
5. **Polish** — balance pass, mobile playtest, banner link from grannyboom.com
