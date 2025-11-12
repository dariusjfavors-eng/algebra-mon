# Algebra-Mon Context

## Project Overview
- React + TypeScript front-end bootstrapped with Vite.
- Phaser handles the overworld, battles, and scenes (WorldScene, UIScene, GymScene, etc.).
- Firebase Auth + Firestore store player profiles, starters, XP/stamina, and game logs.
- Questions come from Google Sheets TSV via `QUESTIONS_TSV` with lazy-loaded scenes for professor, gyms, quiz, battles.

## Run / Build
```bash
npm install
npm run dev     # starts Vite + Phaser/UI
npm run build   # type-checks and builds production bundle
```

## Key Directories
- `src/scenes/` – Phaser scenes (WorldScene, GymScene, BattleScene, etc.).
- `src/components/` – React UI (HUD, Battle modal, StarterPick).
- `src/data/` – static definitions (gyms, NPCs).
- `src/config/world.ts` – world geometry: roads, buildings, water, landmarks.
- `src/lib/` – utilities (profiles, question loader, runtime asset loader).

## Gameplay Quick Notes
- Movement + study flows live in `WorldScene` and `App.tsx` (React handles modal + HUD, Phaser handles map).
- Stamina/XPs maintained in React state and persisted via Firestore logs.
- Gyms check mastery via Firestore, then launch boss battles in the modal; losing warps player outside via `ALGMON_WARP_PLAYER`.
- NPC trainers spawn from `src/data/npcs.ts` and battles trigger with `ALGMON_START_NPC_BATTLE`.

## Recent Visual Tweaks (May 2024)
- Roads/town pads now use a gravel texture with raised brown edges.
- Gyms draw via a single graphics pass for better depth.
- Harbor HQ freighter: scaled to 90%, has white bow arc, anchors, centerline, bobbing animation, wave splashes.
- HUD now spans the top center with XP/stamina modules side-by-side.

Keep this file updated when major systems or workflows change so future sessions have an at-a-glance reference.
