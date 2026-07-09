# 🥊 MMA Manager — Fight Night Experience Audit

> **Date:** 2026-07-10  
> **Scope:** Complete Fight Night flow — from offer to dashboard return  
> **Method:** Traced every stage, every decision point, every visual element

---

## 1. PRE-FIGHT

### 1.1 Fight Offer Flow

The player receives a fight offer in the Inbox. The offer card shows:
- Fighter name vs opponent name (with VS styling)
- Tier tag (Local/Regional/National/Major/Premier)
- Title tag (if applicable), Main Event tag, Short Notice tag
- Purse: Show money + Win bonus
- Opponent record, archetype, rank
- Story snippet (e.g., "Oliveira riding a two-fight sub streak")
- Action: Accept / Counter / Reject buttons
- "Full breakdown →" button (leads to FightCard - Tale of the Tape view)
- Expiration counter (e.g., "Exp: 3w")

**Time to decide:** Unlimited. The offer sits in the inbox until the player acts or it expires.

**Clarity:** Good. The purse, opponent, and consequences are visible. Acceptance is one click.

**Urgency:** Low unless the offer is expiring (≤2 weeks) or is a mandatory title defense.

### 1.2 Fight Acceptance

Clicking "Accept" books the fight instantly. The fighter's status changes to "Booked" in the roster. The fight appears in Dashboard → Upcoming Fights with a countdown (T-6w).

**Counter offer** is a gamble: 15-20% better purse, but depends on promoter relationship. Success chance is shown. Failure = rejection.

**Rejecting** costs -8 promoter relationship. Mandatory title defenses strip the belt.

**Pacing:** Between acceptance and the actual fight, the player has 4-8 weeks of normal gameplay (training, other events). This creates anticipation.

### 1.3 Fight Night Launch

The player clicks the fight card in Dashboard Upcoming Fights. The entire screen is replaced by a fullscreen FightNight overlay with a dark radial gradient background. The stage progress bar shows 4 steps: Staredown, Weigh-in, Fight, Result.

**First impression:** Professional. The fullscreen takeover signals "this is important."

---

## 2. STAREDOWN

### 2.1 Visual Presentation

- Title: "Staredown · press conference" in ember (orange)
- Body text: "Both fighters face off. Choose the attitude [Fighter Name] shows the cameras."
- 3 attitude cards in a grid: Respectful (green), Professional (blue), Trash Talk (red)
- Each card shows: name, effect description, risk description
- One card highlights when selected
- "Continue to weigh-in" button (disabled until attitude chosen)

### 2.2 Player Decision: Attitude

| Choice | Combat Effect | Secondary Effect | Risk |
|--------|--------------|-----------------|------|
| Respectful | +5% footwork | +2 popularity | None |
| Professional | None | +2 rep on win | None |
| Trash Talk | +8% striking (opponent +5%) | +5 popularity | Lose = morale -8, rep -5 |

**Decision significance:** Low-moderate. The combat effects are small percentages. The popularity/rep effects are small numbers. Most players settle on a "default" attitude after a few fights.

**Time pressure:** None. Player can take as long as they want.

### 2.3 Emotional Impact

**Exciting?** Moderately. The staredown card and attitude choices create a "big fight" feel. The descriptions sell the drama.

**But...** The effects are abstract. "+5% footwork" doesn't feel visceral. The player is making a mechanical choice, not an emotional one.

---

## 3. WEIGH-IN

### 3.1 Visual Presentation

- Weigh-in card: "Made weight" or "Missed weight" tag
- Weight display: "152.4 → 145.0 lbs" with cut percentage
- Cut severity label (On weight / Moderate cut / Big cut)
- Stamina penalty shown
- Miss weight → choice: Catchweight (-30% purse) or Cancel Fight

### 3.2 Tale of the Tape

A dedicated panel shows CompareBar for all 8 attributes:
- Age
- Divider
- Striking, Wrestling, BJJ, Footwork, Strength, Cardio, Chin, Fight IQ

Each CompareBar shows both fighters' values with colored bars (fighter's archetype color vs opponent's archetype color).

**Visual quality:** Excellent. The CompareBar is the best visual element in the game. The left-right comparison with colored bars is immediately readable.

**But...** It's the same 9 bars every fight. After 10 fights, the player stops looking.

### 3.3 Game Plan Selection

- 4 game plan cards in a grid
- Each shows name + description
- View mode toggle: Tick-by-Tick / Round Summary
- "🔔 Ring the Bell" button (disabled until plan chosen)

**Player Decision: Game Plan**

| Plan | Effect |
|------|--------|
| Take It Down | +18% takedown chance |
| Keep It Standing | +Striking focus, sprawl defense |
| Finish It | +50% KO chance, +30% stamina drain |
| Survive & Outpoint | -25% stamina drain, +defense |

**Decision significance:** Moderate-high. The game plan directly shapes how the round simulation plays out. A Wrestler with "Take It Down" fights very differently from a Boxer with "Keep It Standing."

**Time pressure:** None.

### 3.4 Emotional Impact

**Exciting?** Yes. The weigh-in and Tale of the Tape build anticipation. The weight cut adds realism. The game plan selection feels strategic.

**But...** Miss weight is very rare (2-20% chance depending on cut severity). Most weigh-ins are "Made weight" with no drama.

---

## 4. FIGHT PRESENTATION

### 4.1 Entrance

After "Ring the Bell", the entrance screen shows:
- 2.5-second timer
- Fighter VS Opponent with Mono avatars
- "Fighter Entrance" title in gold
- Weight class labels

**Impact:** Brief but effective. Creates a "walkout" moment. The 2.5-second delay before the first round builds tension.

### 4.2 Scoreboard

During the fight, a persistent scoreboard shows:
- Fighter name + HP bar (red, mirrored for player fighter)
- Opponent name + HP bar (blue)
- Round counter: "Round 2/3"
- Stamina bars below HP bars (green)
- Strike count: "STR 34" / "STR 28"
- Takedown count: "TD 1" / "TD 0"

**Clarity:** Good. The HP bars provide an immediate sense of who's winning. The dual HP/stamina bars are intuitive.

**But...** The scoreboard never changes during a round — only between rounds. During the round, the player has no real-time feedback on how the fight is going except the commentary text.

### 4.3 Round Commentary

In "Round Summary" mode (default), the full round commentary is displayed at once.

**Sample commentary:**
```
[0:05] Round 1 — bell rings! Kaito Mori vs Enzo Rossi!
[0:10] Kaito Mori in the center of the cage.
[0:20] Enzo Rossi circling, looking for opening.
[0:45] Clean exchange! Kaito Mori connects 3 times, Enzo Rossi fires back 2.
[1:30] Kaito Mori shoots — takedown! Lands in half guard.
[2:15] Kaito Mori landing ground and pound from half guard.
[3:40] Enzo Rossi wobbles — that glass jaw!
[5:00] Round 1 ends. Judges score this round.
```

**Commentary quality:** Moderate. The templates are varied (4 strike templates, 3 power templates, 2 clinch templates, 3 scramble templates). After 10+ fights, the player will have seen every variant multiple times.

**But...** The commentary is the ONLY feedback during the round. If the player skims past "[0:45] Clean exchange!" they have no idea what happened. There is no damage popup, no "BIG SHOT!" highlight, no slow-motion moment.

In "Tick-by-Tick" mode, commentary lines appear one at a time with a 1.2-second interval. This is more dramatic but slower.

### 4.4 End of Round

A button appears: "End of round 1" (if no finish). Clicking it advances to Corner.

If the round ended by KO/SUB, a gold "See the finish" button appears instead.

### 4.5 Corner Decisions

Between rounds, the Corner screen shows:
- Countdown timer: "0:47" in warning color (decrements from 60)
- Coach advice: italic flavor text
- 3 strategy buttons:
  - "Finish him" — +aggression, +finish rate, ↓ stamina
  - "Work the body" — +body damage, ↑ late payoff
  - "Save your gas" — +stamina recovery, ↓ output

**Player Decision: Corner Strategy**

| Choice | Effect |
|--------|--------|
| Finish him | +aggression, +finish rate, -stamina |
| Work the body | +body damage, -instant points |
| Save your gas | +stamina recovery, -output |

**Decision significance:** Moderate. The choice affects the next round's combat math.

**Time pressure:** HIGH. The 60-second timer creates genuine urgency. The decreasing number ("0:47... 0:46...") is the most tense moment in FightNight.

**But...** The player doesn't know the actual HP or stamina of the fighters when making the decision. The scoreboard updates between rounds, but the player can't see detailed damage state.

After the final round, the corner screen changes to "Final round complete — waiting for decision..." with a "Go to decision" button instead of strategy buttons.

### 4.6 Knockdown

When a knockdown occurs (in summary mode), a full "It's over!" screen appears:
- Large gold "It's over!" text
- Description of what happened
- "See the result" button

**Visual impact:** High. The gold glow, large text, and box shadow create a moment of drama.

### 4.7 Doctor Stoppage

If a cut is severe (cutB ≥ 6 with 30% chance between rounds), the Doctor Check screen shows:
- Fighter names with cut severity bars (0-10 scale)
- Description: "The cut needs attention. Continue or retire?"
- Two buttons: "Continue fight" / "Retire (TKO loss)"

**Impact:** High. The doctor check adds realism and tension. The "Retire" option is a real strategic choice — losing via TKO vs risking further damage.

---

## 5. PLAYER DECISIONS DURING FIGHT NIGHT

| Decision | When | Frequency | Significance | Time Pressure |
|----------|------|-----------|-------------|---------------|
| Attitude | Staredown | Once per fight | Low-Moderate | None |
| Game Plan | Weigh-in | Once per fight | Moderate-High | None |
| View Mode | Weigh-in | Once per fight | Low (preference) | None |
| Corner Strategy | Between rounds | 2-4× per fight | Moderate | **High (60s timer)** |
| Corner (final round) | After last round | Once per fight | None (auto-decision) | Low |
| Doctor Check | Between rounds | Rare (30% when cut≥6) | High | None |
| Knockdown | Mid-round | Rare | None (cinematic) | None |

**Total decisions per fight:** 4-7, depending on rounds and events.

---

## 6. EMOTIONAL EXPERIENCE

### 6.1 Most Exciting Moments

1. **Corner countdown** — The 60-second timer creates genuine tension. "Should I push for the finish or save gas?" The urgency makes the decision feel important.
2. **Knockdown** — The "It's over!" screen with gold glow is dramatic.
3. **Close decision** — When the fight goes the distance and the player doesn't know who won.
4. **Comeback KO** — When the player's fighter was losing on scorecards but gets a late KO.
5. **Title fight result** — "♛ And still Featherweight champion" creates a genuine moment of triumph.

### 6.2 Most Boring Moments

1. **Reading commentary** — After 5+ fights, the commentary templates are familiar. The player skims or clicks through quickly.
2. **Entrance** — The 2.5-second delay is fine the first time, but on the 20th fight, it's dead time.
3. **Weigh-in (no drama)** — When the fighter makes weight easily, the weigh-in is just a formality.
4. **Early rounds** — Rounds 1-2 of a 5-round fight feel like filler before the real action in rounds 3-5.

### 6.3 Most Confusing Moments

1. **No real-time feedback** — During the round, the commentary is the only feedback. There's no visual indication of damage being dealt.
2. **Scoreboard doesn't update mid-round** — HP bars only update between rounds, not during.
3. **Corner decision without full information** — The player chooses a strategy without knowing exact fighter HP/stamina.
4. **Doctor check probability** — The 30% chance is invisible. The player doesn't know it's a random check.

### 6.4 Dramatic Highs

- First KO of a career
- Winning a title fight
- Comeback from behind on scorecards
- Surviving a knockdown to win
- Trilogy fight conclusion

### 6.5 Dramatic Lows

- Losing a title defense
- Doctor stoppage loss (the "what if" feeling)
- Missing weight and having to accept catchweight
- Dominating on scorecards but getting caught with a late KO

---

## 7. POST-FIGHT

### 7.1 Result Presentation

The result screen shows:
- Large "Victory" (gold) or "Defeat" (red) text in a bordered box
- Fighter name + how they won/lost + round
- Title status: "♛ And still [weight class] champion"
- Purse breakdown: Show money, Win bonus, Camp cut, Fight of the Night
- "Back to camp" button

**Visual quality:** Good. The bordered text and gold/red coloring are clear and celebratory/somber.

### 7.2 Progress Feedback

After clicking "Back to camp", the player returns to the dashboard. The fighter's record, popularity, morale, and reputation are updated. A log entry appears in the camp feed.

**But...** The transition is abrupt. The player goes from a dramatic result screen directly back to the static dashboard. There's no "post-fight press conference" or "fighter interview" moment. No celebration animation. No stat recap showing what changed.

---

## 8. VARIETY

### 8.1 Commentary Repetition

The commentary system has:
- 4 strike exchange templates
- 3 power shot templates
- 2 clinch templates
- 3 scramble templates
- 2 scramble fail templates
- Trait-specific lines (Iron Chin, Glass Jaw, Warrior, Explosive, Grinder, Showboat)
- Position-specific lines (guard, mount, back mount)

**Estimated unique lines:** ~40-50. A 3-round fight produces ~15-20 commentary lines. After ~5-8 fights, the player has seen every template.

### 8.2 Presentation Variety

| Element | Variety |
|---------|---------|
| Staredown | Same 3 options every fight |
| Weigh-in | Same Tale of the Tape (different numbers) |
| Scoreboard | Same layout, different numbers |
| Corner | Same 3 options every fight |
| Knockdown | Same "It's over!" screen |
| Result | Victory/Defeat, same layout |

**Presentation variety is LOW.** The structure is identical every fight. Only the numbers change.

### 8.3 Event Variety During Fight Night

| Event | Frequency |
|-------|-----------|
| Knockdown | ~15-25% of fights |
| KO/TKO finish | ~20-30% of fights |
| Submission finish | ~10-15% of fights |
| Decision | ~50-60% of fights |
| Doctor stoppage | ~5% of fights |
| Miss weight | ~2-8% of fights |

**Most fights go to decision with no special events.** The "standard" fight (no knockdown, no doctor, no miss weight, decision) is the most common outcome and also the least exciting.

---

## 9. OVERALL ASSESSMENT

### Is Fight Night a premium centerpiece?

**Yes — with qualifications.**

**What makes it premium:**
- The fullscreen takeover signals importance
- The stage progress bar creates structure
- The CompareBar Tale of the Tape is genuinely excellent
- The corner countdown timer creates real tension
- The knockdown/doctor stoppage events add drama
- The result screen provides closure
- The seeded RNG ensures reproducibility

**What holds it back:**
- Commentary repetition after 5-8 fights
- No real-time visual feedback during rounds
- No mid-round scoreboard updates
- Identical structure every fight (staredown→weigh-in→rounds→corner→result)
- No audio (every punch is silent, every crowd is silent)
- No pre-fight buildup beyond the inbox card
- Abrupt post-fight transition back to dashboard
- Scoreboard clarity decreases in tick-by-tick mode (no persistent HP bars)

**Grade: B+**

Fight Night is a **solid simulation centerpiece** that delivers tactical depth and occasional dramatic highs. It lacks the audiovisual spectacle and presentation variety of premium sports games, but within the constraints of a solo-developed browser game, it delivers a compelling fight experience.

The system that most needs improvement is **commentary variety** — it's the primary vehicle for round-by-round drama and it exhausts its vocabulary too quickly. The system that works best is the **corner timer** — it creates the only moment of genuine time pressure in the entire game.
