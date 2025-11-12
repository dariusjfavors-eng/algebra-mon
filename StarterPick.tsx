// src/components/StarterPick.tsx
import { useMemo } from "react";

type Starter = { name: string; type?: string; spriteUrl?: string };

type Props = {
  open: boolean;
  starters: Starter[];
  onChoose: (s: Starter) => void;
};

export default function StarterPick({ open, starters, onChoose }: Props) {
  const three = useMemo(() => starters.slice(0, 3), [starters]);
  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "grid", placeItems: "center", zIndex: 9999 }}>
      <div style={{ width: 640, maxWidth: "95vw", background: "#fff", color: "#0f172a", borderRadius: 14, padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>Choose your Starter</h2>
        <p style={{ marginTop: 6, color: "#475569" }}>Pick one to begin your Algebra journey.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 16 }}>
          {three.map((s, i) => (
            <button key={i} onClick={() => onChoose(s)}
              style={{
                border: "1px solid #cbd5e1", borderRadius: 12, padding: 12, textAlign: "center",
                background: "#f8fafc", cursor: "pointer"
              }}>
              <div style={{ fontWeight: 600, fontSize: 18 }}>{s.name || `Starter ${i + 1}`}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{s.type || "—"}</div>
              {s.spriteUrl ? (
                <img src={s.spriteUrl} alt={s.name} style={{ width: 96, height: 96, imageRendering: "pixelated", marginTop: 8 }} />
              ) : (
                <div style={{ width: 96, height: 96, margin: "8px auto 0", background: "#e2e8f0", borderRadius: 8 }} />
              )}
              <div style={{ marginTop: 8, fontSize: 12 }}>Choose</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
