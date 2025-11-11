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
import BootScene from "./scenes/BootScene";
import PreloadScene from "./scenes/PreloadScene";
import LoadingScene from "./scenes/LoadingScene";
import WorldScene from "./scenes/WorldScene";
import UIScene from "./scenes/UIScene";
import BattleScene from "./scenes/BattleScene";
import QuizScene from "./scenes/QuizScene";
import GymScene from "./scenes/GymScene";
import ProfessorScene from "./scenes/ProfessorScene";
import Battle from "./components/Battle";
import StarterPick from "./components/StarterPick";
import HUD from "./components/HUD";
import {
  loadProfile, createProfile, setStarter, grantXP, xpNeeded
} from "./lib/profiles";
import type { Profile } from "./lib/profiles";
import { GYMS } from "./data/gyms";
import {
  getUnitNormFromRow,
  inferCategory,
  profileStarterCategory,
  shuffle
} from "./lib/questionUtils";
import { WORLD_BOUNDS, ROAD_SEGMENTS, WATER_ZONES, FOREST_ZONES, BUILDINGS } from "./config/world";

// Boss settings
const BOSS_QUESTIONS = 5;
const BOSS_PASS = 4;
const MAX_STAMINA = 10;



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
  const [stamina, setStamina] = useState(() => {
    const stored = Number(localStorage.getItem("algebramon_stamina"));
    return Number.isFinite(stored) && stored > 0 ? stored : MAX_STAMINA;
  });
  const [bossMisses, setBossMisses] = useState(0);
  const [showStaminaHint, setShowStaminaHint] = useState(false);
  const staminaRef = useRef(stamina);

  // UI / Settings state (React land)
const [muted] = useState<boolean>(() => {
  // lazy init from localStorage
  return localStorage.getItem("algebramon_muted") === "1";
});
const [musicVol] = useState<number>(() => {
  const v = Number(localStorage.getItem("algebramon_musicVol"));
  return isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.6;
});
const [showMap, setShowMap] = useState(false);

const MINI_MAP_WIDTH = 220;
const MINI_MAP_HEIGHT = 170;
const mapScaleX = MINI_MAP_WIDTH / WORLD_BOUNDS.width;
const mapScaleY = MINI_MAP_HEIGHT / WORLD_BOUNDS.height;
const projectMiniRect = (rect: { x: number; y: number; w: number; h: number }) => ({
  x: (rect.x - rect.w / 2) * mapScaleX,
  y: (rect.y - rect.h / 2) * mapScaleY,
  width: rect.w * mapScaleX,
  height: rect.h * mapScaleY
});

// persist & push to Phaser when map visibility changes
useEffect(() => {
  localStorage.setItem("algebramon_showMap", showMap ? "1" : "0");
  (window as any).ALGMON_SET_MINIMAP_VISIBLE?.(showMap);
}, [showMap]);

// on first mount, hydrate showMap from localStorage
useEffect(() => {
  const initial = localStorage.getItem("algebramon_showMap");
  if (initial === "1") setShowMap(true);
}, []);

useEffect(() => {
  localStorage.setItem("algebramon_stamina", String(stamina));
  staminaRef.current = stamina;
}, [stamina]);

useEffect(() => {
  if (stamina >= MAX_STAMINA) {
    setShowStaminaHint(false);
    return;
  }
  setShowStaminaHint(stamina < MAX_STAMINA);
  const t = window.setTimeout(() => setShowStaminaHint(false), 3000);
  return () => window.clearTimeout(t);
}, [stamina]);

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

    (window as any).__AUDIO_PREFS__ = { muted, musicVol };
    (window as any).__MAP_PREFS__ = { showMap };

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 960,
      height: 600,
      parent: mountRef.current,
      physics: { default: "arcade" },
      scene: [
        BootScene,
        PreloadScene,
        LoadingScene,
        WorldScene,
        UIScene,
        BattleScene,
        QuizScene,
        GymScene,
        ProfessorScene
      ],
      backgroundColor: "#f1f5f9",
      audio: { disableWebAudio: false, noAudio: false }
    });

    (window as any).ALGMON_TOGGLE_HELP = () => setShowHelp((v) => !v);
    (window as any).ALGMON_SHOW_Q = (q: QuestionRow) => { setQRow(q); setQOpen(true); };
    (window as any).ALGMON_SET_SLOWDOWN = (active: boolean) => {
      (window as any).__PLAYER_SLOW = active;
    };
    (window as any).ALGMON_SET_PROMPT = (s: string) => { setNearGymText(s); };

    const toggleMinimap = (next?: boolean) => {
      const current = (window as any).__MAP_PREFS__?.showMap ?? false;
      const value = typeof next === "boolean" ? next : !current;
      (window as any).__MAP_PREFS__ = { showMap: value };
      setShowMap(value);
    };

    (window as any).ALGMON_TOGGLE_MINIMAP = () => toggleMinimap();
    (window as any).ALGMON_SET_MINIMAP_VISIBLE = (vis: boolean) => toggleMinimap(vis);

    (window as any).ALGMON_AUDIO_APPLY = (opts: { muted?: boolean; musicVol?: number }) => {
      const scene = game.scene.getScene("WorldScene") as any;
      if (!scene || !scene.sound) return;
      if (typeof opts.muted === "boolean") {
        scene.sound.mute = opts.muted;
        scene.__bgm__?.setMute(opts.muted);
      }
      if (typeof opts.musicVol === "number") {
        scene.__bgm__?.setVolume(Math.max(0, Math.min(1, opts.musicVol)));
      }
    };

    (window as any).ALGMON_TRY_GYM = async (unit: string) => {
      if (!auth.currentUser) return;
      const currentStamina = staminaRef.current;
      if (currentStamina <= 0) {
        alert("You're out of stamina! Answer 5 study questions (SPACE) to refuel before attempting a gym.");
        return;
      }
      if (currentStamina < MAX_STAMINA) {
        const proceed = window.confirm(
          "Your stamina isn't full. Study (SPACE) to refill before a gym. Enter anyway?"
        );
        if (!proceed) return;
      }

      const qRef = query(
        collection(db, "game_logs"),
        where("uid", "==", auth.currentUser.uid),
        where("unitNorm", "==", unit),
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
//start boss
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
      setBossMisses(0);
      (window as any).ALGMON_SHOW_Q(queue[0]);
    };

    return () => {
      (window as any).ALGMON_SHOW_Q = undefined;
      (window as any).ALGMON_SET_PROMPT = undefined;
      (window as any).ALGMON_SET_SLOWDOWN = undefined;
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
    let newStamina = stamina;
    if (!ok) {
      (window as any).ALGMON_SET_SLOWDOWN?.(true);
      setTimeout(() => (window as any).ALGMON_SET_SLOWDOWN?.(false), 6000);
      newStamina = Math.max(0, stamina - 2);
      if (newStamina !== stamina) setStamina(newStamina);
      if (newStamina <= 0) {
        alert("You ran out of stamina! Study (press SPACE) and answer 5 questions correctly to refill.");
      }
    } else {
      newStamina = Math.min(MAX_STAMINA, stamina + 2);
      if (newStamina !== stamina) setStamina(newStamina);
    }
    const wasBoss = bossActive;
    const currentBossUnit = bossUnit;

    setQOpen(false);

    
    // Normal study feedback (XP message will be shown below after we compute the bonus)
if (!wasBoss && !ok) {
  alert(`Try again. Answer: ${qRow.answer}`);
  if (profile && auth.currentUser) {
    try {
      const ref = doc(db, "profiles", profile.uid);
      await updateDoc(ref, {
        xp: Math.max(0, (profile.xp ?? 0) - 2),
        updatedAt: Date.now()
      });
      setProfile((p) => (p ? { ...p, xp: Math.max(0, (p.xp ?? 0) - 2) } : p));
    } catch (err) {
      console.error("xp penalty error", err);
    }
  }
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
      const nextMisses = ok ? bossMisses : bossMisses + 1;
      setBossMisses(nextMisses);
      let failed = false;
      let failReason = "";
      if (!ok && nextMisses >= 3) {
        failed = true;
        failReason = "Too many incorrect answers (3 strikes). Study more and try again!";
      }
      if (!failed && newStamina <= 0) {
        failed = true;
        failReason = "You ran out of stamina during the gym battle. Study questions to refill before retrying.";
      }

      // Log boss question attempt
      try {
        const u = auth.currentUser;
        if (u) {
          await addDoc(collection(db, "boss_attempts"), {
            uid: u.uid, unit: currentBossUnit, correct: ok, idx: nextIndex, ts: Date.now()
          });
        }
      } catch (e) { console.error("boss log error", e); }

      if (failed) {
        if (newStamina !== 0) setStamina(0);
        setBossActive(false);
        setBossUnit(null);
        (window as any).__BOSS_LOCK = false;
        alert(failReason);
        return;
      }

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
        stamina={stamina}
        maxStamina={MAX_STAMINA}
      />

      <button
        onClick={() => setShowMap((v) => !v)}
        style={{
          position: "fixed",
          left: 20,
          bottom: 20,
          padding: "8px 14px",
          fontFamily: "monospace",
          fontSize: 12,
          borderRadius: 999,
          border: "1px solid #475569",
          background: "rgba(15,23,42,.9)",
          color: "#f1f5f9",
          cursor: "pointer",
          zIndex: 1350,
        }}
      >
        {showMap ? "Hide Map (M)" : "Show Map (M)"}
      </button>

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
    <div style={{ fontSize: 12, color: "#f87171", marginTop: 6 }}>
      {`Misses: ${bossMisses} / 3`}
    </div>
    <div style={{ fontSize: 12, color: "#38bdf8" }}>
      {`Stamina: ${stamina}/${MAX_STAMINA}`}
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
          {stamina < MAX_STAMINA && " • Stamina low! Study (SPACE) to refill before gyms."}
        </div>
      )}
      {showStaminaHint && (
        <div
          style={{
            position: "fixed",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15,23,42,0.95)",
            color: "#e2e8f0",
            padding: "10px 16px",
            borderRadius: 999,
            fontSize: 13,
            border: "1px solid rgba(148,163,184,.5)",
            zIndex: 1200,
          }}
        >
          Correct answers restore +2 stamina. Keep studying to stay battle-ready!
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
    <svg
      width={MINI_MAP_WIDTH}
      height={MINI_MAP_HEIGHT}
      viewBox={`0 0 ${MINI_MAP_WIDTH} ${MINI_MAP_HEIGHT}`}
      style={{ display: "block" }}
    >
      {/* background */}
      <rect x="0" y="0" width={MINI_MAP_WIDTH} height={MINI_MAP_HEIGHT} fill="#0b1220" stroke="#1f2937" />
      {ROAD_SEGMENTS.map((road, idx) => {
        const proj = projectMiniRect(road);
        return (
          <rect
            key={`road-${idx}`}
            x={proj.x}
            y={proj.y}
            width={proj.width}
            height={proj.height}
            fill={road.mapColor ?? "#b45309"}
            opacity={road.mapOpacity ?? 0.45}
          />
        );
      })}
      {FOREST_ZONES.map((zone, idx) => {
        const proj = projectMiniRect(zone);
        return (
          <rect
            key={`forest-${idx}`}
            x={proj.x}
            y={proj.y}
            width={proj.width}
            height={proj.height}
            fill={zone.mapColor ?? "#14532d"}
            opacity={zone.mapOpacity ?? 0.45}
          />
        );
      })}
      {WATER_ZONES.map((zone, idx) => {
        const proj = projectMiniRect(zone);
        return (
          <rect
            key={`water-${idx}`}
            x={proj.x}
            y={proj.y}
            width={proj.width}
            height={proj.height}
            fill={zone.mapColor ?? "#38bdf8"}
            opacity={zone.mapOpacity ?? 0.75}
          />
        );
      })}
      {BUILDINGS.map((building, idx) => {
        const proj = projectMiniRect(building);
        return (
          <rect
            key={`bldg-${idx}`}
            x={proj.x}
            y={proj.y}
            width={proj.width}
            height={proj.height}
            fill={building.mapColor ?? "#94a3b8"}
            opacity={0.85}
            stroke="#0f172a"
            strokeWidth={0.3}
          />
        );
      })}
      {GYMS.map((g) => {
        const gx = g.x * mapScaleX;
        const gy = g.y * mapScaleY;
        return (
          <rect
            key={`gym-${g.unit}`}
            x={gx - 4}
            y={gy - 3}
            width={8}
            height={6}
            fill="#22c55e"
            stroke="#052e16"
          />
        );
      })}
      <circle cx={pPos.x * mapScaleX} cy={pPos.y * mapScaleY} r={3.5} fill="#60a5fa" stroke="#1e40af" />
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
