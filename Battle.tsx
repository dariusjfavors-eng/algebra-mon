// src/components/Battle.tsx
import { useEffect, useMemo, useState } from "react";
import type { QuestionRow } from "../lib/sheetLoader";

type BattleMeta = {
  title?: string;
  subtitle?: string;
  badges?: { label: string; value: string }[];
  highlight?: string;
};

type BattleFx = {
  key: number;
  type: "player-adv" | "npc-correct" | "npc-miss";
};

type Props = {
  open: boolean;
  question?: QuestionRow;
  onPick: (choice: string) => void;
  onClose: () => void;
  meta?: BattleMeta;
  fx?: BattleFx | null;
};

/* -------------------------- Helpers (sanitizers) -------------------------- */

function cleanRaw(s: any) {
  return String(s ?? "")
    .replace(/\u00A0/g, " ") // non-breaking spaces
    // strip leading/trailing quotes/backticks/curly/smart quotes + spaces
    .replace(/^[\s"'\u201C\u201D\u2018\u2019`]+|[\s"'\u201C\u201D\u2018\u2019`]+$/g, "")
    .trim();
}


// For display + matching: remove wrappers like [], {}, (), «», and extra quotes/backticks
function sanitizeChoiceText(s: string) {
  let t = cleanRaw(s);

  // If it's a JSON array like ["3","5","6"], flatten it to "3, 5, 6"
  if (/^\s*\[.*\]\s*$/.test(t)) {
    try {
      const arr = JSON.parse(t);
      if (Array.isArray(arr)) {
        t = arr.map((x) => cleanRaw(String(x))).join(", ");
      }
    } catch {
      // not valid JSON—fall through
    }
  }

  // Strip ONE layer of common wrappers: [] {} () <> «»
  t = t.replace(/^\s*[\[\{\(\<«]+/, "").replace(/[\]\}\)\>»]+\s*$/, "");

  // Strip surrounding quotes again (in case wrappers removed revealed quotes)
  t = t.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");

  // Remove stray backticks
  t = t.replace(/`/g, "");

  // Collapse multiple spaces
  t = t.replace(/\s{2,}/g, " ").trim();

  return t;
}

// Split a single list cell into items: supports | ; , / · and 2+ spaces; also JSON arrays
function splitList(s: string) {
  const t = cleanRaw(s);

  // JSON array? (e.g., ["3","5","6"])
  if (/^\s*\[.*\]\s*$/.test(t)) {
    try {
      const arr = JSON.parse(t);
      if (Array.isArray(arr)) {
        return arr.map((x) => sanitizeChoiceText(String(x))).filter(Boolean);
      }
    } catch {}
  }

  return t
    .split(/\s*\|\s*|\s*;\s*|\s*,\s*|\s*\/\s*|\s*·\s*|\s{2,}/g)
    .map(sanitizeChoiceText)
    .filter(Boolean);
}

/* -------------------------- Choice extraction ----------------------------- */

const LETTER_IDX: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
const isLetter = (s: string) => /^[A-D]$/i.test(s);

// Detect A/B/C/D or choice_a..d or option1..4 columns
function extractPerChoice(row: any) {
  const keys = Object.keys(row || {});
  const buckets: Record<number, string> = {};

  for (const k of keys) {
    const v = sanitizeChoiceText((row as any)[k]);
    if (!v) continue;

    const lk = k.toLowerCase();
    let idx = -1;

    // exact A/B/C/D
    if (lk === "a" || lk === "b" || lk === "c" || lk === "d") {
      idx = LETTER_IDX[lk];
    }
    // choice_a / choice-a / choiceA
    else if (/^choice[\s_\-]*[abcd]$/.test(lk)) {
      idx = LETTER_IDX[lk.slice(-1)];
    }
    // option1..4 / opt1..4
    else if (/^(option|opt)[\s_\-]*([1-4])$/.test(lk)) {
      idx = parseInt(lk.match(/([1-4])$/)![1], 10) - 1;
    }
    // choice1..4
    else if (/^choice[\s_\-]*([1-4])$/.test(lk)) {
      idx = parseInt(lk.match(/([1-4])$/)![1], 10) - 1;
    }

    if (idx >= 0 && idx <= 3) buckets[idx] = v;
  }

  const arr = [buckets[0], buckets[1], buckets[2], buckets[3]].filter(
    (x): x is string => !!x
  );
  return arr;
}

// Gentle cleaner for question text: only trim + normalize spaces and quotes.
// Do NOT strip brackets/braces, etc. (those can be part of math!)
function sanitizeQuestionText(s: any) {
  return String(s ?? "")
    .replace(/\u00A0/g, " ") // non-breaking spaces
    // strip only *outer* straight/smart quotes/backticks if they wrap the whole string
    .replace(/^[\s"'\u201C\u201D\u2018\u2019`]+|[\s"'\u201C\u201D\u2018\u2019`]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeImageUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  // Google Drive share links → direct view
  const driveFileMatch = trimmed.match(/https:\/\/drive\.google\.com\/file\/d\/([^/]+)\//);
  if (driveFileMatch?.[1]) {
    return `https://drive.google.com/uc?export=view&id=${driveFileMatch[1]}`;
  }
  const driveOpenMatch = trimmed.match(/https:\/\/drive\.google\.com\/open\?id=([^&]+)/);
  if (driveOpenMatch?.[1]) {
    return `https://drive.google.com/uc?export=view&id=${driveOpenMatch[1]}`;
  }
  const driveIdMatch = trimmed.match(/https:\/\/drive\.google\.com\/uc\?id=([^&]+)/);
  if (driveIdMatch?.[1]) {
    return `https://drive.google.com/uc?export=view&id=${driveIdMatch[1]}`;
  }
  return trimmed;
}

function extractImageUrl(row: any): string {
  if (!row) return "";
  const direct =
    row?.image_url ??
    row?.image ??
    row?.img ??
    row?.Image ??
    row?.ImageURL ??
    row?.imageUrl ??
    "";
  const fromKey =
    direct ||
    (() => {
      const key = Object.keys(row).find((k) => /image/.test(k.toLowerCase()));
      return key ? row[key] : "";
    })();
  let parsed = String(fromKey ?? "")
    .replace(/\u00A0/g, " ")
    .trim()
    .replace(/^["']+|["']+$/g, "");

  const imageFormula = parsed.match(/^=+image\((.+)\)/i);
  if (imageFormula?.[1]) {
    const inner = imageFormula[1].split(",")[0]?.trim();
    const quoted = inner.replace(/^["']+|["']+$/g, "");
    parsed = quoted || parsed;
  }

  const hyperlinkFormula = parsed.match(/^=+hyperlink\((.+)\)/i);
  if (hyperlinkFormula?.[1]) {
    const inner = hyperlinkFormula[1].split(",")[0]?.trim();
    const quoted = inner.replace(/^["']+|["']+$/g, "");
    parsed = quoted || parsed;
  }

  return normalizeImageUrl(parsed);
}

// Build final question+choices, with dedupe, sanitize, and shuffle
function buildChoices(row: any) {
  const questionText =
  sanitizeQuestionText(
    row?.question ??
    row?.question_text ??
    row?.QuestionText ??
    row?.Question ??
    row?.text ??
    row?.prompt ??
    row?.stem
  ) || "Solve:";


  const perChoice = extractPerChoice(row);
  const answerRaw = sanitizeChoiceText(row?.answer);
  const letterAns = isLetter(answerRaw);

  let choices: string[] = [];

  if (perChoice.length >= 2) {
    choices = perChoice.slice();
  } else {
    // Fallback to single list field
    const listField =
      row?.distractors ?? row?.options ?? row?.choices ?? row?.incorrect ?? "";
    const list = splitList(String(listField));
    choices = list.slice();
  }

  // Map letter answer (A-D) to text if we have per-choice columns
  let correctText = answerRaw;
  if (letterAns && perChoice.length >= 2) {
    const idx = LETTER_IDX[answerRaw.toLowerCase()];
    if (idx >= 0 && idx < perChoice.length) {
      correctText = sanitizeChoiceText(perChoice[idx]);
    }
  }

  // If answer is text and not present, inject it
  if (!letterAns && correctText) {
    const present = choices.some(
      (c) => c.toLowerCase() === correctText.toLowerCase()
    );
    if (!present) choices.unshift(correctText);
  }

  // Final sanitize + dedupe + cap to 4
  const seen = new Set<string>();
  choices = choices
    .map(sanitizeChoiceText)
    .filter(Boolean)
    .filter((c) => {
      const key = c.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);

  // If too few, pad with generic distractors (non-answers)
  const pads = ["(none of these)", "(all of these)", "(can't tell)"];
  for (const p of pads) {
    if (choices.length >= 4) break;
    const key = p.toLowerCase();
    if (!seen.has(key)) {
      choices.push(p);
      seen.add(key);
    }
  }

  // Shuffle
  const shuffled = choices.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Where is the correct text after shuffling?
  const correctIndex = shuffled.findIndex(
    (c) => c.toLowerCase() === correctText.toLowerCase()
  );

  // Expose the raw question for quick debugging in console
  (window as any).__lastQ = row;

  const questionImage = extractImageUrl(row);

  return {
    questionText,
    choices: shuffled,
    correctText,
    correctIndex,
    imageUrl: questionImage
  };
}

/* ------------------------------ Component --------------------------------- */

export default function Battle({ open, question, onPick, onClose, meta, fx }: Props) {
  const [locked, setLocked] = useState(false);
  const [flash, setFlash] = useState<BattleFx["type"] | null>(null);

  const built = useMemo(() => {
    if (!question)
      return {
        questionText: "Solve:",
        choices: [],
        correctText: "",
        correctIndex: -1,
        imageUrl: ""
      };
    return buildChoices(question);
  }, [question]);

  useEffect(() => setLocked(false), [open, question]);

  useEffect(() => {
    if (!open) return;
    const handler = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        if (!locked) onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, locked, onClose]);

  useEffect(() => {
    if (!fx) return;
    setFlash(fx.type);
    const timer = window.setTimeout(() => setFlash(null), 350);
    return () => window.clearTimeout(timer);
  }, [fx]);

  if (!open) return null;

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,23,0.78)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2200,
  };

  const glowColor =
    flash === "player-adv" ? "#34d399" : flash === "npc-correct" ? "#fb7185" : flash === "npc-miss" ? "#facc15" : "";
  const panelStyle: React.CSSProperties = {
    background: "#0f172a",
    color: "#e2e8f0",
    width: "min(720px, 90vw)",
    borderRadius: 16,
    boxShadow: glowColor
      ? `0 20px 50px rgba(0,0,0,.45), 0 0 35px ${glowColor}`
      : "0 20px 50px rgba(0,0,0,.45)",
    padding: "26px 32px 32px",
    border: "1px solid rgba(148,163,184,.3)",
    transform: glowColor ? "scale(1.01)" : "none",
    transition: "transform .18s ease, box-shadow .18s ease"
  };

  const choiceBtnStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,.4)",
    background: "rgba(15,23,42,.75)",
    color: "#f1f5f9",
    fontSize: 16,
    cursor: "pointer",
    transition: "border .2s, background .2s",
  };

  return (
    <div style={overlayStyle} onClick={() => !locked && onClose()}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 18, opacity: 0.85, letterSpacing: 1 }}>
          {meta?.title ?? "Algebra Study"}
        </div>
        {meta?.subtitle && (
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
            {meta.subtitle}
          </div>
        )}
        {meta?.badges && meta.badges.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {meta.badges.map((badge, idx) => (
              <div
                key={`${badge.label}-${idx}`}
                style={{
                  border: "1px solid rgba(148,163,184,.4)",
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontSize: 11,
                  textTransform: "uppercase",
                  color: "#cbd5f5",
                  letterSpacing: 0.5
                }}
              >
                <span style={{ opacity: 0.65 }}>{badge.label}: </span>
                {badge.value}
              </div>
            ))}
          </div>
        )}
        {meta?.highlight && (
          <div style={{ fontSize: 14, color: "#38bdf8", marginTop: 12 }}>
            {meta.highlight}
          </div>
        )}
        <div style={{ fontSize: 20, marginTop: 18, marginBottom: 22, lineHeight: 1.5 }}>
          {built.questionText}
        </div>
        {built.imageUrl && (
          <div style={{ marginBottom: 24, textAlign: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={built.imageUrl}
              alt="Question visual"
              style={{
                maxWidth: "100%",
                maxHeight: 240,
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,.3)",
                boxShadow: "0 10px 30px rgba(0,0,0,.35)",
              }}
            />
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {built.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => {
                if (locked) return;
                setLocked(true);
                onPick(choice);
              }}
              style={choiceBtnStyle}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.border = "1px solid #38bdf8";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(14,165,233,0.12)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.border = "1px solid rgba(148,163,184,.4)";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(15,23,42,.75)";
              }}
            >
              <span style={{ fontWeight: 700, marginRight: 8 }}>
                {String.fromCharCode(65 + i)}.
              </span>
              {choice}
            </button>
          ))}
        </div>

        <div
          style={{
            marginTop: 20,
            textAlign: "center",
            fontSize: 13,
            color: "#cbd5f5",
            opacity: 0.8,
          }}
        >
          Press ESC to cancel • Stay calm, think steps, then answer.
        </div>
      </div>
    </div>
  );
}
