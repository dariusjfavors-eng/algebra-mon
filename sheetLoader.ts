// src/lib/sheetLoader.ts
export type QuestionRow = {
  qid?: string;
  unit_id?: string;
  standard?: string;
  question_text: string;
  answer: string;
  distractors?: string[];
  explanation?: string;
  [k: string]: any;
};

export async function loadTSV(url: string): Promise<QuestionRow[]> {
  const text = await fetch(url).then((r) => r.text());
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const head = lines[0].split("\t").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split("\t");
    const raw: Record<string, any> = {};
    head.forEach((h, i) => (raw[slug(h)] = (cols[i] ?? "").trim()));

    // Canonicalize to our expected keys
    const q: QuestionRow = {
      qid: pick(raw, ["qid", "id", "questionid"]),
      unit_id: pick(raw, ["unit_id", "unit", "unitid"]),
      standard: pick(raw, ["standard", "std", "learningstandard", "ngss", "nys"]),
      question_text:
        pick(raw, ["question_text", "question", "prompt", "stem", "text"]) || "(No question text found)",
      answer: pick(raw, ["answer", "correct", "answer_key", "key", "solution"]),
      distractors: collectChoices(raw),
      explanation: pick(raw, ["explanation", "rationale", "why"]),
      ...raw, // keep originals in case you want them
    };

    // Ensure types
    if (!Array.isArray(q.distractors)) q.distractors = q.distractors ? [String(q.distractors)] : [];

    return q;
  });
}

// Helpers

function slug(s: string) {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function pick(obj: Record<string, any>, keys: string[]) {
  for (const k of keys) {
    if (obj[k]) return obj[k];
  }
  return "";
}

// Collect choices from a variety of header styles:
// choice_a,b,c,d | a,b,c,d | option1,option2... | distractors | wrong1,wrong2...
function collectChoices(raw: Record<string, any>): string[] {
  const buckets: string[] = [];

  // Unified buckets by common prefixes
  const prefixSets = [
    ["choice_a", "choice_b", "choice_c", "choice_d", "choice_e"],
    ["a", "b", "c", "d", "e"],
    ["option1", "option2", "option3", "option4", "option5"],
    ["wrong1", "wrong2", "wrong3", "wrong4"],
  ];

  for (const set of prefixSets) {
    for (const k of set) if (raw[k]) buckets.push(String(raw[k]));
    if (buckets.length) break;
  }

  // Combined columns
  if (!buckets.length && raw["options"]) buckets.push(...splitMulti(raw["options"]));
  if (!buckets.length && raw["choices"]) buckets.push(...splitMulti(raw["choices"]));
  if (!buckets.length && raw["distractors"]) buckets.push(...splitMulti(raw["distractors"]));

  // Remove empties and duplicates, and exclude the correct answer if present
  const ans = (raw["answer"] || raw["answer_key"] || raw["correct"] || "").toString().trim();
  const uniq = Array.from(new Set(buckets.map((x) => x.trim()).filter(Boolean)));
  return uniq.filter((x) => x !== ans);
}

function splitMulti(val: any): string[] {
  const s = String(val).trim();
  if (!s) return [];
  try {
    if (s.startsWith("[") || s.startsWith("{")) {
      const j = JSON.parse(s.replace(/'/g, '"'));
      return Array.isArray(j) ? j.map(String) : Object.values(j).map(String);
    }
  } catch {}
  return s.replace(/[{}]/g, "").split(/[,;|]/).map((x) => x.trim()).filter(Boolean);
}
