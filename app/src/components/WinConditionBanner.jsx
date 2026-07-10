// Win condition banner — legacy tier display
import { Card, cut } from "../ui/theme.jsx";
import { DISPLAY, C } from "../ui/theme.jsx";

const TIERS = [
  { k: "Bronze", i: "🥉", min: 5000 },
  { k: "Silver", i: "🥈", min: 12000 },
  { k: "Gold", i: "👑", min: 25000 },
  { k: "Platinum", i: "💎", min: 50000 },
  { k: "GOAT", i: "🐐", min: 100000 },
];

const LEGACY_TIERS = [
  { min: 100000, tier: "GOAT", icon: "🐐", color: "#ff4488", label: "Greatest of All Time" },
  { min: 50000, tier: "Platinum", icon: "💎", color: "#b5e4ff", label: "MMA Empire" },
  { min: 25000, tier: "Gold", icon: "👑", color: "#ffd15c", label: "World Class Camp" },
  { min: 12000, tier: "Silver", icon: "🥈", color: "#b0b8c8", label: "Respected Camp" },
  { min: 5000, tier: "Bronze", icon: "🥉", color: "#c48a4a", label: "Rising Camp" },
];

export default function WinConditionBanner({ legacy }) {
  if (!legacy || legacy <= 0) return null;
  const wc = LEGACY_TIERS.find(t => legacy >= t.min);
  if (!wc) return null;

  return (
    <Card accent={wc.color} style={{ textAlign: "center" }}>
      <div style={{ fontSize: 28 }}>{wc.icon}</div>
      <div style={{ fontFamily: DISPLAY, color: wc.color, fontSize: 18, letterSpacing: 2, textTransform: "uppercase", animation: "goldglow 2s infinite" }}>{wc.label}</div>
      <div style={{ color: C.dim, fontSize: 12, marginTop: 3 }}>{wc.tier} — Legacy {legacy.toLocaleString()} pts · Tier {TIERS.length} tiers</div>
      <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 6 }}>
        {TIERS.map((t) => (
          <div key={t.k} style={{ fontSize: 12, opacity: legacy >= t.min ? 1 : 0.2 }}>{t.i}</div>
        ))}
      </div>
    </Card>
  );
}
