import type { Profile } from "./profiles";

export type QCategory = "graphing" | "tables" | "algebraic";

// Infer question category from standard / text
export function inferCategory(row: any): QCategory {
  const q = (row?.question || "").toLowerCase();
  const std = (row?.standard || "").toUpperCase();

  if (/(F-IF|F-LE|RATE|SLOPE|INTERCEPT|GRAPH)/.test(std)) return "graphing";
  if (/(TABLE|MAPPING|VALUES|F-IF\.1)/.test(std)) return "tables";
  if (/(A-REI|SOLVE|SIMPLIFY|EQUATION|A-CED|A-SSE|A-APR)/.test(std)) return "algebraic";

  if (q.includes("table") || q.includes("mapping") || q.includes("values")) return "tables";
  if (q.includes("graph") || q.includes("slope") || q.includes("intercept")) return "graphing";
  return "algebraic";
}

// Map starter.type to a category
export function profileStarterCategory(p?: Profile | null): QCategory | null {
  const t = p?.starter?.type?.toLowerCase() || "";
  if (t.includes("graph")) return "graphing";
  if (t.includes("table")) return "tables";
  if (t.includes("algebra")) return "algebraic";
  return null;
}

export function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

export function getUnitNormFromRow(row: any): string {
  const candidates = [row?.unit_id, row?.unit, row?.Unit, row?.unitId];
  for (const v of candidates) {
    const m = String(v ?? "").toLowerCase().match(/\d+/);
    if (m) return String(Number(m[0]));
  }
  return "";
}
