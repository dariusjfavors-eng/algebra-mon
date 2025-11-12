// src/components/HUD.tsx
type Props = {
  starterName?: string;
  level: number;
  xp: number;
  next: number;
  stamina?: number;
  maxStamina?: number;
  streakLabel?: string;
  streakValue?: number;
};

export default function HUD({
  starterName,
  level,
  xp,
  next,
  stamina,
  maxStamina,
  streakLabel,
  streakValue
}: Props) {
  const pct = Math.max(0, Math.min(100, Math.round((xp / next) * 100)));
  const staminaPct =
    typeof stamina === "number" && typeof maxStamina === "number" && maxStamina > 0
      ? Math.max(0, Math.min(100, Math.round((stamina / maxStamina) * 100)))
      : null;
  return (
    <div style={{
      position: "fixed",
      top: 12,
      left: "50%",
      transform: "translateX(-50%)",
      width: "min(980px, 96vw)",
      zIndex: 1000,
      background: "rgba(255,255,255,0.95)",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: "12px 16px",
      display: "flex",
      justifyContent: "space-between",
      gap: 24,
      flexWrap: "wrap"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontWeight: 700 }}>
          {starterName ? `${starterName}` : "Trainer"}
          <span style={{ color: "#64748b", fontWeight: 500 }}>  Lv.{level}</span>
        </div>
        {typeof streakValue === "number" && (
          <div
            style={{
              fontSize: 12,
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontWeight: 600
            }}
          >
            <span role="img" aria-label="streak">
              🔥
            </span>
            <span>
              {streakLabel ?? "Streak"}:&nbsp;
              <span style={{ color: "#0f172a" }}>{streakValue}</span>
            </span>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, width: "100%" }}>
        <div style={{ flex: "1 1 260px" }}>
          <div style={{ fontSize: 12, color: "#64748b", margin: "6px 0 4px" }}>XP</div>
          <div style={{ width: "100%", height: 10, background: "#e2e8f0", borderRadius: 999 }}>
            <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "#10b981" }} />
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{xp} / {next}</div>
        </div>
        {staminaPct !== null && (
          <div style={{ flex: "1 1 260px" }}>
            <div style={{ fontSize: 12, color: "#64748b", margin: "6px 0 4px" }}>Stamina</div>
            <div style={{ width: "100%", height: 10, background: "#e2e8f0", borderRadius: 999 }}>
              <div
                style={{
                  width: `${staminaPct}%`,
                  height: "100%",
                  borderRadius: 999,
                  background:
                    staminaPct > 60 ? "#22c55e" : staminaPct > 30 ? "#facc15" : "#f87171",
                  transition: "width .3s"
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
              {stamina} / {maxStamina}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
