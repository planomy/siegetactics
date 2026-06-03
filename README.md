# Granny Boom — Siege Tactics

**Tagline:** *They've landed. Hold the line.*

Browser tower-defense sequel to [Granny Boom](https://grannyboom.com). Kids forge maths solutions to earn XP and turret budget, then defend Granny's house in 60-second alien waves.

**Audience:** Ages 9–12 (Australian Years 5–6)  
**Deploy target:** GitHub Pages → `planomy.github.io/siegetactics` (custom domain TBD, e.g. `siege.grannyboom.com`)

---

## Status

| Phase | Status |
|-------|--------|
| README + GDD + vertical slice plan | ✅ This repo |
| Vertical slice (1 mission end-to-end) | ✅ Playable |
| Content pass (11 remaining missions) | Not started |
| Polish (How to Play, balance, mobile) | Not started |

See [`docs/GDD.md`](docs/GDD.md) for the one-page design doc and [`docs/VERTICAL-SLICE.md`](docs/VERTICAL-SLICE.md) for the build plan.

---

## Core loop (8–12 min session)

```
Welcome → Choose strand → Choose mission → Forge solution → Siege shop → Deploy → 60s wave → Results
```

1. **Welcome** — player name in `localStorage` (same pattern as main Granny Boom).
2. **Strand** — Number or Measurement (v1); Space / Statistics in v2.
3. **Mission** — grid of 6 mission cards per strand.
4. **Forge** — opener + 3 choice slots + CHECK → lock-in answer. Wrong = retry; correct = Mission XP + wave turret budget.
5. **Siege shop** — spend wave budget on 4 turret types (Fieldrunners-style bottom bar).
6. **Deploy** — place turrets on field (v1: 3 lanes + fixed pads).
7. **Wave** — 60 seconds, enemies path left → right toward Granny's house. Lives on leaks.
8. **Results** — score, XP, unlock next mission; optional defence-bot collectible per strand.

---

## Repo structure (planned)

```
siegetactics/
├── index.html              # SPA shell (vertical slice)
├── css/
│   └── main.css            # Dark panels, orange/gold accents, Bangers headings
├── js/
│   ├── app.js              # State, routing, save/load
│   ├── missions-data.js    # Mission definitions (content)
│   ├── forge.js            # Container / slot UI
│   ├── shop.js             # Turret purchase bar
│   ├── td-engine.js        # Grid, placement, waves, lives, timer
│   └── dev.js              # ?dev mode helpers
├── assets/                 # Sprites, backgrounds (placeholders OK for slice)
├── docs/
│   ├── GDD.md
│   └── VERTICAL-SLICE.md
└── README.md
```

---

## localStorage

| Key | Purpose |
|-----|---------|
| `grannyboom.siege.v1` | Player save: name, XP, unlocked missions, collectibles, settings |

Save shape (draft):

```js
{
  version: 1,
  playerName: "",
  xp: 0,
  unlockedMissions: ["number-place-value-patrol"],
  completedMissions: [],
  collectibles: [],
  settings: { sound: true, speed: 1 }
}
```

Shared-key strategy with main Granny Boom can be documented here if we later sync XP branding — v1 keeps siege save separate.

---

## Dev mode

Append `?dev` to the URL to unlock:

- All missions
- Skip forge (grant default budget)
- Fast-forward wave timer
- Infinite lives

---

## Curriculum

Australian Curriculum v9 — **Number** and **Measurement** strands for v1. Full AC mapping in [`docs/GDD.md`](docs/GDD.md).

Proficiency tags per mission: problem-solving (containers), fluency (lock-in), reasoning (step order).

---

## Relationship to Granny Boom

Same universe: Granny, aliens, XP economy feel. Narrative hook after the writing game: *"They've landed."* Aliens cross the field toward Granny's house; kids spend forged XP on turrets.

Visual language to match main game: dark panels, orange/gold accents, Bangers headings, short Granny voice lines. Asset reuse from main repo where licensed — note provenance in this README when assets are copied.

---

## v1 scope guardrails

- 2 strands, 12 missions total
- 4 turret types, 2 upgrades each max
- One 60s wave per mission
- How to Play carousel (3 slides) + guide page
- **Out of scope:** free-placement pathfinding, Statistics/Probability strand, accounts, endless mode

---

## License & assets

- Code: TBD (match main Granny Boom repo when linked).
- Granny / alien art: reference or copy from main repo with license note — placeholders OK until vertical slice.

---

## Next step

Review [`docs/GDD.md`](docs/GDD.md) and [`docs/VERTICAL-SLICE.md`](docs/VERTICAL-SLICE.md), then approve vertical slice build.
