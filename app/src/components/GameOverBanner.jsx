// Game over banner
import { Card, Btn, cut } from "../ui/theme.jsx";
import { T } from "../ui/theme.jsx";

export default function GameOverBanner({ message, onRestart }) {
  return (
    <Card accent={T.neg} style={{ textAlign: "center", padding: 24 }}>
      <div style={{ fontFamily: T.disp, fontSize: 32, letterSpacing: 3, color: T.neg, textTransform: "uppercase", display: "inline-block", border: `3px solid ${T.neg}`, padding: "2px 16px", transform: "rotate(-6deg)", ...cut(8) }}>Game Over</div>
      <div style={{ color: T.txt, fontSize: 13, margin: "14px 0" }}>{message}</div>
      <Btn onClick={onRestart}>Mulai Ulang</Btn>
    </Card>
  );
}
