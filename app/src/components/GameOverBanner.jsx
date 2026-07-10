// Game over banner
import { Card, Btn, cut } from "../ui/theme.jsx";
import { DISPLAY, C } from "../ui/theme.jsx";

export default function GameOverBanner({ message, onRestart }) {
  return (
    <Card accent={C.red} style={{ textAlign: "center", padding: 24 }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 32, letterSpacing: 3, color: C.red, textTransform: "uppercase", display: "inline-block", border: `3px solid ${C.red}`, padding: "2px 16px", transform: "rotate(-6deg)", ...cut(8) }}>Game Over</div>
      <div style={{ color: C.chalk, fontSize: 13, margin: "14px 0" }}>{message}</div>
      <Btn onClick={onRestart}>Mulai Ulang</Btn>
    </Card>
  );
}
