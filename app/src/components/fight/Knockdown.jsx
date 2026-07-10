// Knockdown — finish moment presentation
import { Panel, Btn } from "../../ui/theme.jsx";
import { T } from "../../ui/theme.jsx";

export default function Knockdown({ roundLog, rnd, onSeeResult }) {
  return (
    <Panel style={{ textAlign: "center", padding: 32, border: `1px solid ${T.gold}66`, boxShadow: `0 0 40px ${T.gold}22` }}>
      <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 44, letterSpacing: 2, textTransform: "uppercase", color: T.gold, lineHeight: 1 }}>It's over!</div>
      <div style={{ fontFamily: T.body, fontSize: 14, color: T.txt2, margin: "10px 0 18px" }}>
        {roundLog.finish ? `${roundLog.finish.how} at round ${rnd}!` : `${roundLog.knockdown.fighter} goes down!`}
      </div>
      <Btn color={T.gold} onClick={onSeeResult}>See the result</Btn>
    </Panel>
  );
}
