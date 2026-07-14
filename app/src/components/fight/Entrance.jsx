// Entrance — fighter walkout (fade-in, auto-transition)
import { Panel, Eyebrow, Mono } from "../../ui/theme.jsx";
import { T } from "../../ui/theme.jsx";

const styleId = "entrance-fade";
if (!document.getElementById(styleId)) {
  const s = document.createElement("style");
  s.id = styleId;
  s.textContent = `@keyframes entranceFade { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`;
  document.head.appendChild(s);
}

export default function Entrance({ fighter, opp, ca, cb }) {
  return (
    <Panel style={{ textAlign: "center", padding: 30, animation: "entranceFade .4s ease-out" }}>
      <div style={{ fontSize: 48, marginBottom: 4 }}>🚶</div>
      <Eyebrow color={T.gold}>Fighter Entrance</Eyebrow>
      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 14 }}>
        <div style={{ textAlign: "center" }}>
          <Mono name={fighter.name} color={ca} size={56} region={fighter.region} titleTier={fighter.titles?.length > 0 ? (fighter.titles?.includes("Major World Champion") ? "Major" : "National") : null} />
          <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 16, textTransform: "uppercase", color: T.txt, marginTop: 6 }}>{fighter.name}</div>
          <div style={{ color: T.txt3, fontSize: 10, marginTop: 1 }}>{fighter.weightClass}</div>
        </div>
        <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 22, color: T.ember, alignSelf: "center" }}>VS</div>
        <div style={{ textAlign: "center" }}>
          <Mono name={opp.name} color={cb} size={56} />
          <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 16, textTransform: "uppercase", color: T.txt, marginTop: 6 }}>{opp.name}</div>
          <div style={{ color: T.txt3, fontSize: 10, marginTop: 1 }}>{opp.weightClass || fighter.weightClass}</div>
        </div>
      </div>
    </Panel>
  );
}
