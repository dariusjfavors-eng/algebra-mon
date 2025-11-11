// src/pages/Teacher.tsx
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

type Log = {
  uid: string;
  qid?: string | null;
  unit?: string | null;
  standard?: string | null;
  correct: boolean;
  ts: number;
};

export default function Teacher() {
  const [ready, setReady] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [unitFilter, setUnitFilter] = useState("");
  const [standardFilter, setStandardFilter] = useState("");
  const [uidFilter, setUidFilter] = useState("");

  // ⚠️ Simple domain gate for now; tighten later
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) return (window.location.href = "/login");
      const email = (u.email || "").toLowerCase();
      const teacherOK =
        email.endsWith("@schools.nyc.gov") ||
        email.endsWith("@nycstudents.net"); // adjust as needed
      if (!teacherOK) return (window.location.href = "/");
      setReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!ready) return;

    // Build a query with optional filters
    let qRef = query(
      collection(db, "game_logs"),
      orderBy("ts", "desc"),
      limit(500)
    );

    // We’ll filter in-memory for unit/standard/uid to keep it simple
    const unsub = onSnapshot(qRef, (snap) => {
      const rows: Log[] = [];
      snap.forEach((d) => rows.push(d.data() as Log));
      setLogs(rows);
    });
    return () => unsub();
  }, [ready]);

  const filtered = useMemo(() => {
    return logs.filter((r) => {
      if (unitFilter && (r.unit || "").toLowerCase() !== unitFilter.toLowerCase()) return false;
      if (standardFilter && !(r.standard || "").toLowerCase().includes(standardFilter.toLowerCase())) return false;
      if (uidFilter && !(r.uid || "").toLowerCase().includes(uidFilter.toLowerCase())) return false;
      return true;
    });
  }, [logs, unitFilter, standardFilter, uidFilter]);

  const summary = useMemo(() => {
    // Accuracy by unit and standard
    const byUnit = new Map<string, { total: number; correct: number }>();
    const byStd = new Map<string, { total: number; correct: number }>();
    for (const r of filtered) {
      const u = (r.unit || "—");
      const s = (r.standard || "—");
      byUnit.set(u, { total: (byUnit.get(u)?.total || 0) + 1, correct: (byUnit.get(u)?.correct || 0) + (r.correct ? 1 : 0) });
      byStd.set(s, { total: (byStd.get(s)?.total || 0) + 1, correct: (byStd.get(s)?.correct || 0) + (r.correct ? 1 : 0) });
    }
    const unitRows = Array.from(byUnit.entries()).map(([k, v]) => ({ key: k, ...v, pct: pct(v.correct, v.total) }));
    const stdRows = Array.from(byStd.entries()).map(([k, v]) => ({ key: k, ...v, pct: pct(v.correct, v.total) }));
    unitRows.sort((a, b) => a.key.localeCompare(b.key));
    stdRows.sort((a, b) => a.key.localeCompare(b.key));
    return { unitRows, stdRows };
  }, [filtered]);

  function exportCSV() {
    const header = ["tsISO","uid","unit","standard","qid","correct"];
    const rows = filtered.map(r => [
      new Date(r.ts).toISOString(),
      r.uid,
      r.unit || "",
      r.standard || "",
      r.qid || "",
      r.correct ? "1" : "0",
    ]);
    const csv = [header, ...rows].map(a => a.map(escapeCSV).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `algebramon_logs_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!ready) return <div style={{ padding: 20 }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}>
      <h1 style={{ marginBottom: 6 }}>Teacher Dashboard</h1>
      <div style={{ color: "#475569", marginBottom: 16 }}>Live attempts (last 500)</div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <input placeholder="Filter: Unit (e.g., 1, 2, 3)" value={unitFilter} onChange={e=>setUnitFilter(e.target.value)}
               style={inp} />
        <input placeholder="Filter: Standard (e.g., A.REI.3)" value={standardFilter} onChange={e=>setStandardFilter(e.target.value)}
               style={inp} />
        <input placeholder="Filter: UID" value={uidFilter} onChange={e=>setUidFilter(e.target.value)}
               style={inp} />
        <button onClick={exportCSV} style={btn}>Export CSV</button>
      </div>

      {/* Summary by Unit */}
      <h3 style={{ marginTop: 18 }}>Mastery by Unit</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={table}>
          <thead><tr><th style={th}>Unit</th><th style={th}>Correct</th><th style={th}>Total</th><th style={th}>Accuracy</th></tr></thead>
          <tbody>
            {summary.unitRows.map((r, i) => (
              <tr key={i}>
                <td style={td}>{r.key}</td>
                <td style={td}>{r.correct}</td>
                <td style={td}>{r.total}</td>
                <td style={td}>{r.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary by Standard */}
      <h3 style={{ marginTop: 18 }}>Mastery by Standard</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={table}>
          <thead><tr><th style={th}>Standard</th><th style={th}>Correct</th><th style={th}>Total</th><th style={th}>Accuracy</th></tr></thead>
          <tbody>
            {summary.stdRows.map((r, i) => (
              <tr key={i}>
                <td style={td}>{r.key}</td>
                <td style={td}>{r.correct}</td>
                <td style={td}>{r.total}</td>
                <td style={td}>{r.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Raw attempts */}
      <h3 style={{ marginTop: 18 }}>Recent Attempts</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Time</th>
              <th style={th}>UID</th>
              <th style={th}>Unit</th>
              <th style={th}>Standard</th>
              <th style={th}>QID</th>
              <th style={th}>Correct</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i}>
                <td style={td}>{new Date(r.ts).toLocaleString()}</td>
                <td style={td}>{r.uid}</td>
                <td style={td}>{r.unit || "—"}</td>
                <td style={td}>{r.standard || "—"}</td>
                <td style={td}>{r.qid || "—"}</td>
                <td style={{ ...td, color: r.correct ? "#16a34a" : "#dc2626" }}>
                  {r.correct ? "✔" : "✘"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  minWidth: 220,
};

const btn: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  borderRadius: 8,
  cursor: "pointer",
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "1px solid #e2e8f0",
  background: "#f8fafc",
  position: "sticky",
  top: 0,
};

const td: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid #f1f5f9",
};

function pct(c: number, t: number) {
  return t > 0 ? Math.round((c / t) * 100) : 0;
}

function escapeCSV(s: string) {
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
