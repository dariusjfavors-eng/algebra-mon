const sheetUrl = new URL("./assets/sprites/player_sheet.png", import.meta.url).href;

// src/App.tsx
import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import {
  collection, addDoc, doc, getDoc, updateDoc,
  getDocs, query, where, orderBy, limit
} from "firebase/firestore";
import { loadTSV } from "./lib/sheetLoader";
import type { QuestionRow } from "./lib/sheetLoader";
import { QUESTIONS_TSV, CREATURES_TSV } from "./config";
import Battle from "./components/Battle";
import StarterPick from "./components/StarterPick";
import HUD from "./components/HUD";
import {
  loadProfile, createProfile, setStarter, grantXP, xpNeeded
} from "./lib/profiles";
import type { Profile } from "./lib/profiles";

type GymCfg = { unit: string; x: number; y: number; threshold: number; name: string; color?: number };

// --------- GYM LOCATIONS (tweak as you like) ----------
const GYMS: GymCfg[] = [
  { unit: "1", x: 400, y: 300, threshold: 1, name: "Unit 1 Gym", color: 0x047857 },
  { unit: "2", x: 1000, y: 350,  threshold: 10, name: "Unit 2 Gym", color: 0x7c3aed },
  { unit: "3", x: 1600, y: 450,  threshold: 12, name: "Unit 3 Gym", color: 0x2563eb },
  { unit: "4", x: 600,  y: 900,  threshold: 12, name: "Unit 4 Gym", color: 0xdb2777 },
  { unit: "5", x: 1200, y: 950,  threshold: 14, name: "Unit 5 Gym", color: 0xf59e0b },
  { unit: "6", x: 400,  y: 1300, threshold: 14, name: "Unit 6 Gym", color: 0x10b981 },
  { unit: "7", x: 1400, y: 1250, threshold: 16, name: "Unit 7 Gym", color: 0xef4444 },
];

// Boss settings
const BOSS_QUESTIONS = 5;
const BOSS_PASS = 4;



export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Battle overlay state
  const [qOpen, setQOpen] = useState(false);
  const [qRow, setQRow] = useState<QuestionRow | undefined>(undefined);

  // Boss flow state
  const [bossActive, setBossActive] = useState(false);
  const [bossUnit, setBossUnit] = useState<string | null>(null);
  const [bossQueue, setBossQueue] = useState<QuestionRow[]>([]);
  const [bossIndex, setBossIndex] = useState(0);
  const [bossCorrect, setBossCorrect] = useState(0);

  // Proximity prompt
  const [nearGymText, setNearGymText] = useState<string>("");

  // Profile + starters
  const [starterList, setStarterList] = useState<{ name: string; type?: string; spriteUrl?: string }[]>([]);
  const [showStarterPick, setShowStarterPick] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // UI / Settings state (React land)
const [muted, setMuted] = useState<boolean>(() => {
  // lazy init from localStorage
  return localStorage.getItem("algebramon_muted") === "1";
});
const [musicVol, setMusicVol] = useState<number>(() => {
  const v = Number(localStorage.getItem("algebramon_musicVol"));
  return isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.6;
});
const [showMap, setShowMap] = useState(false);
const [questLogOpen, setQuestLogOpen] = useState(false);


  // --------- AUTH + PROFILE + STARTERS ----------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setReady(true);

      let p = await loadProfile(db, user);
      if (!p) p = await createProfile(db, user);
      setProfile(p);

      try {
        const rows = await loadTSV(CREATURES_TSV);
        const starters = rows
          .filter(r => {
            const v = String((r as any).starter || "").toLowerCase();
            return v === "true" || v === "yes" || v === "1";
          })
          .map(r => ({
            name: (r as any).name || "Starter",
            type: (r as any).type || "",
            spriteUrl: (r as any).sprite || ""
          }));
        setStarterList(starters.slice(0, 3));
        if (!p.starter) setShowStarterPick(true);
      } catch (e) {
        console.error("Load starters failed", e);
      }
    });
    return () => unsub();
  }, []);

  const [pPos, setPPos] = useState<{x:number;y:number}>({ x: 200, y: 200 });

useEffect(() => {
  let id: any;
  if (showMap) {
    id = setInterval(() => {
      const pos = (window as any).__PLAYER_POS;
      if (pos && (pos.x !== pPos.x || pos.y !== pPos.y)) {
        setPPos({ x: pos.x, y: pos.y });
      }
    }, 100); // 10fps is plenty for a minimap
  }
  return () => id && clearInterval(id);
}, [showMap, pPos.x, pPos.y]);

  // --------- PHASER SCENE ----------
  useEffect(() => {
    if (!ready || !mountRef.current) return;

    class GameScene extends Phaser.Scene {
      // Tell TS these exist on Scene
      declare input: Phaser.Input.InputPlugin;
      declare physics: Phaser.Physics.Arcade.ArcadePhysics;

      cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
      lastDir: "down" | "up" | "left" | "right" = "down";
      keys!: { [k: string]: Phaser.Input.Keyboard.Key };
      player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      worldW = 2000;
      worldH = 1500;

      gymsGroup!: Phaser.GameObjects.Container;
      preload() {
  // 3×4 sheet, each frame 32×48
  this.load.spritesheet("player", sheetUrl, { frameWidth: 32, frameHeight: 48 });
}



      async create() {
        // Background grid
        this.add.grid(0, 0, this.worldW, this.worldH, 64, 64, 0x0f172a, 0.06, 0x10b981, 0.15).setOrigin(0, 0);

        // 1) Spawn player first
this.player = this.physics.add.sprite(200, 200, "player", 0);
this.player.setCollideWorldBounds(true);
this.player.setSize(18, 28).setOffset(7, 16);

// 2) Build walls after player exists
// 2) Build walls after player exists
const walls = this.physics.add.staticGroup();
[
  {x: 200, y: 160, w: 600, h: 20},
  {x: 500, y: 320, w: 20,  h: 300},
].forEach(s => {
  // Use a visible fill and a clear stroke
  const r = this.add.rectangle(s.x, s.y, s.w, s.h, 0x64748b, 0.35); // slate w/ 35% alpha
  r.setStrokeStyle(2, 0x0f172a, 0.9);
  r.setDepth(5); // make sure it sits above the grid background
  this.physics.add.existing(r, true); // static body
  walls.add(r as any);
});

this.physics.add.collider(this.player, walls);


this.player.setCollideWorldBounds(true);
// tighter hitbox for nicer collisions
this.player.setSize(18, 28).setOffset(7, 16);

// Animations: rows = down, left, right, up (3 frames each)
this.anims.create({
  key: "walk-down",
  frames: [{ key: "player", frame: 0 }, { key: "player", frame: 1 }, { key: "player", frame: 2 }],
  frameRate: 8,
  repeat: -1,
});
this.anims.create({
  key: "walk-left",
  frames: [{ key: "player", frame: 3 }, { key: "player", frame: 4 }, { key: "player", frame: 5 }],
  frameRate: 8,
  repeat: -1,
});
this.anims.create({
  key: "walk-right",
  frames: [{ key: "player", frame: 6 }, { key: "player", frame: 7 }, { key: "player", frame: 8 }],
  frameRate: 8,
  repeat: -1,
});
this.anims.create({
  key: "walk-up",
  frames: [{ key: "player", frame: 9 }, { key: "player", frame: 10 }, { key: "player", frame: 11 }],
  frameRate: 8,
  repeat: -1,
});
this.input.keyboard!.on("keydown-P", () => {
  (window as any).ALGMON_TOGGLE_HELP?.();
});



// idle frames by direction (first frame of each row)
const idleFrame = { down: 1, left: 4, right: 7, up: 10 }; // middle frame looks best
this.player.setFrame(idleFrame.down);




        // World bounds + camera
        this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
        this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // Controls
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.keys = this.input.keyboard!.addKeys("W,A,S,D,SPACE,E") as any;

        // UI hint
        this.add.text(16, 12, `SPACE: Study • E: Gym • F: Professor
`, {
          fontFamily: "monospace", fontSize: "12px", color: "#334155"
        }).setScrollFactor(0).setDepth(1000);

        // ----- Draw Gyms -----
        this.gymsGroup = this.add.container(0, 0);
        for (const gym of GYMS) {
          const rect = this.add.rectangle(gym.x, gym.y, 80, 60, gym.color ?? 0x0ea5e9, 1);
          rect.setStrokeStyle(2, 0x0f172a, 1);
          const label = this.add.text(gym.x - 36, gym.y - 40, gym.name, {
            fontFamily: "monospace", fontSize: "12px", color: "#0f172a"
          });
          this.gymsGroup.add(rect);
          this.gymsGroup.add(label);
        }

        // ----- Professor NPC (press F) -----
const prof = this.add.rectangle(460, 300, 18, 26, 0x9333ea, 1);
prof.setStrokeStyle(2, 0x4c1d95, 1);
this.add.text(442, 278, "Prof", {
  fontFamily: "monospace",
  fontSize: "10px",
  color: "#0f172a"
});

// Press F near professor = guaranteed Unit 1 question
this.input.keyboard!.on("keydown-F", async () => {
  const dist = Math.hypot(this.player.x - prof.x, this.player.y - prof.y);
  if (dist > 50) return; // must stand close

  try {
    const all = await loadTSV(QUESTIONS_TSV);
    if (!all?.length) return alert("No questions loaded");

    const pool = all.filter(r => getUnitNormFromRow(r) === "1");
    if (!pool.length) return alert("Need Unit 1 questions first!");

    const q = pool[Math.floor(Math.random() * pool.length)];
    (window as any).__lastQ = q;
    (window as any).ALGMON_SHOW_Q?.(q);
  } catch (e) {
    console.error(e);
    alert("Professor error — check console");
  }
});

this.input.keyboard!.on("keydown-M", () => {
  (window as any).ALGMON_TOGGLE_MINIMAP?.();
});


        // ----- Tall Grass Zones (auto-encounter) -----
const grassColor = 0x16a34a;
const grassAlpha = 0.15;
const grassZones = this.add.container(0, 0);

// ----- Tutor Station (press T) -----
const tutor = this.add.rectangle(420, 260, 24, 24, 0x2563eb, 1);
tutor.setStrokeStyle(2, 0x0f172a, 1);
this.add.text(404, 238, "Tutor", { fontFamily: "monospace", fontSize: "10px", color: "#0f172a" });

this.input.keyboard!.on("keydown-T", async () => {
  // near the tutor station?
  const nearTutor = Math.hypot(this.player.x - tutor.x, this.player.y - tutor.y) < 50;

  // also check: are we near a gym? (so tutor can be unit-specific)
  let nearGymUnit: string | null = null;
  for (const gym of GYMS) {
    const d = Math.hypot(this.player.x - gym.x, this.player.y - gym.y);
    if (d < 80) { nearGymUnit = gym.unit; break; }
  }

  if (!nearTutor && !nearGymUnit) {
    return alert("Find a Tutor station or stand near a Gym for targeted tips (press T).");
  }

  try {
    const all = await loadTSV(QUESTIONS_TSV);
    if (!all?.length) return alert("No questions loaded.");

    const pool = nearGymUnit
      ? all.filter(r => getUnitNormFromRow(r) === nearGymUnit)
      : all;

    if (!pool.length) {
      return alert(nearGymUnit
        ? `No questions found for Unit ${nearGymUnit} yet.`
        : "No questions available.");
    }

    const row = pool[Math.floor(Math.random() * pool.length)];
    (window as any).__lastQ = row;

    const explanation =
      (row.explanation ?? row.hint ?? row.worked_solution ?? "").toString().trim();

    if (explanation) {
      alert(
        (nearGymUnit ? `Tutor Tip (Unit ${nearGymUnit}):\n` : "Tutor Tip:\n") +
        explanation
      );
    } else {
      const stem = (row.question ?? "").toString();
      const fallback =
        stem.includes("=")
          ? "Step plan: (1) Undo addition/subtraction, (2) Undo multiplication/division, (3) Check."
          : "Look for slope & intercept or combine like terms first.";
      alert((nearGymUnit ? `Tutor Tip (Unit ${nearGymUnit}):\n` : "Tutor Tip:\n") + fallback);
    }
  } catch (e) {
    console.error("tutor error", e);
    alert("Tutor unavailable (check console).");
  }
});

// make a few patches
const patches = [
  { x: 300, y: 500, w: 220, h: 160 },
  { x: 1100, y: 250, w: 260, h: 200 },
  { x: 1500, y: 1000, w: 320, h: 220 },
];
for (const p of patches) {
  const r = this.add.rectangle(p.x, p.y, p.w, p.h, grassColor, grassAlpha);
  r.setStrokeStyle(1, 0x065f46, 0.8);
  grassZones.add(r);
}

// physics bodies to detect overlap
this.physics.add.existing(grassZones);
(grassZones.list as Phaser.GameObjects.Rectangle[]).forEach(rect => {
  this.physics.add.existing(rect, true);
});

// encounter tick (small chance per second while inside)
let encounterCooldown = 0;
this.time.addEvent({
  delay: 400, loop: true, callback: async () => {
    if ((window as any).__BOSS_LOCK) return;
    if (!this.player.body) return;

    const inGrass = (grassZones.list as Phaser.GameObjects.Rectangle[]).some(r => {
      const dx = Math.abs(this.player.x - r.x);
      const dy = Math.abs(this.player.y - r.y);
      return dx < r.width / 2 && dy < r.height / 2;
    });

    if (!inGrass) { encounterCooldown = 0; return; }
    if (encounterCooldown > 0) { encounterCooldown -= 1; return; }

    // ~15% chance each tick while moving
    const moving = Math.hypot(this.player.body.velocity.x, this.player.body.velocity.y) > 5;
    if (moving && Math.random() < 0.15) {
      encounterCooldown = 5; // brief cooldown
      try {
        const rows = await loadTSV(QUESTIONS_TSV);
        if (!rows?.length) return;
        const q = rows[Math.floor(Math.random() * rows.length)];
        (window as any).__lastQ = q;
        (window as any).ALGMON_SHOW_Q?.(q);
      } catch (e) {
        console.error("encounter load error", e);
      }
    }
  }
});


        // Study: SPACE → random question
this.input.keyboard!.on("keydown-SPACE", async () => {
  if ((window as any).__BOSS_LOCK) return; // blocked during boss
  try {
    console.log("[SPACE] Loading questions from", QUESTIONS_TSV);
    const rows = await loadTSV(QUESTIONS_TSV);
    console.log("[SPACE] Loaded rows:", rows?.length);

    if (!rows || rows.length === 0) {
      alert("No questions loaded. Check your QUESTIONS_TSV URL in src/config.ts");
      // Fallback sample so you can keep testing:
      const sample = {
        question: "Solve: 2x + 5 = 17",
        answer: "6",
        distractors: "7|5|4",
        unit_id: "1",
        standard: "A.REI.3",
      };
      (window as any).__lastQ = sample;
      (window as any).ALGMON_SHOW_Q?.(sample);
      return;
    }

    const q = rows[Math.floor(Math.random() * rows.length)];
    (window as any).__lastQ = q;
    (window as any).ALGMON_SHOW_Q?.(q);
  } catch (e) {
    console.error("Failed to load questions TSV:", e);
    alert("Could not load questions (see console). Using a sample instead.");
    const sample = {
      question: "Solve: 2x + 5 = 17",
      answer: "6",
      distractors: "7|5|4",
      unit_id: "1",
      standard: "A.REI.3",
    };
    (window as any).__lastQ = sample;
    (window as any).ALGMON_SHOW_Q?.(sample);
  }
});


        // Enter Gym: E when near
        this.input.keyboard!.on("keydown-E", () => {
          if ((window as any).__BOSS_LOCK) return;
          const near = (window as any).__NEAR_GYM_UNIT as string | null;
          if (near) (window as any).ALGMON_TRY_GYM?.(near);
        });
      }

      update() {
        // Movement
       const speed = 180;
let vx = 0, vy = 0;
let playing = false;

// horizontal
if (this.cursors.left?.isDown || this.keys["A"].isDown) {
  vx = -speed;
  this.player.anims.play("walk-left", true);
  this.lastDir = "left";
  playing = true;
} else if (this.cursors.right?.isDown || this.keys["D"].isDown) {
  vx = speed;
  this.player.anims.play("walk-right", true);
  this.lastDir = "right";
  playing = true;
}

// vertical
if (this.cursors.up?.isDown || this.keys["W"].isDown) {
  vy = -speed;
  this.player.anims.play("walk-up", true);
  this.lastDir = "up";
  playing = true;
} else if (this.cursors.down?.isDown || this.keys["S"].isDown) {
  vy = speed;
  this.player.anims.play("walk-down", true);
  this.lastDir = "down";
  playing = true;
}

this.player.setVelocity(vx, vy);

// idle (face last direction)
if (!playing) {
  this.player.anims.stop();
  const idleFrame = { down: 1, left: 4, right: 7, up: 10 } as const;
  this.player.setFrame(idleFrame[this.lastDir]);
}

// expose player pos for React minimap
(window as any).__PLAYER_POS = { x: this.player.x, y: this.player.y };


        // Proximity to nearest gym
        let found: GymCfg | null = null;
        for (const gym of GYMS) {
          const dx = this.player.x - gym.x;
          const dy = this.player.y - gym.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 70) { found = gym; break; }
        }
        if (found) {
          (window as any).__NEAR_GYM_UNIT = found.unit;
          (window as any).ALGMON_SET_PROMPT?.(`Press E to challenge ${found.name}`);
        } else {
          (window as any).__NEAR_GYM_UNIT = null;
          (window as any).ALGMON_SET_PROMPT?.("");
        }
      }
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 960,
      height: 600,
      parent: mountRef.current,
      physics: { default: "arcade" },
      scene: [GameScene],
      backgroundColor: "#f1f5f9",
    });

    // Bridges: Phaser → React
    (window as any).ALGMON_TOGGLE_HELP = () => setShowHelp(v => !v);
    (window as any).ALGMON_TOGGLE_MINIMAP = () => setShowMap(v => !v);
    (window as any).ALGMON_SHOW_Q = (q: QuestionRow) => { setQRow(q); setQOpen(true); };
    (window as any).ALGMON_SET_PROMPT = (s: string) => { setNearGymText(s); };
    (window as any).ALGMON_TRY_GYM = async (unit: string) => {
      if (!auth.currentUser) return;

      // mastery check for that unit
  const qRef = query(
  collection(db, "game_logs"),
  where("uid", "==", auth.currentUser.uid),
  where("unitNorm", "==", unit),  // ✅ compare normalized unit
  where("correct", "==", true),
  orderBy("ts", "desc"),
  limit(1000)
);
console.log("[GYM] checking mastery for unit", unit);
      const snap = await getDocs(qRef);
      const correctCount = snap.size;
      const cfg = GYMS.find(g => g.unit === unit)!;

      if (correctCount < cfg.threshold) {
        alert(`You need ${cfg.threshold} correct for Unit ${unit}. You have ${correctCount}.`);
        return;
      }

      // start boss
      (window as any).__BOSS_LOCK = true;
      setBossUnit(unit);
      setBossActive(true);
      setBossCorrect(0);
      setBossIndex(0);

      const all = await loadTSV(QUESTIONS_TSV);
      const pool = all.filter(r => getUnitNormFromRow(r) === unit);
      if (pool.length < BOSS_QUESTIONS) {
        alert(`Not enough Unit ${unit} questions. Found ${pool.length}.`);
        (window as any).__BOSS_LOCK = false;
        setBossActive(false);
        setBossUnit(null);
        return;
      }
      shuffle(pool);
      const queue = pool.slice(0, BOSS_QUESTIONS);
      setBossQueue(queue);
      (window as any).ALGMON_SHOW_Q(queue[0]);
    };

    return () => {
      (window as any).ALGMON_SHOW_Q = undefined;
      (window as any).ALGMON_SET_PROMPT = undefined;
      (window as any).ALGMON_TRY_GYM = undefined;
      (window as any).__NEAR_GYM_UNIT = null;
      (window as any).__BOSS_LOCK = false;
      game.destroy(true);
    };
  }, [ready]);

  // --------- HANDLE ANSWER PICK (normal or boss) ----------
  async function handlePick(choice: string) {
    if (!qRow) return;
    const ok = String(choice).trim() === String(qRow.answer).trim();
    const wasBoss = bossActive;
    const currentBossUnit = bossUnit;

    setQOpen(false);

    
    // Normal study feedback (XP message will be shown below after we compute the bonus)
if (!wasBoss && !ok) {
  alert(`Try again. Answer: ${qRow.answer}`);
}


// Log attempt — writes unitNorm
try {
  const u = auth.currentUser;
  if (u) {
    const uNorm = getUnitNormFromRow(qRow);
    console.log("[LOG attempt]", {
      rawUnit: qRow?.unit_id ?? qRow?.unit,
      unitNorm: uNorm,
      correct: ok,
    });

    await addDoc(collection(db, "game_logs"), {
      uid: u.uid,
      qid: qRow.qid ?? null,
      unit: qRow.unit_id ?? null,
      unitNorm: uNorm,            // <-- this field MUST be here
      standard: qRow.standard ?? null,
      correct: ok,
      ts: Date.now(),
    });
  }
} catch (e) {
  console.error("log error", e);
}



    // XP on normal study
    // XP on normal study with starter-type bonus
if (!wasBoss && ok && profile && auth.currentUser) {
  try {
    const base = 10;
    const qCat = inferCategory(qRow);
    const starterCat = profileStarterCategory(profile);
    const bonus = starterCat && starterCat === qCat ? 5 : 0;
    const delta = base + bonus;

    await grantXP(db, profile.uid, delta);
    const ref = doc(db, "profiles", profile.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const p = snap.data() as Profile;
      let leveled = false;
      let lvl = p.level, xp = p.xp + 0;

      while (xp >= xpNeeded(lvl)) { xp -= xpNeeded(lvl); lvl += 1; leveled = true; }

      if (leveled) {
        await updateDoc(ref, { level: lvl, xp, updatedAt: Date.now() });
        alert(`Level Up! 🎉 (+${delta} XP) You reached Lv.${lvl}${bonus ? " (type bonus 🟢)" : ""}`);
      } else {
        await updateDoc(ref, { xp, updatedAt: Date.now() });
        alert(`Correct! +${delta} XP${bonus ? " (type bonus 🟢)" : ""}`);
      }

      setProfile({ ...p, level: leveled ? lvl : p.level, xp: leveled ? xp : p.xp });
    }
  } catch (e) { console.error("xp error", e); }
}

    // Boss flow
    if (wasBoss && currentBossUnit) {
      const nextCorrect = ok ? bossCorrect + 1 : bossCorrect;
      const nextIndex = bossIndex + 1;

      // Log boss question attempt
      try {
        const u = auth.currentUser;
        if (u) {
          await addDoc(collection(db, "boss_attempts"), {
            uid: u.uid, unit: currentBossUnit, correct: ok, idx: nextIndex, ts: Date.now()
          });
        }
      } catch (e) { console.error("boss log error", e); }

      if (nextIndex < BOSS_QUESTIONS) {
        setBossCorrect(nextCorrect);
        setBossIndex(nextIndex);
        setTimeout(() => {
          setQRow(bossQueue[nextIndex]);
          setQOpen(true);
        }, 150);
      } else {
        // End boss
        const passed = nextCorrect >= BOSS_PASS;
        setBossActive(false);
        setBossUnit(null);
        (window as any).__BOSS_LOCK = false;

        alert(passed
          ? `Gym Cleared! 🏆 You got ${nextCorrect}/${BOSS_QUESTIONS}.`
          : `Gym Failed. You got ${nextCorrect}/${BOSS_QUESTIONS}. Train more and retry!`
        );

        // Award badge
        if (passed && profile && auth.currentUser) {
          try {
            const ref = doc(db, "profiles", profile.uid);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                const p = snap.data() as Profile;
                const badges: string[] = Array.isArray((p as any).badges) ? (p as any).badges : [];
                if (!badges.includes(currentBossUnit)) {
                  badges.push(currentBossUnit);
                  await updateDoc(ref, { badges, updatedAt: Date.now() });
                  setProfile({ ...(p as any), badges } as Profile);
                  alert(`You earned the Unit ${currentBossUnit} Badge! 🥇`);
                }
              }
          } catch (e) { console.error("badge error", e); }
        }
      }
    }
  }

  // --------- STARTER PICK ----------
  async function chooseStarter(s: { name: string; type?: string; spriteUrl?: string }) {
    if (!profile || !auth.currentUser) return;
    try {
      await setStarter(db, profile.uid, { name: s.name, type: s.type });
      setProfile({ ...profile, starter: { name: s.name, type: s.type } });
      setShowStarterPick(false);
      localStorage.setItem("algebramon_starter", JSON.stringify(s));
    } catch (e) { console.error("starter error", e); }
  }

  if (!ready) return <div style={{ padding: 20 }}>Loading…</div>;

  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;

  return (
    <>
      <div
        ref={mountRef}
        style={{
          width: 960,
          height: 600,
          margin: "20px auto",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 6px 16px rgba(0,0,0,.15)",
          position: "relative",
        }}
      />
      {/* HUD */}
      <HUD
        starterName={profile?.starter?.name || "Trainer"}
        level={level}
        xp={xp}
        next={xpNeeded(level)}
      />

      {/* Badge strip */}
{Array.isArray(profile?.badges) && profile!.badges.length > 0 && (
  <div style={{
    maxWidth: 960, margin: "8px auto 0", padding: "6px 10px",
    display: "flex", gap: 8, flexWrap: "wrap",
    fontFamily: "monospace", fontSize: 12, color: "#0f172a"
  }}>
    <div style={{ opacity: .7, marginRight: 6 }}>Badges:</div>
    {profile!.badges
      .slice()
      .sort((a: string, b: string) => Number(a) - Number(b))
      .map((u: string) => (
        <div key={u} style={{
          background: "#f59e0b", color: "#1f2937",
          border: "1px solid #b45309", borderRadius: 8,
          padding: "2px 8px"
        }}>
          Unit {u}
        </div>
      ))}
  </div>
)}

{/* Pause / Help Overlay */}
{showHelp && (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
    display: "grid", placeItems: "center", zIndex: 1400
  }}>
    <div style={{
      width: 520, maxWidth: "90vw",
      background: "#0f172a", color: "#fff",
      borderRadius: 12, padding: 18, boxShadow: "0 10px 30px rgba(0,0,0,.35)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Pause / Help</h3>
        <button onClick={() => setShowHelp(false)} style={{
          border: "1px solid #475569", background: "#1f2937",
          color: "#fff", padding: "4px 10px", borderRadius: 8, cursor: "pointer"
        }}>Close (P)</button>
      </div>

      <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5 }}>
        <div><b>Move:</b> Arrow Keys or WASD</div>
        <div><b>Study:</b> SPACE</div>
        <div><b>Challenge Gym:</b> E (stand near Gym)</div>
        <div><b>Tutor Tip:</b> T (Tutor station or near a Gym)</div>
        <div><b>Pause:</b> P</div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => { setShowHelp(false); }}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #475569", background: "#111827", color: "#fff" }}>
          Resume
        </button>
        <button onClick={async () => {
          try { await auth.signOut(); window.location.href = "/login"; } catch (e) { console.error(e); }
        }}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ef4444", background: "#7f1d1d", color: "#fff" }}>
          Logout
        </button>
      </div>
    </div>
  </div>
)}

      {/* Boss Progress HUD */}
{bossActive && (
  <div style={{
    position: "fixed", top: 20, right: 20, zIndex: 1200,
    background: "rgba(0,0,0,.8)", color: "#fff",
    padding: "10px 12px", borderRadius: 10, minWidth: 180
  }}>
    <div style={{ fontWeight: 700, marginBottom: 6 }}>
      {`Gym Battle — Unit ${bossUnit}`}
    </div>
    <div style={{ fontSize: 13, opacity: .9 }}>
      {`Question ${bossIndex + 1} of ${BOSS_QUESTIONS}`}
    </div>
    <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
      {Array.from({ length: BOSS_QUESTIONS }).map((_, i) => {
        const filled = i < bossIndex;
        const correct = i < bossCorrect;
        const bg = correct ? "#16a34a" : (filled ? "#dc2626" : "#1f2937");
        return <div key={i} style={{ width: 16, height: 16, borderRadius: 4, background: bg }} />;
      })}
    </div>
    <div style={{ marginTop: 8, fontSize: 12, opacity: .8 }}>
      Need {BOSS_PASS} correct to win
    </div>
  </div>
)}


      {/* Bottom prompt when near a gym */}
      {nearGymText && (
        <div style={{
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,.85)",
          color: "#fff",
          padding: "8px 12px",
          borderRadius: 999,
          fontSize: 14,
          zIndex: 1000,
        }}>
          {nearGymText}
        </div>
      )}
      {/* Modals */}
      <StarterPick open={showStarterPick} starters={starterList} onChoose={chooseStarter} />
      <Battle open={qOpen} question={qRow as any} onPick={handlePick} onClose={() => setQOpen(false)} />
      
      {showMap && (
  <div style={{
    position: "fixed", right: 16, top: 16, zIndex: 1400,
    background: "rgba(15,23,42,.9)", color: "#fff",
    border: "1px solid #334155", borderRadius: 10, padding: 10
  }}>
    <div style={{ fontFamily: "monospace", fontSize: 12, marginBottom: 6, opacity: .9 }}>
      Mini-Map (press M)
    </div>
    {/* Mini-map sized view */}
    <svg width={220} height={170} viewBox="0 0 220 170" style={{ display: "block" }}>
      {/* background */}
      <rect x="0" y="0" width="220" height="170" fill="#0b1220" stroke="#1f2937" />
      {/* gyms */}
      {GYMS.map(g => {
        const sx = 220 / 2000, sy = 170 / 1500;
        const gx = g.x * sx, gy = g.y * sy;
        return (
          <g key={g.unit}>
            <rect x={gx - 4} y={gy - 3} width={8} height={6}
                  fill="#22c55e" stroke="#052e16" />
          </g>
        );
      })}
      {/* player */}
      {(() => {
        const sx = 220 / 2000, sy = 170 / 1500;
        const px = pPos.x * sx, py = pPos.y * sy;
        return <circle cx={px} cy={py} r={3.5} fill="#60a5fa" stroke="#1e40af" />;
      })()}
    </svg>

    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
      <button onClick={() => setShowMap(false)}
        style={{ border: "1px solid #475569", background: "#111827",
                 color: "#fff", padding: "4px 8px", borderRadius: 6, cursor: "pointer" }}>
        Close
      </button>
    </div>
  </div>
)}


    </>
  );
}

// ---------- Utils ----------
// ---------- Category Helpers (for XP bonus) ----------
type QCategory = "graphing" | "tables" | "algebraic";

// Infer question category from standard / text
function inferCategory(row: any): QCategory {
  const q = (row?.question || "").toLowerCase();
  const std = (row?.standard || "").toUpperCase();

  // Standards first (tweak anytime)
  if (/(F-IF|F-LE|RATE|SLOPE|INTERCEPT|GRAPH)/.test(std)) return "graphing";
  if (/(TABLE|MAPPING|VALUES|F-IF\.1)/.test(std)) return "tables";
  if (/(A-REI|SOLVE|SIMPLIFY|EQUATION|A-CED|A-SSE|A-APR)/.test(std)) return "algebraic";

  // Text fallbacks
  if (q.includes("table") || q.includes("mapping") || q.includes("values")) return "tables";
  if (q.includes("graph") || q.includes("slope") || q.includes("intercept")) return "graphing";
  return "algebraic";
}

// Map starter.type to a category
function profileStarterCategory(p?: Profile | null): QCategory | null {
  const t = p?.starter?.type?.toLowerCase() || "";
  if (t.includes("graph")) return "graphing";
  if (t.includes("table")) return "tables";
  if (t.includes("algebra")) return "algebraic";
  return null;
}

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

function unitNorm(val: any): string {
  const s = String(val ?? "").toLowerCase();
  const m = s.match(/\d+/);
  return m ? String(Number(m[0])) : "";
}

function getUnitNormFromRow(row: any): string {
  // try several possible column names just in case the sheet header changes
  const candidates = [row?.unit_id, row?.unit, row?.Unit, row?.unitId];
  for (const v of candidates) {
    const m = String(v ?? "").toLowerCase().match(/\d+/);
    if (m) return String(Number(m[0])); // "01" -> "1"
  }
  return "";
}
