# ⚖️ MMA Manager — Game Balance Audit

> **Date:** 2026-07-10  
> **Scope:** All progression systems — training, economy, injuries, scaling, long-term balance  
> **Method:** Traced every multiplier, cost, income, probability, and scaling curve

---

## 1. FIGHTER PROGRESSION SPEED

### 1.1 Training Gain Formula

```
gain = R(0.5, 1.4) × intensity × age × overtraining × trait
     × morale × cap × chemistry × coach × facility × mentor
     × sparring × relationship × attention
```

**11 multipliers.** At optimal conditions (young, Hard intensity, high morale, matching coach, chemistry 80+, low overtraining, Natural Talent):

| Multiplier | Optimal Value | Cumulative |
|-----------|--------------|------------|
| Base RNG | 0.5-1.4 | ~0.95 avg |
| Intensity (Hard) | 1.4 | 1.33 |
| Age (≤21) | 1.3 | 1.73 |
| Overtraining (<25) | 1.0 | 1.73 |
| Natural Talent | 1.15 | 1.99 |
| Morale (≥75) | 1.1 | 2.19 |
| Cap (<70%) | 1.0 | 2.19 |
| Chemistry (≥80) | 1.15 | 2.52 |
| Coach (skill 7 × 0.03) | 1.21 | 3.05 |
| Facility (level 3) | 1.12 | 3.42 |
| Mentor (max) | 1.03 | 3.52 |
| Sparring (best) | 1.15 | 4.05 |
| Relationship | 1.1 | 4.46 |
| Attention | 1.0 | 4.46 |

**Peak gain:** ~4.5 points/week per attribute. At 2 attributes per training program, ~9 points/week total.

**Typical gain (mid-game):** ~1.5-2.5 points/week with Medium intensity, no Natural Talent, moderate chemistry.

**From 50 → 85 (35 points):** ~14-23 weeks at mid-game speed, ~8 weeks at peak.

**From 85 → 95 (10 points, near ceiling):** Cap multiplier drops to 0.3 → ~15-30 weeks.

### 1.2 Ceiling Reach Time

Fighter starts at ~48 average. Ceiling typically 70-80.

| Phase | Points | Weekly Gain | Weeks |
|-------|--------|-------------|-------|
| 48 → 60 (fast) | 12 | 2.5 | 5 |
| 60 → 70 (medium) | 10 | 1.8 | 6 |
| 70 → 75 (slow) | 5 | 1.0 | 5 |
| 75 → 80 (cap) | 5 | 0.5 | 10 |
| **Total to ceiling** | 32 | — | **~26 weeks** |

**Verdict:** Fighters reach their ceiling in ~6 months of game time (26 weeks). This is **fast** — a fighter recruited at age 20 peaks by age 20.5. The remaining 15+ years of their career are spent at or near ceiling.

---

## 2. TRAINING BALANCE

### 2.1 Program Viability

| Program | Cost | Attributes | Value Rating |
|---------|------|-----------|-------------|
| Sparring | $800 | 3 (FightIQ, Striking, Wrestling) | ⭐⭐⭐⭐⭐ Best ROI |
| Fight Camp | $1000 | 4 (FightIQ, Cardio, Striking, Wrestling) | ⭐⭐⭐⭐ Forced when booked |
| Striking | $500 | 2 (Striking, Footwork) | ⭐⭐⭐ Solid |
| Grappling | $500 | 2 (Wrestling, BJJ) | ⭐⭐⭐ Solid |
| S&C | $300 | 2 (Strength, Cardio) | ⭐⭐⭐ Cheap |
| Recovery | $100 | 0 (heals OT, boosts morale) | ⭐⭐ Situational |

**Sparring dominates.** It hits 3 attributes including the most important (FightIQ). Fight Camp is better but only available when booked.

### 2.2 Intensity Risk/Reward

| Intensity | Multiplier | Injury/Week | OT/Week | Break-even |
|-----------|-----------|-------------|---------|------------|
| Light | 0.6 | 0.5% | +4 | Safe, slow |
| Medium | 1.0 | 2% | +9 | Baseline |
| Hard | 1.4 | 8% | +16 | Fast, risky |

**Hard is optimal early, Medium is optimal late.** Early fighters should push Hard while young and healthy. Near ceiling, the cap multiplier already limits gains, making Hard's extra risk not worth it.

**Injury expectation at Hard:** 8% per week → one injury every ~12.5 weeks. Over 26 weeks to ceiling: ~2 injuries expected.

---

## 3. ECONOMY PROGRESSION

### 3.1 Income Sources

| Source | Formula | Early Game | Late Game |
|--------|---------|------------|-----------|
| Fight purses | Tier-based RI ranges | $3K-12K (Regional) | $300K-1M (Premier) |
| Sponsors | $150-400 base + royalty | $400-800/mo | $1,500-3,000/mo (with bonuses) |
| Popularity income | roster × popularity × 150 | $200-500/mo | $2,000-5,000/mo |
| Training fees | weeklyFee × 4 per fighter | $800-1,200/mo | $400-600/mo |
| Rep bonus | rep × 500 | $4K/mo | $37.5K/mo |
| Open gym | REMOVED | — | — |

### 3.2 Expense Sources

| Source | Formula | Early Game | Late Game |
|--------|---------|------------|-----------|
| Coach salaries | skill × $1,600-2,400 | $3-5K/mo | $20-40K/mo |
| Training costs | program cost × 4 weeks × fighters | $2-6K/mo | $10-20K/mo |
| Facility maintenance | 5% of facility asset value | $1.5K/mo | $15-25K/mo |
| Medical costs | injury cost per week | $0-2K/mo | $0-10K/mo |

### 3.3 Net Monthly Progression

| Phase | Income | Expenses | Net | Cash |
|-------|--------|----------|-----|------|
| Start (week 1) | $0 | $0 | $0 | $35,000 |
| Early (week 10) | $5-8K | $4-6K | +$1-2K | $45-55K |
| Mid (week 50) | $20-40K | $12-20K | +$8-20K | $100-300K |
| Late (week 100) | $80-200K | $30-60K | +$50-140K | $500K+ |
| Endgame (week 200+) | $200-500K | $50-100K | +$150-400K | $1M+ |

**Cash becomes irrelevant around week 100.** After $500K, the player can afford everything. All financial tension dissolves.

---

## 4. SPONSOR ECONOMY

### 4.1 Sponsor Value

| Brand | Placement/Mo | Royalty/Mo (base) | Rep Req |
|-------|-------------|-------------------|---------|
| FightFist Gear | $200 | $120 + win bonus | 10 |
| Bloodline Wear | $150 | $90 + win bonus | 20 |
| Titan Nutrition | $300 | $180 + popularity | 15 |
| PureFuel Labs | $250 | $150 + popularity | 25 |
| HypeTracker Pro | $400 | $240 + both | 30 |
| ArenaVision | $350 | $210 + main card | 40 |

**Total at 3 sponsors (late game):** ~$750-1,200 base monthly. With performance bonuses: $1,500-3,000/mo.

**Sponsor income is ~5-10% of late-game income.** Fight purses dominate. Sponsors are meaningful early but become cosmetic late.

### 4.2 Sponsor Progression

Relationship levels add +5% rate per level (24 weeks each), max +25% at Legendary. This adds ~$50-100/mo per sponsor at max level — negligible compared to fight purse scaling.

---

## 5. COACH ECONOMY

### 5.1 Coach Costs vs Value

| Skill | Salary/Mo | Training Bonus |
|-------|-----------|---------------|
| 1 | $1,600-2,400 | +3% |
| 3 | $4,800-7,200 | +9% |
| 5 | $8,000-12,000 | +15% |
| 7 | $11,200-16,800 | +21% |
| 10 | $16,000-24,000 | +30% |

**Coach ROI is excellent.** A skill-7 coach costs ~$14K/mo but gives +21% training to all matching fighters. With 3-5 fighters, that's compound value.

**Coaches are always worth hiring up to capacity.** The training bonus compounds over every fighter, every week.

---

## 6. FACILITY PROGRESSION

| Facility | Cost/Level | Training Bonus/Level | Break-even |
|----------|-----------|---------------------|------------|
| Mats | lvl × ($15K + tier×$10K) | +6% wrestling/bjj | ~10 weeks of training |
| Ring | same | +6% striking/footwork | ~10 weeks |
| Weights | same | +6% strength/cardio | ~10 weeks |
| Medical | same | -5% injury cost/risk | Harder to quantify |

**Facilities are the best long-term investment.** The +6% per level applies to ALL fighters, forever. A level-3 facility gives +12% to all training in that category.

**Medical is mandatory first.** Injury reduction compounds: fewer injuries → more training → better fighters → more wins → more money.

---

## 7. INJURY FREQUENCY

### 7.1 Base Injury Probabilities

| Intensity | Weekly Chance | Expected Injuries/Year |
|-----------|--------------|----------------------|
| Light | 0.5% | 0.26 |
| Medium | 2% | 1.04 |
| Hard | 8% | 4.16 |

Plus modifiers: Cautious trait (-15%), Disciplinarian coach (-15%), Medical facility (-5%/level), Injury Prone trait (×2).

### 7.2 Injury Severity Distribution

| Tier | Weeks | Cost | Probability | Career Impact |
|------|-------|------|-------------|---------------|
| Minor | 1-2 | $0.5-2K | 50% | None |
| Moderate | 3-6 | $2-8K | 30% | Minor delay |
| Serious | 8-16 | $8-20K | 15% | +1 serious injury counter |
| Career-Threat | 20-36 | $15-40K | 5% | Permanent attr -3 to -8 |

**At 4+ serious injuries:** auto-gain "Injury Prone" (×2 injury risk). **This is the most punitive system in the game.** A single unlucky streak can permanently cripple a fighter.

---

## 8. POPULARITY GROWTH

| Source | Gain |
|--------|------|
| Fight win | +7 (or +3 for decision) |
| Crowd Favorite trait | ×2 |
| Showboat finish | +5 bonus |
| Viral event (exploit) | +8 |
| Star Power ambition | +50% |

**Popularity decay:** -0.5/week when not fighting or injured.

**From 0 → 100:** ~15 wins (with no decay) or ~8 wins with Crowd Favorite. At 1 fight per 12 weeks (typical schedule), this takes ~180 weeks (3.5 years).

**Popularity is slow to build and fast to lose.** A 20-week injury drops popularity by 10 points. Recovery takes 2-3 wins.

---

## 9. REPUTATION GROWTH

| Source | Gain |
|--------|------|
| Fight win (tier bonus) | Local +1, Regional +2, National +4, Major +7 |
| Retirement honor | +3 |
| Title win | +20 (Major), +30 (Premier), +50 (Double Champ) |

**Reputation loss:** -3 per loss, -5 for title stripping.

**From 8 → 75 (World-Class):** ~10 Major fight wins or 3 title wins with normal fight income. At 3-4 fights/year, this takes ~3 years.

**Reputation gates the entire progression system.** You cannot upgrade camp tier, get better sponsors, or access higher-tier fights without reputation. It's the primary progression limiter.

---

## 10. CONTRACT ECONOMY

### 10.1 Manager Cut

| Agent | Cut Floor | Impact |
|-------|-----------|--------|
| None | 15% | Cheapest |
| Budget | 16% | Slight premium |
| Standard | 18% | Default |
| Power | 20% | Expensive |

**Cut difference is small.** The 5% gap between None and Power agents is ~$5K per $100K purse. At late game purses ($300K+), this matters but doesn't break anything.

### 10.2 Contract Duration vs Fight Commitment

Duration in months × 4 weeks. Fights typically every 8-12 weeks. A 24-month contract with 4 fights means the fighter is locked for 96 weeks regardless of fight count — the contract expires by duration first.

**Fight commitment is rarely the binding constraint.** Duration almost always expires first.

---

## 11. FIGHT PURSE SCALING

| Tier | Show Range | Rep Required | Wins Required |
|------|-----------|-------------|---------------|
| Local | $800-3K | 0 | 0 |
| Regional | $3-12K | 20 | 2 |
| National | $12-60K | 40 | 4 |
| Major | $60-200K | 60 | 6 |
| Premier | $300-600K | 80 | 8 |
| Major Title | $150-300K | — | Champion |
| Premier Title | $250-1M | — | Champion + rep 80+ |

**Purse scaling is exponential.** Local → Premier is a 200× increase. This makes late-game cash abundant.

---

## 12. AI SCALING

| Context | AI Fighter Level | Approximate Skill |
|---------|-----------------|-------------------|
| Division champion | 1.4 | ~84 |
| Title contender | 1.45 | ~87 |
| Ranked opponent | 0.5-1.5 (from division) | 30-90 |
| AI prospects | 0.5-0.85 | 30-51 |

**AI does not scale with player progression.** The division champion is always generated at the same level regardless of how good the player's fighters become. After the player's fighters reach 85+ attributes, AI opponents are permanently outclassed.

---

## 13. PHASE-BY-PHASE BALANCE

### Early Game (Weeks 1-30)

**Resources:** $35K starting cash, 2 fighters, 1 coach  
**Challenges:** Cash tight, roster small, no reputation  
**Viable:** Local/Regional fights, budget scouts, Medium training  
**Overpowered:** Sparring training (hits 3 attributes)  
**Underpowered:** Recovery training (too early to need it)  

**Balance: Good.** Scarcity creates meaningful decisions.

### Mid Game (Weeks 30-100)

**Resources:** $50-200K cash, 4-8 fighters, 2-3 coaches  
**Challenges:** Reputation gates tier upgrades, contract management  
**Viable:** National/Major fights, National scouts, Hard training  
**Overpowered:** Facilities (compound training bonus), coaches (same)  
**Underpowered:** Sponsors (income dwarfed by fight purses)  

**Balance: Good but shifting.** Training optimization dominates. Cash becomes less constrained.

### Late Game (Weeks 100-200)

**Resources:** $500K+ cash, 8-14 fighters, 4-5 coaches, tier 4  
**Challenges:** None — all systems maxed or abundant  
**Viable:** Everything  
**Overpowered:** Cash (infinite), training (fighters at ceiling)  
**Underpowered:** Popularity decay (annoying, not threatening), sponsors (cosmetic)  

**Balance: Broken.** All scarcity disappears. Player has infinite resources. Only challenge is managing retirement/replacement.

### 20+ Years (Weeks 960+)

**Resources:** Infinite cash, multiple fighter generations  
**Challenges:** None — pure sandbox  
**Viable:** Anything  
**Balance: N/A.** The game is effectively in creative mode.

---

## 14. BALANCE SUMMARY

### Overpowered Systems

| System | Why |
|--------|-----|
| **Sparring training** | 3 attributes for $800 — best ROI by far |
| **Facilities** | Permanent, compound, applies to all fighters |
| **Coaches** | Compound training bonus over entire roster |
| **Late-game cash** | Fight purses outscale all expenses |

### Underpowered Systems

| System | Why |
|--------|-----|
| **Sponsors** | ~5-10% of income even at max — cosmetic |
| **Popularity** | Slow build, fast decay, minimal financial impact |
| **Recovery training** | Only useful when overtraining is high |
| **Light intensity** | Too slow — never optimal |

### Resources That Become Irrelevant

| Resource | When | Why |
|----------|------|-----|
| Cash | Week 100 | Infinite |
| Training costs | Week 50 | Dwarfed by purses |
| Roster slots | Tier 3+ | 10-14 slots, rarely full |
| Coach market | Tier 3+ | Always has good options |
| Medical costs | Week 50 | Insignificant vs purses |

### Systems That Dominate

| System | Dominance |
|--------|-----------|
| **Reputation** | Gates EVERYTHING — tiers, sponsors, fight quality |
| **Training** | Core loop — everything feeds into it |
| **Fight purses** | 80%+ of all income |

### Progression Bottlenecks

| Bottleneck | Severity | Duration |
|-----------|----------|----------|
| Reputation 0→15 | Medium | ~10-15 weeks |
| Reputation 15→35 | Medium | ~20-30 weeks |
| Reputation 35→55 | Low | ~15-20 weeks |
| Reputation 55→75 | Low | ~15-20 weeks |
| Cash $0→$25K (first upgrade) | High | ~10-15 weeks |
| Cash $25K→$60K | Medium | ~20 weeks |
| Cash $60K→$120K | Low | ~15 weeks |
| Cash $120K→$250K | None | ~10 weeks |
| First title shot | Medium | ~30-50 weeks |

**The only real bottleneck is the first 30 weeks.** After that, the compound effects of training, facilities, and coaches create an accelerating curve that nothing in the game can resist.
