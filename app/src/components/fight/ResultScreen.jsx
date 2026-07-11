// ResultScreen — fight result, narrative, purse breakdown
import { Panel, Btn, Tag } from "../../ui/theme.jsx";
import { T } from "../../ui/theme.jsx";
import { fmt$ } from "../../engine/rng.js";
import { generateFightNarrative, detectSignatureMoments } from "../../engine/narrative.js";

export default function ResultScreen({ fighter, opp, roundLog, result, totalRounds, onCommit }) {
  const narrative = generateFightNarrative(fighter, opp, [roundLog].filter(Boolean), result);
  const moments = detectSignatureMoments(fighter, [roundLog].filter(Boolean), result);
  const stars = '⭐'.repeat(narrative.rating || 3);
  const show = fighter.booked?.show || 0;
  const winBonus = result.won ? (fighter.booked?.winBonus || 0) : 0;

  return (
    <Panel style={{ textAlign: "center", padding: "36px 24px", border: `1px solid ${result.won ? T.gold : T.neg}55` }}>
      <div style={{ display: "inline-block", fontFamily: T.disp, fontWeight: 700, fontSize: 48, letterSpacing: 3, textTransform: "uppercase", color: result.won ? T.gold : T.neg, lineHeight: 1, padding: "6px 26px", border: `3px solid ${result.won ? T.gold : T.neg}`, borderRadius: T.r }}>{result.won ? "Victory" : "Defeat"}</div>
      <div style={{ fontFamily: T.body, fontSize: 15, color: T.txt, marginTop: 16 }}>
        <b>{fighter.name}</b> {result.won ? "wins" : "loses"} via <b>{result.how}</b> · Round {result.r}
      </div>
      {fighter.booked.title && result.won && (
        <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 17, letterSpacing: 1.5, textTransform: "uppercase", color: T.gold, marginTop: 8 }}>♛ And still {fighter.weightClass} champion</div>
      )}

      {/* Fight Narrative */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Fight Story</div>
        <div style={{ fontFamily: T.body, fontSize: 13, color: T.txt2, lineHeight: 1.6, fontStyle: 'italic', maxWidth: 500, margin: '0 auto' }}>
          {narrative.narrative}
        </div>
        <div style={{ marginTop: 10, fontFamily: T.body, fontSize: 14, letterSpacing: 2 }}>{stars}</div>
        {moments.length > 0 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            {moments.map(m => <Tag key={m.id} color={T.gold}>{m.icon} {m.label}</Tag>)}
          </div>
        )}
      </div>

      {/* Purse breakdown */}
      <div style={{ display: "inline-grid", gridTemplateColumns: "auto auto", gap: "6px 24px", margin: "20px 0", padding: "14px 22px", background: T.bg, borderRadius: T.r, textAlign: "left" }}>
        {(() => {
          const items = [["Show money", fmt$(show)], ["Win bonus", fmt$(winBonus)], ["Camp cut", fmt$(Math.round(((fighter.contract?.managerCut || 0.18) * (show + winBonus))))]];
          const titleTier = fighter.booked?.titleTier;
          if (titleTier === "Major" || titleTier === "Premier") {
            const oppPop = typeof opp?.popularity === "number" ? opp.popularity : (opp?.level ? Math.round(opp.level * 60) : 30);
            const ppv = Math.round((fighter.popularity + oppPop) * 200 * (titleTier === "Premier" ? 1.5 : 1));
            items.push(["PPV Revenue", fmt$(ppv)]);
          }
          items.push(["Fight of the Night", result.won ? "$50K" : "—"]);
          return items.map(([l, v], i, arr) => (
            <div key={l} style={{ display: "contents" }}>
              <span style={{ fontFamily: T.body, fontSize: 12, color: i === arr.length - 1 ? T.txt : T.txt3, fontWeight: i === arr.length - 1 ? 700 : 400 }}>{l}</span>
              <span style={{ fontFamily: T.mono, fontSize: 13.5, fontWeight: 700, color: i === arr.length - 1 ? T.pos : T.txt2, textAlign: "right" }}>{v}</span>
            </div>
          ));
        })()}
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <Btn color={T.ember} onClick={onCommit}>Back to camp</Btn>
      </div>
    </Panel>
  );
}
