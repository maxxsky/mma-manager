# 🥊 MMA Fight Engine — Game Design Reference

> Referensi fundamental buat fight simulation MMA Manager.
> Ditulis buat Mateo si coding agent — fokus ke **mekanik game**, bukan cuma fakta.

---

## 1. Fase Pertarungan & State Machine

### State Machine Dasar

```
                    ┌─────────────┐
          ┌────────►│  STANDING   │◄────────┐
          │         └──────┬──────┘         │
          │                │                │
          │    takedown    │   clinch entry  │  break
          │         ┌──────▼──────┐         │
          │         │   CLINCH    │─────────┘
          │         └──────┬──────┘
          │                │ takedown from clinch
          │         ┌──────▼──────┐
          └─────────│   GROUND    │
                    └─────────────┘
```

**Rule transisi buat game:**
- Standing → Clinch: jika kedua fighter dekat cage, atau salah satu sengaja clinch
- Standing → Ground: takedown attempt sukses
- Clinch → Standing: break / separation
- Clinch → Ground: takedown dari clinch (trip, hip throw)
- Ground → Standing: scramble / get-up / referee stand-up

### 1.1 Striking Distance

**Real world:**
- Reach menentukan siapa yang bisa mendaratkan pukulan duluan. Reach advantage 4"+ = signifikan.
- Footwork = ability untuk masuk & keluar tanpa kena. Fighter dengan footwork bagus bisa frustrasiin power puncher.
- Feints = pukulan palsu buat bikin lawan reaksi, buka celah.

**Cara translate ke game:**
```js
// Initiatif exchange = siapa yang ngontrol jarak
reachAdvantage = A.reach - B.reach; // dalam cm
footworkDiff = A.footwork - B.footwork;
initiative = reachAdvantage * 0.3 + footworkDiff * 0.7 + random(-15, 15);

// Siapa yang "menang" exchange ditentuin oleh:
strikingScore = A.striking * 0.6 + A.footwork * 0.3 + A.fightIQ * 0.1;
```

**Yang udah ada di kode:**
- `effAttr(f, k, sta)` — stamina mempengaruhi effective attribute. Udah bener.
- `EXCHANGES.strike` — striking exchange di standing position.
- **Belum ada:** reach stat, feint mechanics, distance control explicit.

### 1.2 Clinch

**Real world:**
- Thai plum (Muay Thai) = kontrol kepala, knee strikes brutal
- Underhooks = pegangan bawah ketiak, kontrol pinggul
- Dirty boxing = pukulan pendek dari dalam clinch
- Break = fighter bisa lepas, wasit pisahin kalo gak ada aksi

**Cara translate ke game:**
```js
// Siapa yang dominan di clinch:
clinchAdvantage = (A.strength * 0.4 + A.wrestling * 0.3 + A.striking * 0.2) 
                - (B.strength * 0.4 + B.wrestling * 0.3 + B.striking * 0.2);

// Muay Thai bonus:
if (A.archetype === "Muay Thai") clinchAdvantage += 15; // knee + elbow dari clinch

// Exit chance:
breakChance = 0.3 + (A.footwork - B.strength) * 0.02; // footwork > strength = bisa lepas
```

**Yang udah ada:** `EXCHANGES.clinch` — tapi gak ada spesifik dirty boxing / knee / elbow damage.

### 1.3 Takedown

**Real world:**
- Double leg = tackle dua kaki, blast
- Single leg = satu kaki, lebih teknis
- Trip / hip throw = dari clinch, pake momentum lawan
- Sprawl = defense utama — drop hips, tekan kepala lawan ke bawah
- Guillotine counter = jika takedown attempt ceroboh, bisa kena choke

**Cara translate ke game:**
```js
// Takedown success:
tdSuccess = (A.wrestling * 0.6 + A.strength * 0.3 + A.fightIQ * 0.1) * aggression
          - (B.wrestling * 0.5 + B.footwork * 0.3 + B.fightIQ * 0.2) * defenseStance;

// Sprawl defense modifier:
if (B.gamePlan === "Keep It Standing") defenseStance = 1.4;

// Guillotine counter (BJJ Specialist):
if (B.archetype === "BJJ Specialist" && random() < 0.08) {
  // Takedown fails, B gets submission attempt
}
```

**Yang udah ada:** `pickExchange` pilih `td` kalo wrestling > 55 atau gameplan "Take It Down". **Belum ada:** sprawl defense explicit, guillotine counter, trip dari clinch.

### 1.4 Ground Game

**Real world posisi hierarki:**
```
Back Mount (paling dominan — submission + GNP)
    ▲
  Mount (full mount — GNP dominant)
    ▲
Side Control (elbow, knee on belly, americana/kimura)
    ▲
Half Guard (top punya GNP, bottom bisa sweep)
    ▲
Full Guard (bottom punya submission threat, top punya GNP)
```

**Cara translate ke game:**
```js
const GROUND_POSITIONS = {
  guard:        { topGNP: 0.6, bottomSub: 0.4, sweep: 0.3 },
  halfGuard:    { topGNP: 0.7, bottomSub: 0.3, sweep: 0.2 },
  sideControl:  { topGNP: 0.85, bottomSub: 0.15, sweep: 0.1 },
  mount:        { topGNP: 0.95, bottomSub: 0.05, sweep: 0.05 },
  backMount:    { topGNP: 0.5, topSub: 0.5, bottomEscape: 0.1 },
};

// Advance position:
positionAdvance = (A.bjj * 0.5 + A.wrestling * 0.3 + A.strength * 0.2)
                - (B.bjj * 0.5 + B.wrestling * 0.3 + B.strength * 0.2);
```

**Yang udah ada:** `EXCHANGES.gnp`, `EXCHANGES.sub`, `EXCHANGES.scramble`. Tapi posisi cuma `groundA`/`groundB` — **belum ada hierarchy posisi** (guard → mount → back mount).

### 1.5 Submission

**Real world chain:**
- Single sub attempt sering gagal. Chain submission = transisi dari satu sub ke sub lain (kimura → sweep → mount → armbar)
- RNC (rear naked choke) = paling high-percentage, dari back mount
- Guillotine = counter takedown
- Triangle dari guard = klasik BJJ
- Escape kunci: posture up, stack, hand fight

**Cara translate ke game — submission mini-game:**
```js
// Submission as a progressive system (bukan binary succeed/fail)
subProgress = 0; // starts at 0, needs to reach threshold
subThreshold = 80;

// Each exchange adds progress based on:
subAdvance = (A.bjj * 0.7 + A.strength * 0.2 + positionBonus)
           - (B.bjj * 0.5 + B.strength * 0.3 + B.fightIQ * 0.2);

subProgress += subAdvance;

if (subProgress >= subThreshold) {
  finish = { by: "A", how: "Submission" };
} else if (random() < 0.15) {
  // Defender escapes, position resets
  position = "guard";
  subProgress = 0;
}

// Position bonus for submission:
positionBonus = { backMount: 25, mount: 15, sideControl: 10, guard: 5 };
```

**Yang udah ada:** `EXCHANGES.sub` — tapi cuma single roll, gak ada chain/progressive system.

---

## 2. Archetypes & Matchup Matrix

### 2.1 Definisi Archetypes

| Archetype | Signature Stats | Win Condition | Hard Counter |
|---|---|---|---|
| **Boxer** | Striking 1.3, Footwork 1.2 | Jaga jarak, outpoint, body work | Wrestler (dibawa ke ground) |
| **Muay Thai** | Striking 1.35, Strength 1.1 | Clinch damage, low kicks | BJJ (ditarik ke guard) |
| **Wrestler** | Wrestling 1.35, Strength 1.2 | Takedown → top control → GNP | BJJ (submission dari bottom) |
| **BJJ** | BJJ 1.4, Wrestling 1.05 | Pull guard, sweep → submit | Boxer (gak bisa takedown) |
| **All-Rounder** | FightIQ 1.15 | Adaptif, exploit weakness | Master of one di spesialisasinya |
| **Sambo** ⚠️ | Wrestling 1.15, Striking 1.1, BJJ 1.1 | Balance, leg locks, throws | — |
| **Kickboxer** ⚠️ | Striking 1.25, Footwork 1.15 | Range, volume, leg kicks | Clinch specialist |
| **Brawler** ⚠️ | Chin 1.3, Strength 1.2, Striking 1.1 | Power, chaos, durability | Teknis outpoint |

⚠️ = belum diimplementasi di `ARCHETYPES` data.js

### 2.2 Matchup Matrix (Game Mechanic)

Ini yang paling penting buat game balance:

| | vs Boxer | vs Muay Thai | vs Wrestler | vs BJJ | vs All-Rounder |
|---|---|---|---|---|---|
| **Boxer** | 50/50 | +10% (range) | **-25%** (takedown) | +15% (td defense) | -5% |
| **Muay Thai** | -10% (range) | 50/50 | +10% (clinch) | **-20%** (guard pull) | 0% |
| **Wrestler** | **+25%** (td) | -10% (clinch) | 50/50 | +10% (top control) | +5% |
| **BJJ** | -15% (td def) | **+20%** (pull guard) | -10% (top pressure) | 50/50 | +5% |
| **All-Rounder** | +5% | 0% | -5% | -5% | 50/50 |

**Cara implementasi di kode:**
```js
// Di simRound, tambahin matchup modifier:
const MATCHUP = {
  Boxer_vs_Wrestler: { takedownDefenseBonus: -0.15, standupBonus: 0.1 },
  Wrestler_vs_BJJ: { GNPBonus: 0.1, submissionRisk: 0.15 },
  BJJ_vs_MuayThai: { guardPullBonus: 0.15, clinchVulnerability: -0.1 },
  // ...dst
};
```

### 2.3 Win Condition by Archetype

```js
function archetypeWinPath(fighter, opponent) {
  switch(fighter.archetype) {
    case "Boxer":
      return {
        idealRange: "standing",
        preferredExchange: "strike",
        avoidPosition: "groundA",
        finishPath: "Decision > KO (accumulation)",
        dangerZone: "takedown attempt by opponent"
      };
    case "Wrestler":
      return {
        idealRange: "groundA",
        preferredExchange: "gnp",
        setupRequired: "takedown first",
        finishPath: "GNP TKO > Decision (control)",
        dangerZone: "submission from guard"
      };
    // ...dst
  }
}
```

---

## 3. Momentum & Narrative Engine

### 3.1 Faktor Momentum

```js
// Momentum system (udah ada di kode sebagai `mom`)
function updateMomentum(prevMomentum, exchangeResult, round, crowdFactor) {
  let delta = 0;
  
  // 1. Exchange outcome
  if (exchangeResult.winner === "A") delta += 8;
  else if (exchangeResult.winner === "B") delta -= 8;
  
  // 2. Damage impact
  if (exchangeResult.knockdown) delta += (exchangeResult.knockdown === "A" ? 25 : -25);
  if (exchangeResult.cut || exchangeResult.swelling) delta += (exchangeResult.target === "B" ? 5 : -5);
  
  // 3. Takedown / position change
  if (exchangeResult.takedown) delta += 10;
  if (exchangeResult.sweep) delta += 15;
  if (exchangeResult.submissionAttempt) delta += 12;
  
  // 4. Stamina-based momentum (R3 vs R1)
  if (round >= 3) delta *= 1.2; // late rounds momentum swings lebih impactful
  
  // 5. Corner advice
  if (exchangeResult.cornerBoost) delta *= 1.3;
  
  return clamp(prevMomentum + delta, -100, 100);
}
```

### 3.2 Narrative Event Triggers

```js
// Event yang bikin fight seru — semua harus ada trigger di game
const NARRATIVE_EVENTS = {
  // COMEBACK: fighter kalah score 2 ronde pertama, lalu finish di ronde 3
  comebackFinish: {
    condition: (state) => state.roundScores[0] < 0 && state.roundScores[1] < 0 && state.finish && state.finish.by === "A",
    commentary: "INCREDIBLE COMEBACK! Down 2 rounds, finishes it in the 3rd!",
    legacyBonus: 300,
    repBonus: 5,
  },
  
  // FLASH KO: finish di menit pertama ronde 1
  flashKO: {
    condition: (state) => state.finish && state.finish.how === "KO/TKO" && state.round === 1 && state.roundTime < 60,
    commentary: "LIGHTNING FAST! It's over in under a minute!",
    legacyBonus: 500,
    moraleBoost: 20,
  },
  
  // LAST SECOND FINISH: finish di 10 detik terakhir ronde
  lastSecondFinish: {
    condition: (state) => state.finish && state.roundTime > 290,
    commentary: "WITH SECONDS LEFT! Unbelievable finish at the buzzer!",
    legacyBonus: 200,
  },
  
  // ROCKED BUT SURVIVED: knockdown tapi bangkit dan menang
  rockedAndWon: {
    condition: (state) => state.knockdown && state.knockdown.target === "A" && state.winner === "A",
    commentary: "HE'S HURT BUT HE WON'T QUIT! What a warrior!",
    moraleBoost: 15,
  },
  
  // DOMINATION: 3 ronde mutlak, 30-27 di semua scorecard
  domination: {
    condition: (state) => state.decision && state.scores.every(s => s.A === 30 && s.B === 27),
    commentary: "ABSOLUTE DOMINATION! A shutout on all scorecards!",
    repBonus: 3,
  },
  
  // WAR: kedua fighter HP di bawah 40%
  war: {
    condition: (state) => state.HPA < 40 && state.HPB < 40 && !state.finish,
    commentary: "This is a WAR! Both fighters leaving everything in the cage!",
    popularityBoost: 10,
  },
};
```

### 3.3 Round-by-Round Narrative

```js
// Generate fight storytelling
function generateFightStory(fightState) {
  const story = [];
  
  // Pre-round setup
  story.push({
    round: 1,
    setup: `${fighterA.name} looks to establish range early. ${fighterB.name} circling.`,
  });
  
  // Round 1 narrative
  if (fightState.rounds[0].dominantFighter === "A") {
    story.push({ event: "Clear round for A. Lands the cleaner shots, controls the center." });
  }
  
  // Between rounds
  story.push({
    corner: "Coach tells A: 'He's breaking! Keep the pressure.'",
  });
  
  // Round 2 — adjustment
  if (fightState.rounds[1].dominantFighter === "B" && fightState.rounds[0].dominantFighter === "A") {
    story.push({ event: "ADJUSTMENT! B came out with a different gameplan in round 2." });
  }
  
  return story;
}
```

---

## 4. Finish Mechanics

### 4.1 KO vs TKO — Bedanya di Game

| | KO (Knockout) | TKO (Technical Knockout) |
|---|---|---|
| **Definisi** | Fighter kehilangan kesadaran | Wasit / dokter stop karena fighter gak bisa defend diri |
| **Game Trigger** | `chinHP <= 0` dari satu pukulan | Akumulasi damage, HP < 15% selama N detik |
| **Commentary** | "HE'S OUT COLD!" | "The referee has seen enough!" |
| **Recovery** | Morale -20 | Morale -10 |
| **KO Power Bonus** | `strength * 0.4 + striking * 0.3` | N/A (accumulation) |

```js
function checkKO(attacker, defender, damage, isPowerShot) {
  const chin = effAttr(defender, "chin", defenderStamina);
  const power = effAttr(attacker, "strength", attackerStamina) * 0.4
              + effAttr(attacker, "striking", attackerStamina) * 0.3;
  
  // Flash KO chance (single shot)
  if (isPowerShot && damage > 30) {
    const flashKOChance = (power - chin) * 0.03;
    if (random() < flashKOChance) return { type: "KO", how: "KO/TKO", dramatic: "flash" };
  }
  
  // TKO from accumulation
  if (defender.currentHP < 15 && defender.consecutiveHits > 5) {
    return { type: "TKO", how: "KO/TKO", dramatic: "accumulation" };
  }
  
  // Doctor stoppage (cut)
  if (defender.cutSeverity > 8) {
    return { type: "TKO", how: "Doctor Stoppage", dramatic: "cut" };
  }
  
  return null;
}
```

### 4.2 Submission — Tap vs Sleep

```js
function checkSubmission(attacker, defender, positionBonus) {
  const subSkill = effAttr(attacker, "bjj", attackerStamina) * 0.8
                 + effAttr(attacker, "strength", attackerStamina) * 0.2;
  const defense = effAttr(defender, "bjj", defenderStamina) * 0.7
                + effAttr(defender, "fightIQ", defenderStamina) * 0.3;
  
  const subScore = subSkill + positionBonus - defense;
  
  // Tap out (conscious submission)
  if (subScore > 40 && random() < 0.8) {
    return { type: "Submission", method: "Tap", dramatic: "technical" };
  }
  
  // Sleep (RNC / choke — defender refuses to tap)
  if (subScore > 50 && position === "backMount" && random() < 0.3) {
    return { type: "Submission", method: "Technical Submission", dramatic: "sleep" };
  }
  
  return null;
}
```

### 4.3 Decision Types

```js
function calculateDecision(scores) {
  // scores = [{ A: 10, B: 9 }, { A: 9, B: 10 }, { A: 10, B: 9 }]
  const judgeScore = (rounds) => rounds.reduce((a, r) => a + r.A - r.B, 0);
  
  const judgeResults = scores.map(s => {
    if (s.A > s.B) return "A";
    if (s.B > s.A) return "B";
    return "draw";
  });
  
  const aCards = judgeResults.filter(j => j === "A").length;
  const bCards = judgeResults.filter(j => j === "B").length;
  
  if (aCards === 3) return "Unanimous Decision";
  if (aCards === 2 && bCards === 1) return "Split Decision";
  if (aCards === 2 && judgeResults.includes("draw")) return "Majority Decision";
  // Controversial: 2 judges berbeda 1 poin
  if (aCards === 2 && bCards === 1 && Math.abs(judgeRoundDiff) <= 2) {
    return "Controversial Split Decision";
  }
}
```

---

## 5. Reference Fights & Design Lessons

### Fight #1: Lawler vs MacDonald 2 (UFC 189)
**Kenapa ikonik:** Puncak dari "violence as art." Dua fighter saling hancurin di ronde 4 dan 5 — bibir pecah, hidung patah, gak ada yang mundur.

**Game design lesson:**
- **Staredown mechanic** — mereka saling tatap di tengah ronde 4, darah di mana-mana. Di game: staredown bisa trigger "War Mode" — kedua fighter dapat damage boost tapi defense turun.
- **Comeback from near-finish** — MacDonald hampir finish Lawler di ronde 3. Di game: trigger `rockedAndWon` narrative event.
- **Chin stat matters** — Lawler's recovery ability = high chin + high cardio. Dua stat yang kerja sama.

### Fight #2: Diaz vs McGregor 1 (UFC 196)
**Kenapa ikonik:** McGregor dominan ronde 1 — striking clinic. Diaz absorbs, gak quit. Ronde 2: Diaz lands, McGregor panik, shoots takedown → Diaz guillotine. McGregor taps.

**Game design lesson:**
- **Momentum swing** — ronde 1 total domination → ronde 2 complete reversal. Di game: momentum harus bisa swing drastis berdasarkan damage accumulation.
- **Submission from scramble** — bukan dari kontrol total, tapi dari chaos. Di game: submission chance harus bisa trigger dari posisi scramble.
- **Mental game** — McGregor's fight IQ turun saat panik. Di game: FightIQ stat harus dipengaruhi stamina + damage.

### Fight #3: Silva vs Sonnen 1 (UFC 117)
**Kenapa ikonik:** Sonnen wrestle-fucks Silva selama 4.5 ronde. 23 menit dominasi. 2 menit terakhir: Silva triangle choke dari guard. Sonnen taps.

**Game design lesson:**
- **Last-minute submission** — `lastSecondFinish` trigger. Di game: submission chance harus meningkat di late rounds karena fatigue.
- **Domination → reversal** — 50-43 di scorecards sebelum finish. Di game: harus bisa generate "robbery reversal" narrative.
- **Guard is dangerous** — BJJ dari bottom guard bisa finish kapan aja, walau kalah posisi.

### Fight #4: Holloway vs Kattar (UFC Fight Night)
**Kenapa ikonik:** Volume striking record. Holloway lands 445 significant strikes. Di ronde 4 dia lihat ke commentary table dan ngomong "I'm the best boxer in the UFC!" sambil terus mukul Kattar.

**Game design lesson:**
- **Volume vs power** — bukan KO, tapi akumulasi. Di game: damage accumulation system harus reward consistent output, bukan cuma big shots.
- **Showmanship** — Holloway showboat mid-fight. Di game: trigger narrative event "Showboat moment" — popularity boost, risiko counter.
- **Corner should stop it** — Kattar's corner seharusnya throw towel. Di game: corner AI bisa stop fight kalo damage terlalu parah.

### Fight #5: Rodriguez vs Korean Zombie (UFC Fight Night)
**Kenapa ikonik:** Fight setara 4 ronde. Detik terakhir ronde 5 — Zombie maju agresif, Rodriguez ngalihin dengan elbow dari posisi mundur. KO literal di 4:59 ronde terakhir. Comeback paling dramatis di sejarah.

**Game design lesson:**
- **Buzzer beater mechanic** — `lastSecondFinish` dengan waktu < 10 detik. Di game: damage modifier +50% di 30 detik terakhir kalo fighter aggressive.
- **Over-aggression punished** — Zombie's mistake = too aggressive in final seconds. Di game: aggression stat harus ada downside — buka pertahanan.
- **Narrative perfection** — gak ada skrip yang bisa nulis ini. Di game: randomness + timing = momen gak terduga yang bikin game replayable.

### Fight #6: Gaethje vs Johnson (UFC Fight Night)
**Kenapa ikonik:** Dua brawler tulen. Gak ada grappling. Cuma pukulan brutal selama 2 ronde. Gaethje wins by KO.

**Game design lesson:**
- **Brawler archetype** — high power, high chin, low technique. Di game: brawler matchups harus jadi slugfest — high damage, low accuracy, banyak knockdown.
- **Short fight, big impact** — 2 ronde tapi fight of the year. Di game: fight rating bukan soal durasi.

### Fight #7: Fedor vs Cro Cop (Pride)
**Kenapa ikonik:** Dua legenda striking di prime. Fedor — smaller, faster, masuk ke range Cro Cop dan batalin left high kick. Menang decision dominant.

**Game design lesson:**
- **Game plan execution** — Fedor's plan = nullify Cro Cop's weapon. Di game: specific game plan > general stats.
- **Range management** — smaller fighter bisa negate range advantage dengan footwork. Di game: footwork harus bisa override reach.
- **Legends fight different** — pressure dari legacy on the line. Di game: title/legacy fights harus ada modifier tension.

---

## 6. Implementasi Prioritas

### Already in code ✅
- State machine: standing / clinch / ground
- Exchange system: strike, power, td, gnp, sub, scramble, clinch
- Stamina affects all attrs via `effAttr()`
- Momentum tracker
- Tick-by-tick + summary + skip viewing modes
- Knockdown, doctor stoppage
- Game plans, corner advice
- 5 archetypes (Boxer, Muay Thai, Wrestler, BJJ, All-Rounder)
- 13 traits (Iron Will, Glass Jaw, Explosive, etc.)

### High priority 🔴
1. **Ground position hierarchy** — guard → half → side → mount → back. Ganti `position: "groundA"` jadi specific position.
2. **Submission progressive system** — bukan binary roll, tapi progress bar. Bikin chain submission possible.
3. **Narrative events** — comeback, flash KO, last-second finish, war detection. Trigger legacy/morale/rep bonuses.
4. **Matchup matrix** — archetype advantage/disadvantage modifier. Bikin rock-paper-scissors terasa.

### Medium priority 🟡
5. **Reach stat** — tambahin ke fighter attrs, pengaruhi striking initiative.
6. **Brawler + Kickboxer archetypes** — nambahin ke `ARCHETYPES` di data.js.
7. **Fight rating system** — skor 1-5 stars berdasarkan drama, momentum swings, finish quality.
8. **Body/Leg damage visible effects** — low kick = footwork debuff, body shot = stamina drain (udah ada di kode? check `bodyDmg` + `legDmg`)

### Low priority 🟢
9. **Corner throws towel** — kalo damage terlalu parah.
10. **Crowd/home advantage** — modifier di fight yang home region.
11. **Fight of the Night bonus** — legacy/money reward untuk exciting fights.
